import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { clearItem, wearItem } from '../character/clothes.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError } from '../ui/notify.js';
import { bodySlots, environmentPockets, rowParams } from './items.js';
import { clearPlace, getPlace, setPlace, type InventoryPlace, type PlaceType } from './place.js';
import { syncGun } from '../attaches/index.js';
import { syncHands } from '../weapons/index.js';

type MoveData = {
  sqlId?: number;
  pocketI?: number | null;
  index?: number;
  placeSqlId?: number | null;
};

function childrenOf(rows: DbRow[], rootId: number): DbRow[] {
  const stack: DbRow[] = [];
  for (const row of rows) {
    if (Number(row.parentId) === rootId) {
      stack.push(row);
      stack.push(...childrenOf(rows, Number(row.id)));
    }
  }
  return stack;
}

function paramRows(params: Record<string, unknown>): { key: string; value: string }[] {
  const out: { key: string; value: string }[] = [];
  for (const [key, value] of Object.entries(params)) {
    let stored = value;
    if (key === 'pockets' || key === 'clime') stored = JSON.stringify(value);
    out.push({ key, value: String(stored) });
  }
  return out;
}

async function createEnvItem(
  envTable: string,
  paramTable: string,
  ownerKey: string,
  ownerId: number,
  src: DbRow,
  pocketIndex: number | null,
  index: number,
  parentId: number | null,
  params: Record<string, unknown>,
): Promise<DbRow> {
  const conf: Record<string, unknown> = {
    itemId: src.itemId,
    pocketIndex,
    index,
    parentId,
    [ownerKey]: ownerId,
  };
  const created = (await table(envTable).create(conf)) as DbRow;
  for (const entry of paramRows(params)) {
    await table(paramTable).create({ itemId: created.id, key: entry.key, value: entry.value });
  }
  created.params = paramRows(params).map((entry) => ({ key: entry.key, value: entry.value }));
  return created;
}

async function createCharacterItem(
  characterId: number,
  src: DbRow,
  parentId: number | null,
  pocketIndex: number | null,
  index: number,
  params: Record<string, unknown>,
): Promise<DbRow> {
  const created = (await table('CharacterInventory').create({
    playerId: characterId,
    itemId: src.itemId,
    pocketIndex,
    index,
    parentId,
  })) as DbRow;
  for (const entry of paramRows(params)) {
    await table('CharacterInventoryParam').create({ itemId: created.id, key: entry.key, value: entry.value });
  }
  created.params = paramRows(params).map((entry) => ({ key: entry.key, value: entry.value }));
  return created;
}

function envTables(type: PlaceType): { table: string; params: string; ownerKey: string } | null {
  if (type === 'Vehicle') return { table: 'VehicleInventory', params: 'VehicleInventoryParam', ownerKey: 'vehicleId' };
  if (type === 'Faction') return { table: 'FactionInventory', params: 'FactionInventoryParam', ownerKey: 'playerId' };
  if (type === 'House') return { table: 'HouseInventory', params: 'HouseInventoryParam', ownerKey: 'houseId' };
  if (type === 'Family') return { table: 'FamilyInventory', params: 'FamilyInventoryParam', ownerKey: 'familyId' };
  return null;
}

export function sendEnvironmentPlace(player: mint.Player, header: string, type: PlaceType, sqlId: number, items: DbRow[]): void {
  const place = {
    sqlId,
    header,
    pockets: environmentPockets(type, items),
  };
  setPlace(player, { type, sqlId, items });
  cef(player, `inventory.addEnvironmentPlace(${JSON.stringify(place)});`);
}

export function deleteEnvironmentPlace(player: mint.Player, sqlId: number): void {
  clearPlace(player);
  cef(player, `inventory.deleteEnvironmentPlace(${sqlId});`);
}

export async function moveInventoryItem(player: mint.Player, raw: string): Promise<void> {
  const character = getSession(player).character;
  if (!character) return;
  const data = JSON.parse(raw) as MoveData;
  const place = getPlace(player);
  const placeSqlId = data.placeSqlId == null ? null : Number(data.placeSqlId);
  if (placeSqlId != null && placeSqlId > 0) {
    const container = (await table('CharacterInventory').findOne({
      where: { id: placeSqlId, playerId: character.id },
    })) as DbRow | null;
    if (!container) return notifyError(player, 'Контейнер не найден', 'Инвентарь');
  }

  const sqlId = Number(data.sqlId);
  const index = Number(data.index);
  const pocketI = data.pocketI == null ? null : Number(data.pocketI);

  const characterRows = (await table('CharacterInventory').findAll({
    where: { playerId: character.id },
    include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
  })) as DbRow[];
  let row = characterRows.find((entry) => Number(entry.id) === sqlId) ?? null;

  if (placeSqlId === null || placeSqlId > 0) {
    if (row) {
      await moveOnCharacter(player, character, row, characterRows, index, pocketI, placeSqlId);
      return;
    }
    if (!place?.items) return;
    const envItem = place.items.find((entry) => Number(entry.id) === sqlId);
    if (!envItem) return notifyError(player, `Предмет #${sqlId} в среде не найден`, 'Код 1');
    await takeFromEnvironment(player, character, envItem, index, pocketI, placeSqlId);
    return;
  }

  if (!place?.type) return notifyError(player, 'Вы далеко от окружения', 'Инвентарь');
  if (row) {
    await putToEnvironment(player, character, row, characterRows, pocketI, index, place);
    return;
  }
  const envItem = place.items.find((entry) => Number(entry.id) === sqlId);
  if (!envItem) return notifyError(player, `Предмет #${sqlId} в среде не найден`, 'Код 2');
  envItem.pocketIndex = pocketI;
  envItem.index = index;
  await envItem.save();
}

async function moveOnCharacter(
  player: mint.Player,
  character: DbRow,
  row: DbRow,
  _all: DbRow[],
  index: number,
  pocketI: number | null,
  place: number | null,
): Promise<void> {
  if (place == null && Number.isInteger(index) && index !== 13) {
    const allowed = bodySlots()[index];
    if (allowed && !allowed.includes(Number(row.itemId))) return;
  }
  const oldIndex = Number(row.index);
  const oldParent = row.parentId;
  const wasBody = oldParent == null && oldIndex !== 13;
  const nowBody = place == null && index !== 13;
  const params: Record<string, number> = {};
  for (const [key, value] of Object.entries(rowParams(row))) {
    const num = Number(value);
    if (Number.isFinite(num)) params[key] = num;
  }
  const wasHands = oldParent == null && oldIndex === 13;
  const nowHands = place == null && index === 13;
  row.index = index;
  row.pocketIndex = pocketI;
  row.parentId = place;
  await row.save();
  const gender = Number(character.gender) === 1 ? 1 : 0;
  const hair = Number(character.hair) || 0;
  const itemId = Number(row.itemId);
  if (wasHands && !nowHands) syncHands(player, row, false);
  else if (nowHands) syncHands(player, row, true);
  if (wasBody && !nowBody) syncGun(player, itemId, false);
  else if (nowBody) syncGun(player, itemId, true);
  if (wasBody && !nowBody) clearItem(player, itemId, gender, hair);
  else if (!wasBody && nowBody) wearItem(player, itemId, params);
  else if (wasBody && nowBody && oldIndex !== index) {
    clearItem(player, itemId, gender, hair);
    wearItem(player, itemId, params);
  }
}

async function putToEnvironment(
  player: mint.Player,
  character: DbRow,
  row: DbRow,
  characterRows: DbRow[],
  pocketI: number | null,
  index: number,
  place: InventoryPlace,
): Promise<void> {
  const tables = envTables(place.type);
  if (!tables) return;
  const ownerId = place.type === 'Vehicle' ? -place.sqlId : -place.sqlId;
  const kids = childrenOf(characterRows, Number(row.id));
  const batch = [row, ...kids];
  const idMap = new Map<number, number>();
  const oldRootId = Number(row.id);

  const oldIndex = Number(row.index);
  const oldParent = row.parentId;
  if (oldParent == null && oldIndex === 13) syncHands(player, row, false);
  else if (oldParent == null && oldIndex !== 13) {
    const params: Record<string, number> = {};
    for (const [key, value] of Object.entries(rowParams(row))) {
      const num = Number(value);
      if (Number.isFinite(num)) params[key] = num;
    }
    const gender = Number(character.gender) === 1 ? 1 : 0;
    const hair = Number(character.hair) || 0;
    clearItem(player, Number(row.itemId), gender, hair);
  }

  for (const src of batch) {
    const parentId = src === row ? null : idMap.get(Number(src.parentId)) ?? null;
    const pocket = src === row ? pocketI : src.pocketIndex == null ? null : Number(src.pocketIndex);
    const slot = src === row ? index : Number(src.index);
    const created = await createEnvItem(
      tables.table,
      tables.params,
      tables.ownerKey,
      ownerId,
      src,
      pocket,
      slot,
      parentId,
      rowParams(src),
    );
    idMap.set(Number(src.id), Number(created.id));
    place.items.push(created);
    await src.destroy();
    cef(player, `inventory.deleteItem(${Number(src.id)});`);
  }

  const newId = idMap.get(oldRootId);
  if (newId != null) cef(player, `inventory.setEnvironmentItemSqlId(${oldRootId}, ${newId});`);
}

async function takeFromEnvironment(
  player: mint.Player,
  character: DbRow,
  item: DbRow,
  index: number,
  pocketI: number | null,
  parentId: number | null,
): Promise<void> {
  const place = getPlace(player);
  if (!place) return;
  const kids = childrenOf(place.items, Number(item.id));
  const batch = [item, ...kids];
  const idMap = new Map<number, number>();
  const oldRootId = Number(item.id);

  for (const src of batch) {
    const parent = src === item ? parentId : idMap.get(Number(src.parentId)) ?? null;
    const pocket = src === item ? pocketI : src.pocketIndex == null ? null : Number(src.pocketIndex);
    const slot = src === item ? index : Number(src.index);
    const created = await createCharacterItem(character.id, src, parent, pocket, slot, rowParams(src));
    idMap.set(Number(src.id), Number(created.id));
    const idx = place.items.indexOf(src);
    if (idx !== -1) place.items.splice(idx, 1);
    await src.destroy();
  }

  const newId = idMap.get(oldRootId);
  if (newId == null) return;
  const root = (await table('CharacterInventory').findOne({
    where: { id: newId, playerId: character.id },
    include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
  })) as DbRow | null;
  if (!root) return;
  if (root.parentId == null && Number(root.index) === 13) syncHands(player, root, true);
  else if (root.parentId == null && Number(root.index) !== 13) {
    const params: Record<string, number> = {};
    for (const [key, value] of Object.entries(rowParams(root))) {
      const num = Number(value);
      if (Number.isFinite(num)) params[key] = num;
    }
    wearItem(player, Number(root.itemId), params);
  }
  cef(player, `inventory.setItemSqlId(${oldRootId}, ${newId});`);
}
