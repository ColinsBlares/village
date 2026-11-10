import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { writeCrash } from '../core/log.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { bodySlots, clientItems, itemCatalog } from './items.js';
import { installItemUse } from './use.js';
import { installBootInventory } from './boot.js';
import { installHolderInventory } from './holder.js';
import { installHouseHolderEvents } from './houseHolder.js';
import { installGroundItems } from './ground.js';
import { installHeld } from './hands.js';
import { moveInventoryItem } from './environment.js';

function collectIds(value: unknown, into: Set<number>): void {
  if (!value || typeof value !== 'object') return;
  const item = value as { itemId?: number; pockets?: { items?: Record<string, unknown> }[] };
  if (typeof item.itemId === 'number') into.add(item.itemId);
  for (const pocket of item.pockets ?? []) {
    for (const child of Object.values(pocket.items ?? {})) collectIds(child, into);
  }
}

export async function giveItem(player: mint.Player, itemId: number, params: Record<string, unknown> = {}): Promise<boolean> {
  const character = getSession(player).character;
  if (!character) return false;
  const rows = (await table('CharacterInventory').findAll({
    where: { playerId: character.id, parentId: null },
  })) as DbRow[];
  const used = new Set(rows.map((row) => Number(row.index)));
  let index = 0;
  while (used.has(index)) index += 1;
  const created = (await table('CharacterInventory').create({
    playerId: character.id,
    itemId,
    pocketIndex: 0,
    index,
    parentId: null,
  })) as DbRow;
  for (const [key, value] of Object.entries(params)) {
    await table('CharacterInventoryParam').create({ itemId: created.id, key, value: String(value) });
  }
  await sendInventory(player);
  return true;
}

export async function takeItem(player: mint.Player, itemIds: number[]): Promise<DbRow | null> {
  const character = getSession(player).character;
  if (!character) return null;
  const row = (await table('CharacterInventory').findOne({
    where: { playerId: character.id, itemId: itemIds },
  })) as DbRow | null;
  if (!row || typeof row.destroy !== 'function') return null;
  await row.destroy();
  await sendInventory(player);
  return row;
}

export async function sendInventory(player: mint.Player): Promise<void> {
  const character = getSession(player).character;
  if (!character) return;
  const tree = await clientItems(character.id);
  const ids = new Set<number>();
  for (const item of Object.values(tree)) collectIds(item, ids);
  const catalog = await itemCatalog([...ids]);
  const lines = [
    `inventory.setItemsInfo(${JSON.stringify(catalog)});`,
    ...Object.entries(bodySlots()).map(([index, list]) => `inventory.setBodyList(${index}, ${JSON.stringify(list)});`),
    `inventory.initItems(${JSON.stringify(tree)});`,
    'inventory.enable = true;',
  ];
  cef(player, lines.join('\n'));
}

export function installInventory(): void {
  installItemUse();
  installBootInventory();
  installHolderInventory();
  installHouseHolderEvents();
  installGroundItems();
  installHeld();
  mint.onClient('crp:item:add', (player, raw) => {
    if (!player?.valid || typeof raw !== 'string') return;
    void moveInventoryItem(player, raw).catch((err: unknown) => writeCrash('inventory.move', err));
  });
}
