import * as mint from 'mint-server';
import { createReport, runCommand } from '../admin/index.js';
import { ANIMATIONS, playByIndex, stopAnimation } from '../animations/index.js';
import { writeCrash } from '../core/log.js';
import { getSession } from '../player/session.js';
import { relayStream } from '../news/index.js';
import { muted } from '../voice/index.js';

const RANGES: Record<number, number> = { 0: 10, 1: 25, 3: 15, 4: 15, 5: 15, 6: 15 };

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

function say(player: mint.Player, tag: number, text: string): void {
  const name = String(getSession(player).character?.name ?? 'Незнакомец');
  const id = player.id;
  let line = '';
  if (tag === 1) line = `!{#ffdfa8}${name}[${id}] кричит: ${text}`;
  else if (tag === 3) line = `!{#c6c695}(( ${name}[${id}]: ${text} ))`;
  else if (tag === 4) line = `!{#dd90ff}${name}[${id}] ${text}`;
  else if (tag === 5) line = `!{#82dbff}${text} (( ${name}[${id}] ))`;
  else if (tag === 6) line = `!{#ddff82}${name}[${id}] ${text} (${Math.random() < 0.5 ? 'удачно' : 'неудачно'})`;
  else line = `!{#ffffff}${name}[${id}] говорит: ${text}`;
  for (const other of nearby(player, RANGES[tag] ?? 10)) mint.emitClient(other, 'crp:chat', line);
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
    if (text.startsWith('/')) {
      const parts = text.trim().split(/\s+/);
      void runCommand(player, parts[0], parts.slice(1));
      return;
    }
    if (text === '/anim') {
      mint.emitClient(player, 'crp:chat', '!{#ffdf29}/anim номер, /stopanim');
      for (let index = 0; index < ANIMATIONS.length; index += 1) {
        mint.emitClient(player, 'crp:chat', `!{#ffffff}${index} — ${ANIMATIONS[index].title}`);
      }
      return;
    }
    if (text.startsWith('/anim ')) {
      const index = Number(text.slice(6));
      if (!playByIndex(player, index)) mint.emitClient(player, 'crp:chat', '!{#ff6666}Нет такой анимации');
      return;
    }
    if (text === '/stopanim') {
      stopAnimation(player);
      return;
    }
    const kind = typeof tag === 'number' ? tag : 0;
    try {
      if (text.startsWith('/me ')) return say(player, 4, text.slice(4));
      if (text.startsWith('/do ')) return say(player, 5, text.slice(4));
      if (text.startsWith('/try ')) return say(player, 6, text.slice(5));
      if (text.startsWith('/b ')) return say(player, 3, text.slice(3));
      if (text.startsWith('/s ')) {
        say(player, 1, text.slice(3));
        relayStream(player, text.slice(3));
        return;
      }
      say(player, kind, text);
      relayStream(player, text);
    } catch (err) {
      writeCrash('chat.send', err);
    }
  });
}
