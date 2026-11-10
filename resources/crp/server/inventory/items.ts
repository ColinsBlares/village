import { db, table } from '../core/db.js';
import type { DbRow } from '../player/session.js';

const BODY: Record<number, number[] | null> = {
  0: [1],
  1: [6],
  2: [14],
  3: [2],
  4: [3],
  5: [7],
  6: [11],
  7: [10],
  8: [12],
  9: [21, 22, 48, 49, 50, 52, 70, 76, 91, 93, 96, 99, 100, 107, 136],
  10: [13],
  11: [8],
  12: [9],
  13: null,
};

interface ClientItem {
  sqlId: number;
  itemId: number;
  params: Record<string, unknown>;
  pockets?: { cols: number; rows: number; items: Record<string, ClientItem> }[];
}

function paramsOf(row: DbRow): Record<string, unknown> {
  const list = (row.params ?? row.CharacterInventoryParams ?? []) as DbRow[];
  const params: Record<string, unknown> = {};
  for (const param of list) params[String(param.key)] = param.value;
  return params;
}

function toClient(rows: DbRow[], row: DbRow): ClientItem {
  const params = paramsOf(row);
  const item: ClientItem = { sqlId: row.id, itemId: Number(row.itemId), params };
  const pockets = params.pockets;
  if (typeof pockets === 'string') {
    try {
      const parsed = JSON.parse(pockets) as number[];
      item.pockets = [];
      for (let i = 0; i < parsed.length; i += 2) {
        item.pockets.push({ cols: parsed[i], rows: parsed[i + 1], items: {} });
      }
    } catch {
      item.pockets = [];
    }
    delete params.pockets;
  }
  if (typeof params.clime === 'string') {
    try {
      params.clime = JSON.parse(params.clime);
    } catch {
      delete params.clime;
    }
  }
  for (const child of rows) {
    if (Number(child.parentId) !== row.id || !item.pockets) continue;
    const pocket = item.pockets[Number(child.pocketIndex)] ;
    if (!pocket) continue;
    pocket.items[String(child.index)] = toClient(rows, child);
  }
  return item;
}

export function bodySlots(): Record<number, number[] | null> {
  return BODY;
}

export function isBodyGun(itemId: number): boolean {
  return BODY[9]?.includes(itemId) ?? false;
}

export function rowParams(row: DbRow): Record<string, unknown> {
  return paramsOf(row);
}

type EnvType = 'Vehicle' | 'Faction' | 'House' | 'Family';

export function emptyPockets(type: EnvType): { cols: number; rows: number; items: Record<string, ClientItem> }[] {
  switch (type) {
    case 'Vehicle':
      return [{ cols: 18, rows: 20, items: {} }];
    case 'Faction':
      return [
        { cols: 16, rows: 20, items: {} },
        { cols: 8, rows: 9, items: {} },
        { cols: 8, rows: 9, items: {} },
      ];
    case 'House':
      return [
        { cols: 16, rows: 25, items: {} },
        { cols: 16, rows: 9, items: {} },
      ];
    case 'Family':
      return [
        { cols: 16, rows: 25, items: {} },
        { cols: 16, rows: 12, items: {} },
      ];
    default:
      return [];
  }
}

export function environmentPockets(type: EnvType, rows: DbRow[]): { cols: number; rows: number; items: Record<string, ClientItem> }[] {
  const pockets = emptyPockets(type);
  for (const row of rows) {
    if (row.parentId != null) continue;
    const pocket = pockets[Number(row.pocketIndex)];
    if (!pocket) continue;
    pocket.items[String(row.index)] = toClient(rows, row);
  }
  return pockets;
}

export async function clientItems(characterId: number): Promise<Record<string, ClientItem>> {
  const rows = (await table('CharacterInventory').findAll({
    where: { playerId: characterId },
    include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
  })) as DbRow[];
  const tree: Record<string, ClientItem> = {};
  for (const row of rows) {
    if (row.parentId != null) continue;
    tree[String(row.index)] = toClient(rows, row);
  }
  return tree;
}

export async function itemCatalog(ids: number[]): Promise<Record<number, { name: string; description: string; height: number; width: number; weight: number }>> {
  if (ids.length === 0) return {};
  const op = db.Op as { in: symbol };
  const rows = (await table('InventoryItem').findAll({
    where: { id: { [op.in]: ids } },
  })) as DbRow[];
  const catalog: Record<number, { name: string; description: string; height: number; width: number; weight: number }> = {};
  for (const row of rows) {
    catalog[row.id] = {
      name: String(row.name ?? ''),
      description: String(row.description ?? ''),
      height: Number(row.height) || 1,
      width: Number(row.width) || 1,
      weight: Number(row.weight) || 0,
    };
  }
  return catalog;
}
