import * as mint from 'mint-server';
import { writeCrash } from '../core/log.js';
import { getSession } from '../player/session.js';
import { notifyError } from '../ui/notify.js';

const proximity = new mint.VoiceChannel(true, 15);
const radios = new Map<string, mint.VoiceChannel>();
const members = new Map<string, Set<number>>();
const talking = new WeakMap<mint.Player, string>();
const callLines = new Map<string, mint.VoiceChannel>();
const silenced = new Map<number, number>();

interface Group {
  kind: 'job' | 'faction';
  id: number;
}

export function silence(player: mint.Player, until: number): void {
  silenced.set(player.id, until);
  try {
    if (proximity.isPlayerInChannel(player)) proximity.mutePlayer(player);
  } catch {
    // Канал ещё не выдан.
  }
}

export function muted(player: mint.Player): boolean {
  const until = silenced.get(player.id) ?? 0;
  if (until > Date.now()) return true;
  silenced.delete(player.id);
  return false;
}

function callKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function linkCall(left: mint.Player, right: mint.Player): void {
  const key = callKey(left.id, right.id);
  let channel = callLines.get(key);
  if (!channel) {
    channel = new mint.VoiceChannel(false, 0);
    callLines.set(key, channel);
  }
  if (!channel.isPlayerInChannel(left)) channel.addPlayer(left);
  if (!channel.isPlayerInChannel(right)) channel.addPlayer(right);
  channel.unmutePlayer(left);
  channel.unmutePlayer(right);
}

export function unlinkCall(player: mint.Player): void {
  if (!player?.valid) return;
  for (const [key, channel] of callLines) {
    if (!channel.isPlayerInChannel(player)) continue;
    channel.mutePlayer(player);
    channel.removePlayer(player);
    if (channel.playerCount === 0) callLines.delete(key);
  }
}

function groupOf(player: mint.Player): Group | null {
  const character = getSession(player).character;
  if (!character) return null;
  const job = Number(character.job) || 0;
  if (job) return { kind: 'job', id: job };
  const faction = Number(character.factionId) || 0;
  if (faction) return { kind: 'faction', id: faction };
  return null;
}

function groupKey(group: Group): string {
  return `${group.kind}:${group.id}`;
}

function radioOf(key: string): mint.VoiceChannel {
  let channel = radios.get(key);
  if (!channel) {
    channel = new mint.VoiceChannel(false, 0);
    radios.set(key, channel);
  }
  return channel;
}

function sameGroup(player: mint.Player, group: Group): boolean {
  const current = groupOf(player);
  return !!current && current.kind === group.kind && current.id === group.id;
}

function tune(player: mint.Player, group: Group): mint.VoiceChannel {
  const key = groupKey(group);
  const radio = radioOf(key);
  const known = members.get(key) ?? new Set<number>();
  for (const [otherKey, other] of radios) {
    if (otherKey === key || !player.valid || !other.isPlayerInChannel(player)) continue;
    other.mutePlayer(player);
    other.removePlayer(player);
    members.get(otherKey)?.delete(player.id);
  }
  for (const id of known) {
    if (id === player.id) continue;
    let member: mint.Player | null = null;
    try {
      member = mint.Player.getByID(id);
    } catch {
      member = null;
    }
    if (member?.valid && sameGroup(member, group)) continue;
    if (member?.valid && radio.isPlayerInChannel(member)) {
      radio.mutePlayer(member);
      radio.removePlayer(member);
    }
    known.delete(id);
  }
  for (const member of mint.Player.all) {
    if (!member.valid || !sameGroup(member, group)) continue;
    if (!radio.isPlayerInChannel(member)) radio.addPlayer(member);
    if (talking.get(member) !== key) radio.mutePlayer(member);
    known.add(member.id);
  }
  members.set(key, known);
  return radio;
}

function hear(player: mint.Player, key: string, on: boolean): void {
  const ids = members.get(key);
  if (!ids) return;
  for (const id of ids) {
    if (id === player.id) continue;
    let member: mint.Player | null = null;
    try {
      member = mint.Player.getByID(id);
    } catch {
      member = null;
    }
    if (member?.valid) member.emit(on ? 'crp:voice:hear' : 'crp:voice:silence', player.id);
  }
}

export function joinVoice(player: mint.Player): void {
  if (!getSession(player).character) return;
  try {
    if (!proximity.isPlayerInChannel(player)) proximity.addPlayer(player);
    proximity.mutePlayer(player);
  } catch (err) {
    writeCrash('voice.join', err);
  }
}

export function installVoice(): void {
  mint.onClient('crp:voice:talk', (player, enabled) => {
    if (!player?.valid || !proximity.isPlayerInChannel(player) || muted(player)) return;
    if (enabled) proximity.unmutePlayer(player);
    else proximity.mutePlayer(player);
  });

  mint.onClient('crp:voice:radio', (player, enabled) => {
    if (!player?.valid) return;
    if (!enabled) {
      const key = talking.get(player);
      talking.delete(player);
      const radio = key ? radios.get(key) : undefined;
      if (key && radio?.isPlayerInChannel(player)) radio.mutePlayer(player);
      if (key) hear(player, key, false);
      return;
    }
    if (muted(player)) {
      player.emit('crp:voice:denied');
      return;
    }
    const group = groupOf(player);
    if (!group) {
      notifyError(player, 'Нет рации', 'Рация');
      player.emit('crp:voice:denied');
      return;
    }
    const key = groupKey(group);
    const radio = tune(player, group);
    radio.unmutePlayer(player);
    talking.set(player, key);
    hear(player, key, true);
  });

  mint.on('playerDisconnect', (player) => {
    const id = player.id;
    talking.delete(player);
    try {
      if (player.valid && proximity.isPlayerInChannel(player)) proximity.removePlayer(player);
      for (const [key, radio] of radios) {
        members.get(key)?.delete(id);
        if (player.valid && radio.isPlayerInChannel(player)) {
          radio.mutePlayer(player);
          radio.removePlayer(player);
        }
      }
      unlinkCall(player);
    } catch (err) {
      writeCrash('voice.leave', err);
    }
  });
}
