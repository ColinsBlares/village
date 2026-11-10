import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { houseById } from '../houses/index.js';
import { deleteEnvironmentPlace, sendEnvironmentPlace } from '../inventory/environment.js';
import { clearPlace } from '../inventory/place.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError } from '../ui/notify.js';

const WAREHOUSE_RANK = 2;

interface Holder {
  familyId: number;
  houseId: number;
  marker: mint.Marker;
  shape: mint.Colshape;
}

const holders = new Map<number, Holder>();

async function itemsOf(familyId: number): Promise<DbRow[]> {
  return (await table('FamilyInventory').findAll({
    where: { familyId },
    order: [['parentId', 'ASC']],
    include: [{ model: table('FamilyInventoryParam'), as: 'params' }],
  })) as DbRow[];
}

async function allowed(player: mint.Player, familyId: number): Promise<boolean> {
  const character = getSession(player).character;
  if (!character || Number(character.familyId) !== familyId) return false;
  const rank = (await table('FamilyRank').findOne({ where: { id: Number(character.familyRank) || 0 } })) as DbRow | null;
  return !!rank && Number(rank.rank) >= WAREHOUSE_RANK;
}

function close(player: mint.Player, familyId: number): void {
  deleteEnvironmentPlace(player, -familyId);
  clearPlace(player);
  cef(player, 'prompt.hide();');
}

export function detachFamilyStorage(familyId: number): void {
  const holder = holders.get(familyId);
  if (!holder) return;
  holder.shape.destroy();
  holder.marker.destroy();
  holders.delete(familyId);
}

export async function attachFamilyStorage(family: DbRow): Promise<void> {
  const familyId = Number(family.id);
  const houseId = Number(family.houseId) || 0;
  detachFamilyStorage(familyId);
  if (!houseId) return;
  const house = houseById(houseId);
  if (!house) return;
  const x = Number(house.interior.hX) + 1.2;
  const y = Number(house.interior.hY);
  const z = Number(house.interior.hZ) - 1;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return;
  const marker = new mint.Marker(mint.MarkerType.MarkerCylinder, x, y, z, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 70, 217, 143, 255, houseId);
  const shape = new mint.ColshapeSphere(x, y, z, 1.5, houseId, true);
  holders.set(familyId, { familyId, houseId, marker, shape });
  setColshapeHandlers(shape, {
    onEnter: (player) => {
      if (player.vehicle || Number(getSession(player).character?.familyId) !== familyId) return;
      cef(player, `prompt.showByName('house_items_holder');`);
      void open(player, familyId);
    },
    onExit: (player) => {
      if (Number(getSession(player).character?.familyId) !== familyId) return;
      close(player, familyId);
    },
  });
}

async function open(player: mint.Player, familyId: number): Promise<void> {
  const header = 'Склад семьи';
  if (!(await allowed(player, familyId))) return notifyError(player, 'Недостаточно прав для склада', header);
  const items = await itemsOf(familyId);
  sendEnvironmentPlace(player, header, 'Family', -familyId, items);
}

export async function loadFamilyStorages(): Promise<number> {
  const rows = (await table('Family').findAll()) as DbRow[];
  let count = 0;
  for (const row of rows) {
    if (!Number(row.houseId)) continue;
    await attachFamilyStorage(row);
    count += 1;
  }
  return count;
}
