import type * as mint from 'mint-server';
import { table } from '../../core/db.js';
import { giveItem, sendInventory } from '../../inventory/index.js';
import { rowParams } from '../../inventory/items.js';
import { getSession, type DbRow } from '../../player/session.js';
import { notifyError, notifySuccess } from '../../ui/notify.js';
import { spendStock } from '../warehouse.js';

const SLOT_ITEMS = [6, 7, 8, 9, 10, 2, 14, 1] as const;

export interface ClothPiece {
  itemId: number;
  params: Record<string, unknown>;
}

export interface ClothSet {
  hat?: ClothPiece;
  top?: ClothPiece;
  legs?: ClothPiece;
  feets?: ClothPiece;
  ears?: ClothPiece;
  tie?: ClothPiece;
  mask?: ClothPiece;
  glasses?: ClothPiece;
}

function cleanTop(params: Record<string, unknown>): void {
  for (const key of ['undershirt', 'uTexture', 'decal', 'dTexture', 'tTexture'] as const) {
    if (params[key] === -1) delete params[key];
  }
}

export function finalizeSet(set: ClothSet, factionName: string): ClothPiece[] {
  const out: ClothPiece[] = [];
  const push = (piece: ClothPiece | undefined, itemId: number) => {
    if (!piece) return;
    const params = { ...piece.params };
    if (params.variation === -1) return;
    if (itemId === 7) {
      cleanTop(params);
      params.pockets = '[5,5,5,5,10,5]';
      params.name = `Рубашка ${factionName}`;
    }
    if (itemId === 8) {
      params.pockets = '[5,5,5,5,10,5]';
      params.name = `Брюки ${factionName}`;
    }
    params.clime = '[-10,15]';
    out.push({ itemId, params });
  };
  push(set.hat, 6);
  push(set.top, 7);
  push(set.legs, 8);
  push(set.feets, 9);
  push(set.ears, 10);
  push(set.tie, 2);
  push(set.mask, 14);
  push(set.glasses, 1);
  return out;
}

async function stripFactionClothes(player: mint.Player, characterId: number, factionId: number): Promise<void> {
  const rows = (await table('CharacterInventory').findAll({
    where: { playerId: characterId },
    include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
  })) as DbRow[];
  for (const row of rows) {
    if (!SLOT_ITEMS.includes(Number(row.itemId) as (typeof SLOT_ITEMS)[number])) continue;
    const params = rowParams(row);
    if (Number(params.faction) === factionId && Number(params.owner) === characterId) await row.destroy();
  }
  await sendInventory(player);
}

async function isInventoryEmpty(characterId: number): Promise<boolean> {
  const rows = (await table('CharacterInventory').findAll({ where: { playerId: characterId }, attributes: ['id'] })) as DbRow[];
  return rows.length === 0;
}

export async function issueClothes(
  player: mint.Player,
  header: string,
  set: ClothSet,
  clothesAmmoCost: number,
): Promise<void> {
  const character = getSession(player).character;
  if (!character) return;
  const factionId = Number(character.factionId) || 0;
  if (!(await isInventoryEmpty(character.id))) {
    return notifyError(player, 'Необходимо раздеться, чтобы надеть форму', header);
  }
  if (clothesAmmoCost > 0 && !(await spendStock(factionId, 'ammo', clothesAmmoCost))) {
    return notifyError(player, 'Недостаточно боеприпасов', header);
  }
  await stripFactionClothes(player, character.id, factionId);
  const factionName = header.replace(/^Склад\s+/i, '').trim();
  const pieces = finalizeSet(set, factionName);
  for (const piece of pieces) {
    const ok = await giveItem(player, piece.itemId, piece.params);
    if (!ok) {
      if (clothesAmmoCost > 0) await spendStock(factionId, 'ammo', -clothesAmmoCost);
      return notifyError(player, 'Нет места', header);
    }
  }
  notifySuccess(player, 'Форма выдана', header);
}

export function at<T>(list: T[], index: number): T {
  return list[Math.max(0, Math.min(list.length - 1, index))]!;
}
