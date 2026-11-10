import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { giveItem } from '../inventory/index.js';
import { pushFines } from '../player/menu.js';
import { getSession, type DbRow } from '../player/session.js';
import { notifyError, notifySuccess } from '../ui/notify.js';
import { addCash, removeCash } from '../world/money.js';

const KEYS = 1000;

export function installGovernmentService(): void {
  mint.onClient('crp:gov:fine', async (player, raw) => {
    const header = 'Оплата штрафа';
    const character = getSession(player).character;
    if (!character) return;
    const fines = (await table('Fine').findAll({ where: { recId: character.id } })) as DbRow[];
    if (!fines.length) return notifyError(player, 'У вас нет штрафов', header);
    const index = Math.max(0, Math.min(fines.length - 1, Math.trunc(Number(raw) || 0)));
    const fine = fines[index];
    const price = Number(fine.price) || 0;
    if (!(await removeCash(player, price))) return notifyError(player, `Необходимо $${price}`, header);
    if (typeof fine.destroy === 'function') await fine.destroy();
    pushFines(player, fines.length - 1);
    notifySuccess(player, `Штраф #${fine.id} оплачен`, header);
  });

  mint.onClient('crp:gov:keys', async (player, raw) => {
    const header = 'Восстановление ключей';
    const character = getSession(player).character;
    const data = JSON.parse(String(raw ?? '{}')) as { index?: number; isDublicate?: boolean };
    if (!character) return;
    const vehicles = (await table('Vehicle').findAll({ where: { key: 'private', owner: character.id } })) as DbRow[];
    if (!vehicles.length) return notifyError(player, 'У вас нет авто', header);
    const index = Math.max(0, Math.min(vehicles.length - 1, Math.trunc(Number(data.index) || 0)));
    const vehicle = vehicles[index];
    const items = (await table('CharacterInventory').findAll({
      where: { playerId: character.id, itemId: 33 },
      include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
    })) as DbRow[];
    const owned = items.some((item) => ((item.params ?? []) as DbRow[]).some((param) => param.key === 'vehId' && Number(param.value) === Number(vehicle.id)));
    if (owned && !data.isDublicate) return notifyError(player, `Вы уже имеете ключи от ${vehicle.modelName}`, header);
    if (!(await removeCash(player, KEYS))) return notifyError(player, `Необходимо $${KEYS}`, header);
    const ok = await giveItem(player, 33, { owner: character.id, vehId: vehicle.id, vehName: vehicle.modelName });
    if (!ok) {
      await addCash(player, KEYS);
      return notifyError(player, 'Нет места для ключей', header);
    }
    notifySuccess(player, `Получены ключи от ${vehicle.modelName}`, header);
  });
}
