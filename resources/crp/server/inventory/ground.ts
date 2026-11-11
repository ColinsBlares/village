import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { clearItem } from '../character/clothes.js';
import { getSession, type DbRow } from '../player/session.js';
import { notifyError, notifySuccess } from '../ui/notify.js';
import { sendInventory } from './index.js';
import { rowParams } from './items.js';
import { characterItems, itemTree, pocketSlot } from './slots.js';
import { syncHands } from '../weapons/index.js';
import { playTimed } from '../animations/index.js';
import { getPlace } from './place.js';

const GROUND_MAX = 30;
const GROUND_DIST = 2;
export const GROUND_MS = 2 * 60 * 1000;

interface DropRow {
  oldId: number;
  oldParentId: number | null;
  itemId: number;
  pocketIndex: number | null;
  index: number;
  params: Record<string, string>;
}

interface Drop {
  ownerId: number;
  rows: DropRow[];
  object: mint.Object;
  timer: ReturnType<typeof setTimeout>;
}

const drops = new Map<number, Drop>();
const taking = new Set<number>();
const byOwner = new Map<number, number[]>();
const dropping = new Set<string>();

function serializeTree(rows: DbRow[], root: DbRow): DropRow[] {
  return itemTree(rows, Number(root.id)).map((row) => {
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(rowParams(row))) params[key] = String(value);
    return {
      oldId: Number(row.id),
      oldParentId: row.parentId == null ? null : Number(row.parentId),
      itemId: Number(row.itemId),
      pocketIndex: row.pocketIndex == null ? null : Number(row.pocketIndex),
      index: Number(row.index),
      params,
    };
  });
}

async function destroyTree(root: DbRow, rows: DbRow[]): Promise<DropRow[]> {
  const data = serializeTree(rows, root);
  for (const row of itemTree(rows, Number(root.id))) await row.destroy();
  return data;
}

async function restoreTree(player: mint.Player, characterId: number, data: DropRow[]): Promise<string | null> {
  if (data.length === 0) return 'Пусто';
  const slot = await pocketSlot(characterId, data[0].itemId);
  if (!slot) return 'Нет места';
  const idMap = new Map<number, number>();
  for (let i = 0; i < data.length; i += 1) {
    const src = data[i];
    let parentId: number | null;
    let pocketIndex = src.pocketIndex;
    let index = src.index;
    if (i === 0) {
      parentId = slot.parentId;
      pocketIndex = slot.pocketIndex;
      index = slot.index;
    } else {
      parentId = src.oldParentId == null ? null : idMap.get(src.oldParentId) ?? null;
    }
    const created = (await table('CharacterInventory').create({
      playerId: characterId,
      itemId: src.itemId,
      pocketIndex,
      index,
      parentId,
    })) as DbRow;
    idMap.set(src.oldId, Number(created.id));
    await Promise.all(Object.entries(src.params).map(([key, value]) => table('CharacterInventoryParam').create({ itemId: created.id, key, value })));
  }
  await sendInventory(player);
  return null;
}

function trackOwner(ownerId: number, objectId: number): void {
  const list = byOwner.get(ownerId) ?? [];
  list.push(objectId);
  while (list.length > GROUND_MAX) {
    const old = list.shift();
    if (old != null) removeDrop(old);
  }
  byOwner.set(ownerId, list);
}

function removeDrop(objectId: number): void {
  const drop = drops.get(objectId);
  if (!drop) return;
  clearTimeout(drop.timer);
  if (drop.object.valid) drop.object.destroy();
  drops.delete(objectId);
  for (const [owner, list] of byOwner) {
    const idx = list.indexOf(objectId);
    if (idx !== -1) {
      list.splice(idx, 1);
      byOwner.set(owner, list);
      break;
    }
  }
}

export async function dropOwnedItem(
  owner: mint.Player,
  sqlId: number,
  pos: { x: number; y: number; z: number },
  actor: mint.Player,
  death = false,
): Promise<string | null> {
  const character = getSession(owner).character;
  if (!character || !owner.valid) return 'Игрок не найден';
  const lock = `${owner.id}:${sqlId}`;
  if (dropping.has(lock)) return 'Предмет уже выбрасывается';
  dropping.add(lock);
  try {
  if (!death && actor.getSyncedMeta('crp:cuffs')) return 'Недоступно в наручниках';
  if (!death && getPlace(actor)) return 'Закройте багажник или шкаф';
  if (!Number.isFinite(pos.x) || actor.pos.distanceTo(new mint.Vector3(pos.x, pos.y, pos.z)) > (death ? 10 : 5)) return 'Слишком далеко';
  const rows = await characterItems(character.id);
  const row = rows.find((entry) => Number(entry.id) === sqlId);
  if (!row) return `Предмет #${sqlId} не найден`;
  const info = (await table('InventoryItem').findOne({ where: { id: row.itemId } })) as DbRow | null;
  const model = String(info?.model ?? 'prop_paper_bag_01');
  const deltaZ = Number(info?.deltaZ) || 0;
  const pitch = (Number(info?.rX) || 0) * (Math.PI / 180);
  const roll = (Number(info?.rY) || 0) * (Math.PI / 180);
  if (row.parentId == null && Number(row.index) === 13) syncHands(owner, row, false);
  else if (row.parentId == null && Number(row.index) !== 13) {
    const gender = Number(character.gender) === 1 ? 1 : 0;
    const hair = Number(character.hair) || 0;
    clearItem(owner, Number(row.itemId), gender, hair);
  }
  const data = await destroyTree(row, rows);
  await sendInventory(owner);
  const object = new mint.Object(mint.hash(model), pos.x, pos.y, pos.z + deltaZ, pitch, roll, actor.rot.z, actor.dimension, true);
  object.rot = new mint.Vector3(pitch, roll, actor.rot.z);
  const title = String(info?.name ?? 'Предмет');
  object.setStreamSyncedMeta('crp:ground', Number(row.itemId));
  object.setStreamSyncedMeta('crp:groundName', title);
  const timer = setTimeout(() => removeDrop(object.id), GROUND_MS);
  drops.set(object.id, { ownerId: owner.id, rows: data, object, timer });
  trackOwner(owner.id, object.id);
  return null;
  } finally {
    dropping.delete(lock);
  }
}

export function dropFresh(
  owner: mint.Player,
  itemId: number,
  title: string,
  model: string,
  pos: { x: number; y: number; z: number },
  yaw: number,
): boolean {
  if (!owner.valid) return false;
  const list = byOwner.get(owner.id) ?? [];
  if (list.length >= GROUND_MAX) return false;
  const object = new mint.Object(mint.hash(model), pos.x, pos.y, pos.z, 0, 0, yaw, owner.dimension, true);
  object.rot = new mint.Vector3(0, 0, yaw);
  object.setStreamSyncedMeta('crp:ground', itemId);
  object.setStreamSyncedMeta('crp:groundName', title);
  const timer = setTimeout(() => removeDrop(object.id), GROUND_MS);
  drops.set(object.id, {
    ownerId: owner.id,
    rows: [{ oldId: 1, oldParentId: null, itemId, pocketIndex: null, index: 0, params: {} }],
    object,
    timer,
  });
  trackOwner(owner.id, object.id);
  return true;
}

export function installGroundItems(): void {
  mint.onClient('crp:item:ground:put', async (player, rawId, rawPos) => {
    const header = 'Выброс предмета';
    const character = getSession(player).character;
    if (!character) return;
    let pos: { x: number; y: number; z: number };
    try {
      pos = typeof rawPos === 'string' ? (JSON.parse(rawPos) as { x: number; y: number; z: number }) : (rawPos as { x: number; y: number; z: number });
    } catch {
      return;
    }
    const error = await dropOwnedItem(player, Number(rawId), pos, player);
    if (error) return notifyError(player, error, header);
    notifySuccess(player, 'Предмет на земле', header);
  });

  mint.onClient('crp:item:ground:take', async (player, objectId) => {
    const header = 'Поднятие предмета';
    const character = getSession(player).character;
    if (!character) return;
    if (player.getSyncedMeta('crp:cuffs')) return notifyError(player, 'Недоступно в наручниках', header);
    const id = Number(objectId);
    const drop = drops.get(id);
    if (!drop?.object.valid) return notifyError(player, 'Предмет не найден', header);
    if (taking.has(id)) return notifyError(player, 'Предмет занят другим игроком', header);
    if (drop.object.dimension !== player.dimension) return notifyError(player, 'Предмет не найден', header);
    if (player.pos.distanceTo(drop.object.pos) > GROUND_DIST) return notifyError(player, 'Вы слишком далеко от предмета', header);
    taking.add(id);
    playTimed(player, 'anim@mp_snowball', 'pickup_snowball', 1, 1500);
    try {
      const fail = await restoreTree(player, character.id, drop.rows);
      if (fail) return notifyError(player, fail, header);
      removeDrop(id);
      notifySuccess(player, 'Предмет в инвентаре', header);
    } finally {
      taking.delete(id);
    }
  });
}
