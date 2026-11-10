import * as mint from 'mint-server';
import { getSession } from '../player/session.js';
import { writeCrash } from '../core/log.js';

const proximity = new mint.VoiceChannel(true, 15);
const radios = new Map<number, mint.VoiceChannel>();
const callLines = new Map<string, mint.VoiceChannel>();
const silenced = new Map<number, number>();

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
  for (const [key, channel] of callLines) {
    if (!channel.isPlayerInChannel(player)) continue;
    channel.mutePlayer(player);
    channel.removePlayer(player);
    if (channel.playerCount === 0) callLines.delete(key);
  }
}

function factionId(player: mint.Player): number {
  return Number(getSession(player).character?.factionId) || 0;
}

function radioOf(id: number): mint.VoiceChannel {
  let channel = radios.get(id);
  if (!channel) {
    channel = new mint.VoiceChannel(false, 0);
    radios.set(id, channel);
  }
  return channel;
}

export function joinVoice(player: mint.Player): void {
  if (!getSession(player).character) return;
  try {
    if (!proximity.isPlayerInChannel(player)) proximity.addPlayer(player);
    proximity.mutePlayer(player);
    const faction = factionId(player);
    if (!faction) return;
    const radio = radioOf(faction);
    if (!radio.isPlayerInChannel(player)) radio.addPlayer(player);
    radio.mutePlayer(player);
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
    const faction = factionId(player);
    if (!faction) {
      if (enabled) mint.emitClient(player, 'crp:chat', '!{#ff6666}Нет рации');
      return;
    }
    const radio = radioOf(faction);
    if (!radio.isPlayerInChannel(player)) radio.addPlayer(player);
    if (enabled) radio.unmutePlayer(player);
    else radio.mutePlayer(player);
  });

  mint.on('playerDisconnect', (player) => {
    try {
      if (proximity.isPlayerInChannel(player)) proximity.removePlayer(player);
      const faction = factionId(player);
      const radio = faction ? radios.get(faction) : null;
      if (radio?.isPlayerInChannel(player)) radio.removePlayer(player);
      unlinkCall(player);
    } catch (err) {
      writeCrash('voice.leave', err);
    }
  });
}
