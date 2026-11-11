import * as mint from 'mint-server';
import { factionKind, rankNumber } from '../factions/index.js';
import { getSession } from '../player/session.js';
import { notifyError } from '../ui/notify.js';

let ownerId: number | null = null;
const members = new Set<number>();

function broadcast(text: string): void {
  for (const player of mint.Player.all) {
    if (player.valid) mint.emitClient(player, 'crp:chat', text);
  }
}

export function inStream(player: mint.Player): boolean {
  return ownerId != null && members.has(player.id);
}

export function relayStream(player: mint.Player, text: string): void {
  if (ownerId == null || !members.has(player.id)) return;
  const owner = mint.Player.getByID(ownerId);
  if (!owner?.valid) {
    ownerId = null;
    members.clear();
    return;
  }
  if (player.pos.distanceTo(owner.pos) > 3) return;
  const name = String(getSession(player).character?.name ?? player.name);
  broadcast(`!{#bd7aff}[WN] ${name}: ${text}`);
}

export function installNews(): void {
  mint.onClient('crp:news:stream', (player) => {
    const header = 'Lifeinvader';
    if (factionKind(Number(getSession(player).character?.factionId) || 0) !== 'news') return notifyError(player, 'Вы не редактор', header);
    if (rankNumber(player) < 8) return notifyError(player, 'Доступно с ранга 8', header);
    const name = String(getSession(player).character?.name ?? player.name);
    if (ownerId != null && ownerId !== player.id) return notifyError(player, 'Эфир занят другим редактором', header);
    if (ownerId === player.id) {
      ownerId = null;
      members.clear();
      broadcast(`!{#bd7aff}[WN] ${name} завершил прямой эфир`);
      return;
    }
    ownerId = player.id;
    members.clear();
    members.add(player.id);
    broadcast(`!{#bd7aff}[WN] ${name} начал прямой эфир`);
  });

  mint.onClient('crp:news:member', (player, rawId) => {
    if (ownerId !== player.id) return notifyError(player, 'Вы не ведете прямой эфир', 'Эфир');
    const target = mint.Player.getByID(Number(rawId));
    if (!target?.valid || !getSession(target).character) return notifyError(player, 'Игрок не найден', 'Эфир');
    if (player.pos.distanceTo(target.pos) > 10) return notifyError(player, `${target.name} далеко`, 'Эфир');
    const name = String(getSession(player).character?.name ?? player.name);
    const other = String(getSession(target).character?.name ?? target.name);
    if (members.has(target.id)) {
      members.delete(target.id);
      broadcast(`!{#bd7aff}[WN] ${name} удалил ${other} из прямого эфира`);
      return;
    }
    members.add(target.id);
    broadcast(`!{#bd7aff}[WN] ${name} добавил ${other} в прямой эфир`);
  });

  mint.on('playerDisconnect', (player) => {
    members.delete(player.id);
    if (ownerId === player.id) {
      ownerId = null;
      members.clear();
    }
  });
}
