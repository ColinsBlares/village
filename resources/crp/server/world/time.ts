import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { factionInfo } from '../factions/index.js';
import { taxFarms } from '../farms/index.js';
import { payJob } from '../jobs/index.js';
import type { DbRow } from '../player/session.js';
import { getSession } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifyWarning } from '../ui/notify.js';
import { bandPower } from '../war/index.js';
import { addCash } from './money.js';

const marks = new WeakMap<mint.Player, number>();
let lastPayHour = new Date().getHours();
let timer: ReturnType<typeof setInterval> | null = null;

function asHour(value: number): mint.DateTimeHour {
  return Math.max(0, Math.min(23, value)) as mint.DateTimeHour;
}

function asMinute(value: number): mint.DateTimeMinute {
  return Math.max(0, Math.min(59, value)) as mint.DateTimeMinute;
}

function asDay(value: number): mint.DateTimeDay {
  return Math.max(0, Math.min(30, value)) as mint.DateTimeDay;
}

function asMonth(value: number): mint.DateTimeMonth {
  return Math.max(0, Math.min(11, value)) as mint.DateTimeMonth;
}

export function touchClock(player: mint.Player): void {
  marks.set(player, Date.now());
  syncClock(player, new Date());
}

export function takeMinutes(player: mint.Player): number {
  const from = marks.get(player) ?? 0;
  marks.set(player, Date.now());
  if (!from) return 0;
  return Math.max(0, Math.floor((Date.now() - from) / 60000));
}

function syncClock(player: mint.Player, date: Date): void {
  if (!player.valid || !player.isSpawned) return;
  player.setDateTime(
    asDay(date.getDate()),
    asMonth(date.getMonth()),
    date.getFullYear(),
    asHour(date.getHours()),
    asMinute(date.getMinutes()),
    asMinute(date.getSeconds()),
  );
}

function playedMinutes(player: mint.Player): number {
  const from = marks.get(player) ?? 0;
  if (!from) return 0;
  return Math.max(0, Math.floor((Date.now() - from) / 60000));
}

function afk(player: mint.Player): boolean {
  return player.getStreamSyncedMeta('crp:afk') === true;
}

async function payFaction(player: mint.Player, minutes: number, cash: Map<number, number>): Promise<void> {
  const character = getSession(player).character;
  const id = Number(character?.factionId) || 0;
  const faction = factionInfo(id);
  if (!character || !faction) return;
  const rank = faction.ranks.find((row) => row.id === Number(character.factionRank));
  let pay = Number(rank?.pay) || 0;
  if (minutes < 15) return notifyWarning(player, 'Зарплата не получена из-за низкой активности', faction.name);
  if (id >= 12 && id <= 14) {
    if (!cash.has(id)) {
      const row = (await table('Faction').findOne({ where: { id } })) as DbRow | null;
      cash.set(id, Number(row?.cash) || 0);
    }
    if ((cash.get(id) ?? 0) < pay) return notifyError(player, 'В общаке недостаточно средств для получения зарплаты', faction.name);
  } else if (id >= 8 && id <= 11) pay += Math.trunc(100 * bandPower(id));
  if (!pay) return;
  if (!(await addCash(player, pay))) return;
  notifyInfo(player, 'Получена зарплата', faction.name);
}

async function payDay(): Promise<void> {
  const cash = new Map<number, number>();
  for (const player of mint.Player.all) {
    const character = getSession(player).character;
    if (!character || !player.valid || afk(player)) continue;
    await payFaction(player, playedMinutes(player), cash);
    await payJob(player);
  }
  await taxFarms();
  for (const player of mint.Player.all) {
    const character = getSession(player).character;
    if (!character || !player.valid) continue;
    if (afk(player)) {
      notifyError(player, 'PayDay не засчитан', 'ANTI-AFK');
      continue;
    }
    const minutes = takeMinutes(player);
    notifyInfo(player, `Вы отыграли ${minutes} минут`, 'PayDay');
    character.minutes = (Number(character.minutes) || 0) + minutes;
    character.law = (Number(character.law) || 0) + 1;
    void character.save();
    cef(player, `if (typeof playerMenu !== 'undefined') playerMenu.setLaw(${Number(character.law) || 0});`);
  }
}

export function startWorldTime(): void {
  if (timer) return;
  timer = setInterval(() => {
    const date = new Date();
    for (const player of mint.Player.all) {
      if (getSession(player).character) syncClock(player, date);
    }
    if (date.getMinutes() <= 3 && date.getHours() !== lastPayHour) {
      lastPayHour = date.getHours();
      void payDay();
    }
  }, 60000);
}
