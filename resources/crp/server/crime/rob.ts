import * as mint from 'mint-server';
import { inPeace } from '../anticheat/index.js';
import { playAnimation, stopAnimation } from '../animations/index.js';
import { factionKind, rankNumber } from '../factions/index.js';
import { giveItem } from '../inventory/index.js';
import { getSession } from '../player/session.js';
import { notifyError, notifySuccess, notifyWarning } from '../ui/notify.js';
import { addCash, removeCash } from '../world/money.js';
import { vehicleById, vehicleState } from '../vehicles/index.js';

const WAIT = 60 * 60 * 1000;
const robberAt = new Map<number, number>();
const victimAt = new Map<number, number>();

function nameOf(player: mint.Player): string {
  return String(getSession(player).character?.name ?? player.name);
}

function criminal(player: mint.Player): boolean {
  const kind = factionKind(Number(getSession(player).character?.factionId) || 0);
  return kind === 'bands' || kind === 'mafia';
}

function waitLeft(map: Map<number, number>, id: number): number {
  const at = map.get(id) ?? 0;
  return Math.max(0, WAIT - (Date.now() - at));
}

export function installRobbery(): void {
  mint.onClient('crp:crime:rob', async (player, rawId) => {
    const header = 'Ограбление';
    if (!criminal(player)) return notifyError(player, 'Вы не член банды/мафии', header);
    if (rankNumber(player) < 8) return notifyError(player, 'Доступно с ранга 8', header);
    if (inPeace(player)) return notifyError(player, 'Недоступно в мирной зоне', header);
    const mine = Number(getSession(player).character?.id) || 0;
    const left = waitLeft(robberAt, mine);
    if (left > 0) return notifyError(player, `Повторное ограбление доступно через ${Math.trunc(left / 1000)} сек.`, header);
    const target = mint.Player.getByID(Number(rawId));
    const other = target ? getSession(target).character : null;
    if (!target?.valid || !other) return notifyError(player, 'Игрок не найден', header);
    if (player.pos.distanceTo(target.pos) > 10) return notifyError(player, 'Игрок далеко', header);
    if (criminal(target)) return notifyError(player, 'Нельзя ограбить члена банды/мафии', header);
    const victimLeft = waitLeft(victimAt, Number(other.id));
    if (victimLeft > 0) return notifyError(player, `Ограбить игрока можно через ${Math.trunc(victimLeft / 1000)} сек.`, header);
    const price = Math.max(0, Math.min(500, Math.trunc((Number(other.cash) || 0) * 0.01)));
    if (!price) return notifyError(player, 'Игрок нищий', header);
    if (!(await removeCash(target, price))) return notifyError(player, 'Ошибка передачи денег', header);
    if (!(await addCash(player, price))) return;
    robberAt.set(mine, Date.now());
    victimAt.set(Number(other.id), Date.now());
    notifySuccess(player, 'Вы ограбили игрока', header);
    notifyWarning(target, 'Вас ограбили', header);
  });

  mint.onClient('crp:crime:vehrob', (player, rawId) => {
    const header = 'Ограбление';
    if (factionKind(Number(getSession(player).character?.factionId) || 0) !== 'bands') return notifyError(player, 'Вы не член банды', header);
    if (rankNumber(player) < 8) return notifyError(player, 'Доступно с ранга 8', header);
    if (inPeace(player)) return notifyError(player, 'Недоступно в мирной зоне', header);
    const vehicle = vehicleById(rawId);
    const state = vehicle ? vehicleState(vehicle) : undefined;
    if (!vehicle || !state) return notifyError(player, 'Авто не найдено', header);
    if (player.pos.distanceTo(vehicle.pos) > 8) return notifyError(player, 'Авто далеко', header);
    if (state.key !== 'faction' || (state.owner !== 2 && state.owner !== 3)) return notifyError(player, 'Авто нельзя ограбить', header);
    if (vehicle.getStreamSyncedMeta('robbed') === true) return notifyError(player, 'Авто уже ограблено', header);
    playAnimation(player, 'amb@prop_human_bum_bin@base', 'base', 1);
    const actorId = player.id;
    setTimeout(() => {
      const actor = mint.Player.getByID(actorId);
      if (!actor?.valid || !vehicle.valid) return;
      stopAnimation(actor);
      if (actor.pos.distanceTo(vehicle.pos) > 8) return notifyError(actor, 'Авто далеко', header);
      if (vehicle.getStreamSyncedMeta('robbed') === true) return;
      const gender = Number(getSession(actor).character?.gender) ? 0 : 1;
      void giveItem(actor, 3, { variation: 12, texture: 1, health: 100, pockets: '[3,3,3,3,3,3,3,3,10,5,3,5,10,3,3,3]', sex: gender });
      vehicle.setStreamSyncedMeta('robbed', true);
      notifySuccess(actor, 'Вы ограбили авто', header);
    }, 2000);
  });
}
