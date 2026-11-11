import * as mint from 'mint-server';
import { createReport, runCommand } from '../admin/index.js';
import { ANIMATIONS, playByIndex, stopAnimation } from '../animations/index.js';
import { offerDice } from '../casino/index.js';
import { table } from '../core/db.js';
import { writeCrash } from '../core/log.js';
import { factionKind, isFactionLeader, isStateFaction, rankName } from '../factions/index.js';
import { syncFamily } from '../family/control.js';
import { jobName } from '../jobs/index.js';
import { inStream, relayStream } from '../news/index.js';
import { getSession } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyWarning } from '../ui/notify.js';
import { vehicleState } from '../vehicles/index.js';
import { muted } from '../voice/index.js';
import { handleMusic } from '../vehicles/music.js';

const RANGES: Record<number, number> = { 0: 10, 1: 20, 3: 10, 4: 10, 5: 10, 6: 10 };

function nearby(player: mint.Player, range: number): mint.Player[] {
  const list: mint.Player[] = [];
  for (const other of mint.Player.all) {
    if (!other.valid || other.dimension !== player.dimension) continue;
    if (!getSession(other).character) continue;
    const dx = other.pos.x - player.pos.x;
    const dy = other.pos.y - player.pos.y;
    const dz = other.pos.z - player.pos.z;
    if (dx * dx + dy * dy + dz * dz <= range * range) list.push(other);
  }
  return list;
}

function agentOf(listener: mint.Player): mint.Player | null {
  const raw = listener.getSyncedMeta('crp:spy');
  if (raw == null || raw === '') return null;
  const [idText, characterText] = String(raw).split(':');
  let agent: mint.Player | null = null;
  try {
    agent = mint.Player.getByID(Number(idText));
  } catch {
    agent = null;
  }
  const character = agent?.valid ? getSession(agent).character : null;
  if (!agent?.valid || !character || Number(character.id) !== Number(characterText)) {
    listener.deleteSyncedMeta('crp:spy');
    return null;
  }
  return agent;
}

function wiretap(listener: mint.Player, speaker: mint.Player, tag: number, text: string): void {
  const agent = agentOf(listener);
  if (!agent) return;
  const dist = Math.trunc((tag === 1 ? speaker.pos : agent.pos).distanceTo(listener.pos));
  const name = String(getSession(speaker).character?.name ?? 'Незнакомец');
  const verb = tag === 1 ? 'кричит' : 'говорит';
  const color = tag === 1 ? '!{#ffdfa8}' : '!{#ffffff}';
  let heard = `${text} (${dist} м.)`;
  if (dist > 100) {
    heard = '* сигнал потерян *';
    listener.deleteSyncedMeta('crp:spy');
  } else if (dist > 50) heard = '* пшшшшшшш пшшшш пшшшш *';
  send(agent, `${color}${name}[${speaker.id}] ${verb}: ${heard}`);
}

function say(player: mint.Player, tag: number, text: string): void {
  const name = String(getSession(player).character?.name ?? 'Незнакомец');
  const id = player.id;
  let line = '';
  if (tag === 1) line = `!{#ffdfa8}${name}[${id}] кричит: ${text}`;
  else if (tag === 3) line = `!{#c6c695}[OOC] ${name}[${id}]: ${text}`;
  else if (tag === 4) line = `!{#dd90ff}${name}[${id}] ${text}`;
  else if (tag === 5) line = `!{#dd90ff}${text} (${name}[${id}])`;
  else if (tag === 6) line = `!{#dd90ff}${name}[${id}] ${text} ${Math.random() < 0.5 ? '!{#66cc00} [Удачно]' : '!{#ff6600} [Неудачно]'}`;
  else line = `!{#ffffff}${name}[${id}] говорит: ${text}`;
  for (const other of nearby(player, RANGES[tag] ?? 10)) {
    if ((tag === 0 || tag === 1) && inStream(player) && other.id === player.id) continue;
    mint.emitClient(other, 'crp:chat', line);
    if (tag === 0 || tag === 1) wiretap(other, player, tag, text);
  }
}

function send(player: mint.Player, line: string): void {
  if (player.valid) mint.emitClient(player, 'crp:chat', line);
}

function factionRadio(player: mint.Player, text: string): void {
  const character = getSession(player).character;
  const factionId = Number(character?.factionId) || 0;
  if (!factionId) return notifyError(player, 'Вы не состоите в организации', 'Рация');
  const name = String(character?.name ?? player.name);
  const line = `!{#33cc66}[R] ${rankName(player)} ${name}[${player.id}]: ${text}`;
  for (const other of mint.Player.all) {
    if (Number(getSession(other).character?.factionId) === factionId) send(other, line);
  }
}

function jobRadio(player: mint.Player, text: string): void {
  const job = Number(getSession(player).character?.job) || 0;
  if (!job) return;
  const name = String(getSession(player).character?.name ?? player.name);
  const line = `!{#40f5ec}[R] ${jobName(player)} ${name}[${player.id}]: ${text}`;
  for (const other of mint.Player.all) {
    if (Number(getSession(other).character?.job) === job) send(other, line);
  }
}

function radio(player: mint.Player, text: string): void {
  if (Number(getSession(player).character?.job)) jobRadio(player, text);
  else factionRadio(player, text);
}

function department(player: mint.Player, text: string): void {
  const character = getSession(player).character;
  const factionId = Number(character?.factionId) || 0;
  if (!character || !isStateFaction(factionId)) return;
  const line = `!{#59b3cf}[D] ${rankName(player)} ${character.name}[${player.id}]: ${text}`;
  for (const other of mint.Player.all) {
    if (isStateFaction(Number(getSession(other).character?.factionId) || 0)) send(other, line);
  }
}

function megaphone(player: mint.Player, text: string): void {
  const character = getSession(player).character;
  const factionId = Number(character?.factionId) || 0;
  const kind = factionKind(factionId);
  if (!character || (kind !== 'police' && kind !== 'fib' && kind !== 'army')) return;
  const vehicle = player.vehicle;
  const state = vehicle ? vehicleState(vehicle) : undefined;
  if (!vehicle || state?.key !== 'faction' || state.owner !== factionId) return notifyError(player, 'Вы не в служебном транспорте');
  const line = `!{#ffcd45}[Мегафон] ${character.name}[${player.id}]: ${text}`;
  for (const other of nearby(player, 15)) send(other, line);
}

async function familyChat(player: mint.Player, text: string): Promise<void> {
  const character = getSession(player).character;
  const familyId = Number(character?.familyId) || 0;
  if (!familyId) return notifyError(player, 'Вы не состоите в семье', 'Семья');
  const family = (await table('Family').findOne({ where: { id: familyId } })) as { tag?: string } | null;
  if (!family) return;
  const line = `!{#d98fff}[Семья][${family.tag ?? ''}] ${character?.name}[${player.id}]: ${text}`;
  for (const other of mint.Player.all) {
    if (Number(getSession(other).character?.familyId) === familyId) send(other, line);
  }
}

export function installChat(): void {
  mint.onClient('crp:chat:send', (player, tag, message) => {
    if (!player?.valid || !getSession(player).character) return;
    if (typeof message !== 'string') return;
    const text = message.replace(/[<>]/g, '').trim().slice(0, 100);
    if (!text) return;
    if (muted(player)) {
      mint.emitClient(player, 'crp:chat', '!{#ff6666}Текстовый чат заблокирован');
      return;
    }
    if (text.startsWith('/report ')) {
      void createReport(player, text.slice(8));
      return;
    }
    try {
      if (text === ')' ) return say(player, 4, 'улыбается');
      if (text === '))') return say(player, 4, 'смеется');
      if (text === '(') return say(player, 4, 'расстроился');
      if (text === '((') return say(player, 4, 'сильно расстроился');
      if (text.startsWith('/me ')) return say(player, 4, text.slice(4));
      if (text.startsWith('/do ')) return say(player, 5, text.slice(4));
      if (text.startsWith('/try ')) return say(player, 6, text.slice(5));
      if (text.startsWith('/b ') || text.startsWith('/n ')) return say(player, 3, text.slice(3));
      if (text.startsWith('/s ')) {
        say(player, 1, text.slice(3));
        relayStream(player, text.slice(3));
        return;
      }
      if (text.startsWith('/r ')) return radio(player, text.slice(3));
      if (text.startsWith('/f ')) {
        const factionId = Number(getSession(player).character?.factionId) || 0;
        if (isStateFaction(factionId) || !isFactionLeader(player)) return department(player, text.slice(3));
        return factionRadio(player, text.slice(3));
      }
      if (text.startsWith('/d ')) return department(player, text.slice(3));
      if (text.startsWith('/fam ')) return void familyChat(player, text.slice(5));
      if (text === '/fc') {
        if (!Number(getSession(player).character?.familyId)) return notifyError(player, 'Вы не состоите в семье', 'Семья');
        void syncFamily(player).then(() => cef(player, `selectMenu.showByName('familyControl');`));
        return;
      }
      if (text.startsWith('/gnews ')) {
        const factionId = Number(getSession(player).character?.factionId) || 0;
        if (!isStateFaction(factionId) || !isFactionLeader(player)) return;
        const name = String(getSession(player).character?.name ?? player.name);
        const line = `!{#498fff}[Гос. новости] ${name}[${player.id}]: ${text.slice(7)}`;
        for (const other of mint.Player.all) if (getSession(other).character) send(other, line);
        return;
      }
      if (text.startsWith('/m ')) return megaphone(player, text.slice(3));
      if (text.startsWith('/dice ')) {
        const parts = text.slice(6).trim().split(/\s+/);
        const targetId = Number(parts[0]);
        const amount = Math.trunc(Number(parts[1]));
        if (!Number.isInteger(targetId) || !Number.isInteger(amount) || amount <= 0) return notifyWarning(player, 'Используйте /dice [id] [сумма]');
        return offerDice(player, targetId, amount);
      }
      if (text === '/music' || text.startsWith('/music ')) return handleMusic(player, text.slice(6).trim());
      if (text === '/anim') {
        mint.emitClient(player, 'crp:chat', '!{#ffdf29}/anim номер, /stopanim');
        for (let index = 0; index < ANIMATIONS.length; index += 1) {
          mint.emitClient(player, 'crp:chat', `!{#ffffff}${index} — ${ANIMATIONS[index].title}`);
        }
        return;
      }
      if (/^\/anim\s+\d+$/.test(text)) {
        const index = Number(text.slice(6));
        if (!playByIndex(player, index)) mint.emitClient(player, 'crp:chat', '!{#ff6666}Нет такой анимации');
        return;
      }
      if (text === '/stopanim') {
        stopAnimation(player);
        return;
      }
      if (text.startsWith('/')) {
        const parts = text.trim().split(/\s+/);
        void runCommand(player, parts[0], parts.slice(1));
        return;
      }
      const kind = typeof tag === 'number' ? tag : 0;
      if (kind === 2) return radio(player, text);
      if (kind === 1) {
        say(player, 1, text);
        relayStream(player, text);
        return;
      }
      say(player, kind, text);
      if (kind === 0) relayStream(player, text);
    } catch (err) {
      writeCrash('chat.send', err);
    }
  });
}
