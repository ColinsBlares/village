import * as mint from 'mint-server';
import { factionKind } from '../factions/index.js';
import { giveItem, takeItem } from '../inventory/index.js';
import { getSession } from '../player/session.js';
import { notifyError, notifySuccess } from '../ui/notify.js';
import { vehicleById, vehicleState } from '../vehicles/index.js';

function nameOf(player: mint.Player): string {
  return String(getSession(player).character?.name ?? player.name);
}

export function installFib(): void {
  mint.onClient('crp:fib:spy', async (player, raw) => {
    const header = 'Прослушка FIB';
    if (factionKind(Number(getSession(player).character?.factionId) || 0) !== 'fib') return notifyError(player, 'Вы не агент', header);
    const data = typeof raw === 'string' ? JSON.parse(raw) as { recId?: number } : {};
    const target = mint.Player.getByID(Number(data.recId));
    if (!target?.valid || !getSession(target).character) return notifyError(player, 'Гражданин не найден', header);
    if (player.pos.distanceTo(target.pos) > 3) return notifyError(player, `${nameOf(target)} далеко`, header);
    if (target.getSyncedMeta('crp:spy') == null) {
      const item = await takeItem(player, [4]);
      if (!item) return notifyError(player, 'Жучок не найден', header);
      const agentId = Number(getSession(player).character?.id) || 0;
      target.setSyncedMeta('crp:spy', `${player.id}:${agentId}`);
      notifySuccess(player, `Прослушка на ${nameOf(target)} установлена`, header);
      return;
    }
    target.deleteSyncedMeta('crp:spy');
    await giveItem(player, 4);
    notifySuccess(player, `Прослушка с ${nameOf(target)} снята`, header);
  });

  mint.onClient('crp:fib:plate', (player, raw) => {
    const header = 'Смена номера';
    if (factionKind(Number(getSession(player).character?.factionId) || 0) !== 'fib') return notifyError(player, 'Вы не агент', header);
    const data = JSON.parse(String(raw ?? '{}')) as { vehId?: number; plate?: string };
    const plate = String(data.plate ?? '').trim().slice(0, 8);
    if (!plate) return notifyError(player, 'Введите номер', header);
    const vehicle = vehicleById(data.vehId);
    const state = vehicle ? vehicleState(vehicle) : undefined;
    if (!vehicle || !state) return notifyError(player, 'Авто не найдено', header);
    if (state.key !== 'faction' || state.owner !== 4) return notifyError(player, 'Авто не принадлежит FIB', header);
    if (player.pos.distanceTo(vehicle.pos) > 3) return notifyError(player, 'Авто далеко', header);
    vehicle.numberPlateText = plate;
    notifySuccess(player, `Номер изменен на ${plate}`, header);
  });
}
