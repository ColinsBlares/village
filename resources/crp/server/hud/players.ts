import * as mint from 'mint-server';
import { factionName } from '../factions/index.js';
import { getSession } from '../player/session.js';
import { cef } from '../ui/send.js';

interface Listed {
  id: number;
  name: string;
  ping: number;
  faction: string;
}

function admin(player: mint.Player): boolean {
  return (Number(getSession(player).character?.admin) || 0) > 0;
}

function listed(player: mint.Player): Listed | null {
  const character = getSession(player).character;
  if (!player.valid || !character) return null;
  return {
    id: player.id,
    name: String(character.name ?? ''),
    ping: player.ping,
    faction: factionName(player),
  };
}

function admins(except?: mint.Player): mint.Player[] {
  const list: mint.Player[] = [];
  for (const player of mint.Player.all) {
    if (!player.valid || player === except || !admin(player)) continue;
    list.push(player);
  }
  return list;
}

function online(except?: mint.Player): number {
  let count = 0;
  for (const player of mint.Player.all) {
    if (player.valid && player !== except) count += 1;
  }
  return count;
}

function roster(): Listed[] {
  const list: Listed[] = [];
  for (const player of mint.Player.all) {
    const row = listed(player);
    if (row) list.push(row);
  }
  return list;
}

export function pushOnline(except?: mint.Player): void {
  const code = `mp.event.call('hud.setData', ${JSON.stringify({ players: online(except) })});`;
  for (const player of mint.Player.all) {
    if (!player.valid || player === except || !getSession(player).character) continue;
    cef(player, code);
  }
}

export function loadPlayerList(player: mint.Player): void {
  if (!admin(player)) return;
  cef(player, `mp.event.call('players.load', ${JSON.stringify(roster())});`);
}

export function announcePlayer(player: mint.Player): void {
  const row = listed(player);
  if (!row) return;
  const code = `mp.event.call('players.add', ${JSON.stringify(row)});`;
  for (const current of admins(player)) cef(current, code);
}

export function syncPlayerFaction(player: mint.Player): void {
  if (!listed(player)) return;
  const code = `mp.event.call('players.update', ${player.id}, ${JSON.stringify({ faction: factionName(player) })});`;
  for (const current of admins()) cef(current, code);
}

export function installPlayerList(): void {
  mint.onClient('crp:players:list', (player) => {
    if (!admin(player)) return;
    player.emit('crp:players:show');
  });
  mint.on('playerDisconnect', (player) => {
    if (getSession(player).character) {
      const code = `mp.event.call('players.remove', ${player.id});`;
      for (const current of admins(player)) cef(current, code);
    }
    pushOnline(player);
  });
}
