import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { writeCrash } from '../core/log.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { wearItem } from '../character/clothes.js';
import { bodySlots, clientItems, itemCatalog, rowParams } from './items.js';
import { showHeld } from './hands.js';
import { characterItems, commonWeight, maxPlayerWeight, pocketSlotInRows } from './slots.js';
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

async function freeSlot(rows: DbRow[], itemId: number): Promise<{ parentId: number | null; pocketIndex: number | null; index: number } | null> {
  if (!rows.some((row) => row.parentId == null && Number(row.index) === 13)) {
    return { parentId: null, pocketIndex: null, index: 13 };
  }
  for (const [slot, list] of Object.entries(bodySlots())) {
    const index = Number(slot);
    if (!list?.includes(itemId)) continue;
    if (!rows.some((row) => row.parentId == null && Number(row.index) === index)) {
      return { parentId: null, pocketIndex: null, index };
    }
  }
  return pocketSlotInRows(rows, itemId);
}

export async function giveItem(player: mint.Player, itemId: number, params: Record<string, unknown> = {}): Promise<boolean> {
  const character = getSession(player).character;
  if (!character) return false;
  const sex = params.sex;
  if (sex != null && sex !== '' && Number(sex) !== Number(!Number(character.gender))) return false;
  const rows = await characterItems(character.id);
  if (params.weaponHash && rows.some((row) => Number(row.itemId) === itemId && rowParams(row).weaponHash)) return false;
  const info = (await table('InventoryItem').findOne({ where: { id: itemId } })) as DbRow | null;
  const nextWeight = (await commonWeight(character.id)) + (Number(info?.weight) || 0) * (Number(params.count) || 1);
  if (nextWeight > maxPlayerWeight()) return false;
  const slot = await freeSlot(rows, itemId);
  if (!slot) return false;
  const created = (await table('CharacterInventory').create({
    playerId: character.id,
    itemId,
    pocketIndex: slot.pocketIndex,
    index: slot.index,
    parentId: slot.parentId,
  })) as DbRow;
  for (const [key, value] of Object.entries(params)) {
    await table('CharacterInventoryParam').create({ itemId: created.id, key, value: String(value) });
  }
  await sendInventory(player);
  if (slot.parentId == null && slot.index === 13) void showHeld(player, created);
  else if (slot.parentId == null) {
    const numeric: Record<string, number> = {};
    for (const [key, value] of Object.entries(params)) {
      const num = Number(value);
      if (Number.isFinite(num)) numeric[key] = num;
    }
    wearItem(player, itemId, numeric);
  }
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
