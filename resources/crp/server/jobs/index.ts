import * as mint from 'mint-server';
import { table } from '../core/db.js';
import type { DbRow } from '../player/session.js';
import { getSession } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess } from '../ui/notify.js';
import { addCash } from '../world/money.js';
import { signalQuest } from '../quests/index.js';

const jobs = new Map<number, DbRow>();
const skills = new Map<number, DbRow[]>();
const jobClearHooks = new Set<(player: mint.Player) => void>();

export function onJobClear(hook: (player: mint.Player) => void): void {
  jobClearHooks.add(hook);
}

export async function loadJobs(): Promise<number> {
  const rows = (await table('Job').findAll()) as DbRow[];
  for (const row of rows) jobs.set(Number(row.id), row);
  return jobs.size;
}

export function jobName(player: mint.Player): string {
  const id = Number(getSession(player).character?.job) || 0;
  return String(jobs.get(id)?.name ?? '');
}

export function syncJobMenu(player: mint.Player): void {
  cef(player, `if (typeof playerMenu !== 'undefined') playerMenu.setJob(${JSON.stringify({ jobName: jobName(player) })});`);
}

function pushSkills(player: mint.Player, rows: DbRow[]): void {
  const payload = {
    skills: rows.map((row) => ({
      jobId: Number(row.jobId),
      name: String(jobs.get(Number(row.jobId))?.name ?? ''),
      exp: Number(row.exp) || 0,
    })),
  };
  cef(player, `if (typeof playerMenu !== 'undefined') playerMenu.setSkills(${JSON.stringify(payload.skills)});`);
}

function pushSkill(player: mint.Player, row: DbRow): void {
  cef(player, `if (typeof playerMenu !== 'undefined') playerMenu.setSkill(${JSON.stringify({
    jobId: Number(row.jobId),
    exp: Number(row.exp) || 0,
  })});`);
}

export async function initJobSkills(player: mint.Player): Promise<void> {
  const character = getSession(player).character;
  if (!character) return;
  const id = Number(character.id);
  const existing = (await table('JobSkill').findAll({ where: { characterId: id } })) as DbRow[];
  const byJob = new Map(existing.map((row) => [Number(row.jobId), row]));
  for (const job of jobs.values()) {
    const jobId = Number(job.id);
    if (byJob.has(jobId)) continue;
    const created = (await table('JobSkill').create({ characterId: id, jobId, exp: 0 })) as DbRow;
    byJob.set(jobId, created);
  }
  const rows = [...byJob.values()];
  skills.set(id, rows);
  pushSkills(player, rows);
}

export async function addJobExp(player: mint.Player, exp = 1, jobId = 0): Promise<void> {
  const character = getSession(player).character;
  const id = jobId || Number(character?.job) || 0;
  if (!character || !id) return;
  const characterId = Number(character.id);
  let rows = skills.get(characterId);
  if (!rows) {
    await initJobSkills(player);
    rows = skills.get(characterId);
  }
  const skill = rows?.find((row) => Number(row.jobId) === id);
  if (!skill) return;
  skill.exp = Math.min(100, Math.max(0, (Number(skill.exp) || 0) + exp));
  await skill.save();
  pushSkill(player, skill);
}

export function assignJob(player: mint.Player, jobId: number, header = 'Устройство на работу'): boolean {
  const character = getSession(player).character;
  const job = jobs.get(jobId);
  if (!character || !job) {
    notifyError(player, `Работа #${jobId} не найдена`, header);
    return false;
  }
  if (character.factionId) {
    notifyError(player, 'Вы состоите в организации', header);
    return false;
  }
  if (Number(character.job) === jobId) {
    notifyError(player, `Вы уже ${job.name}`, header);
    return false;
  }
  if (Number(character.job) === 2) cef(player, `mp.event.call('phone.app.remove', 'taxi');`);
  character.job = job.id;
  void character.save();
  if (jobId === 2) cef(player, `mp.event.call('phone.app.add', 'taxi', null);`);
  notifySuccess(player, 'Вы устроились на работу', String(job.name));
  syncJobMenu(player);
  void signalQuest(player, 'job.changed');
  return true;
}

export function clearJob(player: mint.Player, header = 'Увольнение с работы'): boolean {
  const character = getSession(player).character;
  if (!character?.job) {
    notifyError(player, 'Вы не работаете', header);
    return false;
  }
  const job = jobs.get(Number(character.job));
  for (const hook of jobClearHooks) hook(player);
  if (Number(character.job) === 2) cef(player, `mp.event.call('phone.app.remove', 'taxi');`);
  character.job = null;
  void character.save();
  notifySuccess(player, 'Вы уволились с работы', String(job?.name ?? 'Работа'));
  syncJobMenu(player);
  void signalQuest(player, 'job.changed');
  return true;
}

export function installJobs(): void {
  mint.on('playerDisconnect', (player) => {
    const id = Number(getSession(player).character?.id) || 0;
    if (id) skills.delete(id);
  });
  mint.onClient('crp:job:set', (player, jobId) => {
    assignJob(player, Number(jobId) || 0);
  });
  mint.onClient('crp:job:leave', (player) => {
    clearJob(player);
  });
}

export function jobExp(player: mint.Player, jobId: number): number {
  const characterId = Number(getSession(player).character?.id) || 0;
  const row = skills.get(characterId)?.find((skill) => Number(skill.jobId) === jobId);
  return Number(row?.exp) || 0;
}

export async function payJob(player: mint.Player): Promise<void> {
  const character = getSession(player).character;
  const salary = Number(character?.pay) || 0;
  if (!character || salary <= 0) return;
  const paid = await addCash(player, salary);
  if (!paid) return;
  character.pay = 0;
  await character.save();
  notifyInfo(player, 'Получена зарплата', 'Работа');
}
