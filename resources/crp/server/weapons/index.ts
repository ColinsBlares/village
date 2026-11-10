import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { getSession, type DbRow } from '../player/session.js';
import { allowWeapon, denyWeapon } from '../anticheat/index.js';
import { cef } from '../ui/send.js';
import { notifyError, notifySuccess } from '../ui/notify.js';
import { clearHeld, showHeld } from '../inventory/hands.js';

const AMMO: Record<number, number[]> = {
  37: [20, 44, 46, 47, 48, 80, 87, 88, 89, 90],
  38: [21, 49, 91, 93, 96],
  39: [50, 52, 107],
  40: [22, 99, 100],
};

export function ammoItemId(weaponItemId: number): number | null {
  for (const [ammo, weapons] of Object.entries(AMMO)) {
    if (weapons.includes(weaponItemId)) return Number(ammo);
  }
  return null;
}

function paramsOf(item: DbRow): Record<string, string> {
  const list = (item.params ?? item.CharacterInventoryParams ?? []) as DbRow[];
  const params: Record<string, string> = {};
  for (const param of list) params[String(param.key)] = String(param.value);
  return params;
}

async function loadItem(player: mint.Player, sqlId: number): Promise<DbRow | null> {
  const character = getSession(player).character;
  if (!character) return null;
  return (await table('CharacterInventory').findOne({
    where: { id: sqlId, playerId: character.id },
    include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
  })) as DbRow | null;
}

async function setParam(item: DbRow, key: string, value: number): Promise<void> {
  const list = (item.params ?? []) as DbRow[];
  const param = list.find((row) => row.key === key);
  if (!param) return;
  param.value = String(value);
  await param.save();
}

export function syncHands(player: mint.Player, item: DbRow, inHands: boolean): void {
  const params = paramsOf(item);
  const hash = Number(params.weaponHash);
  if (!Number.isFinite(hash) || hash <= 0) {
    if (inHands) void showHeld(player, item);
    else clearHeld(player);
    return;
  }
  clearHeld(player);
  if (inHands) {
    allowWeapon(player, hash >>> 0);
    player.giveWeapon(hash >>> 0, Number(params.ammo) || 0, true);
    return;
  }
  denyWeapon(player, hash >>> 0);
  player.removeWeapon(hash >>> 0);
}

export function installWeapons(): void {
  mint.onClient('crp:weapon:unload', async (player, sqlId, ammo) => {
    const header = 'Разрядка оружия';
    const weapon = await loadItem(player, Number(sqlId));
    const take = Math.trunc(Number(ammo));
    if (!weapon || weapon.parentId != null || Number(weapon.index) !== 13) return notifyError(player, 'Оружие должно находиться в руках', header);
    const ammoId = ammoItemId(Number(weapon.itemId));
    const params = paramsOf(weapon);
    const loaded = Number(params.ammo) || 0;
    if (!ammoId || take <= 0 || take > loaded) return notifyError(player, 'Нечего разряжать', header);
    await setParam(weapon, 'ammo', loaded - take);
    const inventory = await import('../inventory/index.js');
    const given = await inventory.giveItem(player, ammoId, { count: take });
    if (!given) {
      await setParam(weapon, 'ammo', loaded);
      return notifyError(player, 'Нет места для патронов', header);
    }
    player.setWeaponAmmo(Number(params.weaponHash) >>> 0, loaded - take);
    notifySuccess(player, 'Оружие разряжено', header);
  });
  mint.onClient('crp:weapon:load', async (player, sqlId) => {
    const header = 'Зарядка оружия';
    const weapon = await loadItem(player, Number(sqlId));
    if (!weapon) return notifyError(player, 'Оружие не найдено', header);
    const ammoId = ammoItemId(Number(weapon.itemId));
    if (!ammoId) return notifyError(player, 'Тип патронов не найден', header);
    const character = getSession(player).character;
    const ammo = character
      ? ((await table('CharacterInventory').findOne({
          where: { playerId: character.id, itemId: ammoId },
          include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
        })) as DbRow | null)
      : null;
    const count = ammo ? Number(paramsOf(ammo).count) || 0 : 0;
    if (!ammo || count < 1) return notifyError(player, 'Подходящие патроны не найдены', header);
    const weaponParams = paramsOf(weapon);
    const next = (Number(weaponParams.ammo) || 0) + count;
    await setParam(weapon, 'ammo', next);
    if (typeof ammo.destroy === 'function') await ammo.destroy();
    const inventory = await import('../inventory/index.js');
    await inventory.sendInventory(player);
    if (weapon.parentId == null && Number(weapon.index) === 13) player.setWeaponAmmo(Number(weaponParams.weaponHash) >>> 0, next);
    notifySuccess(player, 'Оружие заряжено', header);
  });
  mint.onClient('crp:item:merge', async (player, raw) => {
    const header = 'Слияние предметов';
    let data: { sqlId?: number; targetSqlId?: number };
    try {
      data = JSON.parse(String(raw ?? '{}')) as { sqlId?: number; targetSqlId?: number };
    } catch {
      return;
    }
    const ammo = await loadItem(player, Number(data.sqlId));
    const weapon = await loadItem(player, Number(data.targetSqlId));
    if (!ammo) return notifyError(player, `Предмет #${data.sqlId} не найден`, header);
    if (!weapon) return notifyError(player, `Целевой предмет #${data.targetSqlId} не найден`, header);
    const allowed = AMMO[Number(ammo.itemId)];
    if (!allowed?.includes(Number(weapon.itemId))) return notifyError(player, 'Предметы недоступны для слияния', header);
    const weaponParams = paramsOf(weapon);
    if (!weaponParams.weaponHash) return;
    const count = Number(paramsOf(ammo).count) || 0;
    if (!count) return notifyError(player, 'Патронов: 0 ед.', 'Зарядка оружия');
    const next = (Number(weaponParams.ammo) || 0) + count;
    await setParam(weapon, 'ammo', next);
    if (typeof ammo.destroy === 'function') await ammo.destroy();
    const inventory = await import('../inventory/index.js');
    await inventory.sendInventory(player);
    if (weapon.parentId == null && Number(weapon.index) === 13) {
      player.setWeaponAmmo(Number(weaponParams.weaponHash) >>> 0, next);
    }
    const ammoRow = (await table('InventoryItem').findOne({ where: { id: ammo.itemId } })) as DbRow | null;
    const weaponRow = (await table('InventoryItem').findOne({ where: { id: weapon.itemId } })) as DbRow | null;
    notifySuccess(player, `${weaponRow?.name ?? 'Оружие'} заряжен`, String(ammoRow?.name ?? 'Патроны'));
    cef(player, `mp.event.call('inventory.notifyOverhead', ${JSON.stringify(`Зарядил '${weaponRow?.name ?? 'Оружие'}'`)});`);
  });
}
