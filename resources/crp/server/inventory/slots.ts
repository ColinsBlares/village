import { table } from '../core/db.js';
import { rowParams } from './items.js';
import type { DbRow } from '../player/session.js';

const MAX_WEIGHT = 30;

/** Как в Rage: предметы, которые нельзя класть в указанные контейнеры */
const BLACKLIST: Record<number, number[]> = {
  3: [13, 17, 56, 22],
  7: [13, 17, 56, 22],
  8: [13, 56, 22],
};

export interface RowSnap {
  id: number;
  playerId: number;
  parentId: number | null;
  pocketIndex: number | null;
  index: number;
}

type Dims = { width: number; height: number };
const dimsCache = new Map<number, Dims>();

function blackListExists(parentItemId: number, childItemId: number): boolean {
  const list = BLACKLIST[parentItemId];
  return list ? list.includes(childItemId) : false;
}

async function itemDims(itemId: number): Promise<Dims> {
  const cached = dimsCache.get(itemId);
  if (cached) return cached;
  const row = (await table('InventoryItem').findOne({ where: { id: itemId } })) as DbRow | null;
  const dims = { width: Math.max(1, Number(row?.width) || 1), height: Math.max(1, Number(row?.height) || 1) };
  dimsCache.set(itemId, dims);
  return dims;
}

function indexToXY(cols: number, rows: number, index: number): { x: number; y: number } | null {
  const x = index % cols;
  const y = Math.trunc((index - x) / cols);
  if (x >= cols || y >= rows) return null;
  return { x, y };
}

function xyToIndex(cols: number, rows: number, coord: { x: number; y: number }): number {
  return coord.y * cols + coord.x;
}

function childrenInPocket(rows: DbRow[], holderId: number, pocketIndex: number): DbRow[] {
  return rows.filter((row) => Number(row.parentId) === holderId && Number(row.pocketIndex) === pocketIndex);
}

async function genMatrix(rows: DbRow[], holder: DbRow, pocketIndex: number): Promise<number[][] | null> {
  const pockets = parsePockets(rowParams(holder));
  if (pocketIndex >= pockets.length) return null;
  const pocket = pockets[pocketIndex];
  const matrix: number[][] = [];
  for (let y = 0; y < pocket.rows; y += 1) {
    matrix[y] = [];
    for (let x = 0; x < pocket.cols; x += 1) matrix[y][x] = 0;
  }
  const children = childrenInPocket(rows, Number(holder.id), pocketIndex);
  for (const child of children) {
    const coord = indexToXY(pocket.cols, pocket.rows, Number(child.index));
    if (!coord) continue;
    const dims = await itemDims(Number(child.itemId));
    for (let y = 0; y < dims.height; y += 1) {
      for (let x = 0; x < dims.width; x += 1) {
        const py = coord.y + y;
        const px = coord.x + x;
        if (matrix[py]?.[px] != null) matrix[py][px] = 1;
      }
    }
  }
  return matrix;
}

function findFreeIndexMatrix(matrix: number[][], width: number, height: number): number {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  for (let y = 0; y <= rows - height; y += 1) {
    for (let x = 0; x <= cols - width; x += 1) {
      let blocked = false;
      for (let dy = 0; dy < height && !blocked; dy += 1) {
        for (let dx = 0; dx < width; dx += 1) {
          if (matrix[y + dy][x + dx] === 1) {
            blocked = true;
            break;
          }
        }
      }
      if (!blocked) return xyToIndex(cols, rows, { x, y });
    }
  }
  return -1;
}

export async function characterItems(characterId: number): Promise<DbRow[]> {
  return (await table('CharacterInventory').findAll({
    where: { playerId: characterId },
    include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
  })) as DbRow[];
}

export function itemTree(rows: DbRow[], rootId: number): DbRow[] {
  const out: DbRow[] = [];
  for (const row of rows) {
    if (Number(row.id) === rootId) out.push(row);
    else if (Number(row.parentId) === rootId) out.push(...itemTree(rows, Number(row.id)));
  }
  return out;
}

function parsePockets(params: Record<string, unknown>): { cols: number; rows: number }[] {
  const raw = params.pockets;
  if (typeof raw !== 'string') return [];
  try {
    const list = JSON.parse(raw) as number[];
    const pockets: { cols: number; rows: number }[] = [];
    for (let i = 0; i + 1 < list.length; i += 2) pockets.push({ cols: list[i] || 1, rows: list[i + 1] || 1 });
    return pockets;
  } catch {
    return [];
  }
}

export async function pocketSlot(characterId: number, itemId: number): Promise<{ parentId: number; pocketIndex: number; index: number } | null> {
  const rows = await characterItems(characterId);
  return pocketSlotInRows(rows, itemId);
}

export async function pocketSlotInRows(
  rows: DbRow[],
  itemId: number,
): Promise<{ parentId: number; pocketIndex: number; index: number } | null> {
  const dims = await itemDims(itemId);
  for (const holder of rows) {
    if (holder.parentId != null) continue;
    if (Number(holder.itemId) === itemId) continue;
    if (blackListExists(Number(holder.itemId), itemId)) continue;
    const pockets = parsePockets(rowParams(holder));
    if (!pockets.length) continue;
    for (let pocketIndex = 0; pocketIndex < pockets.length; pocketIndex += 1) {
      const matrix = await genMatrix(rows, holder, pocketIndex);
      if (!matrix) continue;
      const index = findFreeIndexMatrix(matrix, dims.width, dims.height);
      if (index !== -1) return { parentId: Number(holder.id), pocketIndex, index };
    }
  }
  return null;
}

export function snapshotTree(rows: DbRow[], rootId: number): RowSnap[] {
  return itemTree(rows, rootId).map((row) => ({
    id: Number(row.id),
    playerId: Number(row.playerId),
    parentId: row.parentId == null ? null : Number(row.parentId),
    pocketIndex: row.pocketIndex == null ? null : Number(row.pocketIndex),
    index: Number(row.index),
  }));
}

export async function restoreSnapshots(snaps: RowSnap[]): Promise<void> {
  for (const snap of snaps) {
    const row = (await table('CharacterInventory').findOne({ where: { id: snap.id } })) as DbRow | null;
    if (!row) continue;
    row.playerId = snap.playerId;
    row.parentId = snap.parentId;
    row.pocketIndex = snap.pocketIndex;
    row.index = snap.index;
    await row.save();
  }
}

async function rootWeight(rows: DbRow[], rootId: number): Promise<number> {
  let sum = 0;
  for (const row of itemTree(rows, rootId)) sum += await itemWeight(Number(row.itemId), rowParams(row));
  return sum;
}

export async function packWeight(rows: DbRow[], rootIds: number[]): Promise<number> {
  let sum = 0;
  for (const id of rootIds) sum += await rootWeight(rows, id);
  return sum;
}

function sexBlocked(gender: number, item: DbRow): boolean {
  const sex = rowParams(item).sex;
  if (sex == null || sex === '') return false;
  const want = Number(sex);
  const have = Number(gender) === 1 ? 1 : 0;
  return Number.isFinite(want) && want !== have;
}

function hasWeapon(rows: DbRow[], itemId: number, ignore: Set<number>): boolean {
  for (const row of rows) {
    if (Number(row.itemId) !== itemId || ignore.has(Number(row.id))) continue;
    if (rowParams(row).weaponHash) return true;
  }
  return false;
}

/** Проверка, что получатель вынесет обмен по весу, полу и дубликатам оружия */
export async function checkTradeReceive(
  receiverId: number,
  receiverGender: number,
  receiverRows: DbRow[],
  incomingRootIds: number[],
  incomingRows: DbRow[],
  outgoingRootIds: number[],
): Promise<string | null> {
  const outgoingIds = new Set<number>();
  for (const rootId of outgoingRootIds) {
    for (const row of itemTree(receiverRows, rootId)) outgoingIds.add(Number(row.id));
  }
  const seenWeapon = new Set<number>();
  for (const rootId of incomingRootIds) {
    const tree = itemTree(incomingRows, rootId);
    for (const item of tree) {
      if (sexBlocked(receiverGender, item)) return 'Предмет противоположного пола';
      const params = rowParams(item);
      if (!params.weaponHash) continue;
      const kind = Number(item.itemId);
      if (seenWeapon.has(kind) || hasWeapon(receiverRows, kind, outgoingIds)) {
        const info = (await table('InventoryItem').findOne({ where: { id: kind } })) as DbRow | null;
        return `Оружие ${String(info?.name ?? 'предмет')} уже имеется`;
      }
      seenWeapon.add(kind);
    }
  }
  let next = await commonWeight(receiverId);
  next -= await packWeight(receiverRows, outgoingRootIds);
  next += await packWeight(incomingRows, incomingRootIds);
  const max = maxPlayerWeight();
  if (next > max + 0.001) return `Превышение по весу (${next.toFixed(1)} из ${max} кг)`;
  return null;
}

async function itemWeight(itemId: number, params: Record<string, unknown>): Promise<number> {
  const row = (await table('InventoryItem').findOne({ where: { id: itemId } })) as DbRow | null;
  const unit = Number(row?.weight) || 0;
  const count = Number(params.count) || 1;
  return unit * count;
}

export async function commonWeight(characterId: number): Promise<number> {
  const rows = await characterItems(characterId);
  let sum = 0;
  for (const row of rows) {
    if (row.parentId != null) continue;
    sum += await itemWeight(Number(row.itemId), rowParams(row));
    for (const child of rows) {
      if (Number(child.parentId) === Number(row.id)) sum += await itemWeight(Number(child.itemId), rowParams(child));
    }
  }
  return sum;
}

export function maxPlayerWeight(): number {
  return MAX_WEIGHT;
}

export async function transferItemTree(fromId: number, toId: number, rootSqlId: number): Promise<string | null> {
  const fromRows = await characterItems(fromId);
  const root = fromRows.find((row) => Number(row.id) === rootSqlId);
  if (!root || Number(root.playerId) !== fromId) return 'Предмет не найден';
  const tree = itemTree(fromRows, rootSqlId);
  const slot = await pocketSlot(toId, Number(root.itemId));
  if (!slot) return 'Нет места';
  root.parentId = slot.parentId;
  root.pocketIndex = slot.pocketIndex;
  root.index = slot.index;
  for (const row of tree) {
    row.playerId = toId;
    await row.save();
  }
  return null;
}
