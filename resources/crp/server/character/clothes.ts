import { allowArmour } from '../anticheat/index.js';
import { clothDlcHash } from '../clothes/index.js';
import { table } from '../core/db.js';
import type { DbRow } from '../player/session.js';

export interface ClothPiece {
  component: number;
  drawable: number;
  texture: number;
  dlc?: number;
}

type Dresser = {
  setClothes: (component: number, drawable: number, texture: number, palette?: number) => boolean;
  setProp: (component: number, drawable: number, texture: number) => boolean;
  setDlcClothes?: (dlc: number, component: number, drawable: number, texture: number, palette?: number) => boolean;
  armour: number;
};

function putCloth(player: Pick<Dresser, 'setClothes' | 'setDlcClothes'>, piece: ClothPiece): void {
  if (piece.dlc) player.setDlcClothes?.(piece.dlc, piece.component, piece.drawable, piece.texture, 0);
  else player.setClothes(piece.component, piece.drawable, piece.texture, 0);
}

const CLOTHES: Record<number, number> = { 2: 7, 3: 9, 8: 4, 9: 6, 13: 5 };
const PROPS: Record<number, number> = { 6: 0, 1: 1, 10: 2, 11: 6, 12: 7 };

function piecesOf(rows: DbRow[]): { clothes: ClothPiece[]; props: ClothPiece[] } {
  const clothes: ClothPiece[] = [];
  const props: ClothPiece[] = [];
  for (const row of rows) {
    const params = paramsOf(row);
    const itemId = Number(row.itemId);
    if (itemId === 7) {
      clothes.push({ component: 3, drawable: params.torso || 0, texture: params.tTexture || 0 });
      const top: ClothPiece = { component: 11, drawable: params.variation || 0, texture: params.texture || 0 };
      if (params.dlc) top.dlc = params.dlc;
      clothes.push(top);
      if (params.undershirt != null) {
        clothes.push({ component: 8, drawable: params.undershirt, texture: params.uTexture || 0 });
      }
      if (params.decal != null) {
        clothes.push({ component: 10, drawable: params.decal, texture: params.dTexture || 0 });
      }
      continue;
    }
    if (itemId === 14) {
      clothes.push({ component: 1, drawable: params.variation || 0, texture: params.texture || 0 });
      continue;
    }
    if (CLOTHES[itemId] != null) {
      const piece: ClothPiece = { component: CLOTHES[itemId], drawable: params.variation || 0, texture: params.texture || 0 };
      if (params.dlc) piece.dlc = params.dlc;
      clothes.push(piece);
      continue;
    }
    if (PROPS[itemId] != null) {
      props.push({ component: PROPS[itemId], drawable: params.variation || 0, texture: params.texture || 0 });
    }
  }
  return { clothes, props };
}

function paramsOf(row: DbRow): Record<string, number> {
  const list = (row.params ?? row.CharacterInventoryParams ?? []) as DbRow[];
  const params: Record<string, number> = {};
  for (const param of list) {
    const key = String(param.key);
    const raw = String(param.value ?? '');
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) {
      params[key] = numeric;
      continue;
    }
    if (key === 'dlc') {
      const hashed = clothDlcHash(raw);
      if (hashed) params.dlc = hashed;
    }
  }
  return params;
}

export async function loadWorn(characterId: number): Promise<{ clothes: ClothPiece[]; props: ClothPiece[] }> {
  const rows = (await table('CharacterInventory').findAll({
    where: { playerId: characterId, parentId: null },
    include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
  })) as DbRow[];
  return piecesOf(rows);
}

export function applyNaked(player: { setClothes: (component: number, drawable: number, texture: number, palette?: number) => boolean }, gender: number): void {
  const male = gender !== 1;
  player.setClothes(3, 15, 0, 0);
  player.setClothes(11, male ? 15 : 18, 0, 0);
  player.setClothes(8, male ? 15 : 3, 0, 0);
  player.setClothes(10, 0, 0, 0);
  player.setClothes(4, male ? 18 : 17, male ? 2 : 0, 0);
  player.setClothes(6, male ? 34 : 35, 0, 0);
  player.setClothes(1, 0, 0, 0);
  player.setClothes(5, 0, 0, 0);
  player.setClothes(7, 0, 0, 0);
  player.setClothes(9, 0, 0, 0);
}

export function wearItem(player: Dresser, itemId: number, params: Record<string, number>): void {
  if (CLOTHES[itemId] != null) {
    putCloth(player, {
      component: CLOTHES[itemId],
      drawable: params.variation || 0,
      texture: params.texture || 0,
      dlc: params.dlc || undefined,
    });
    return;
  }
  if (PROPS[itemId] != null) {
    player.setProp(PROPS[itemId], params.variation || 0, params.texture || 0);
    return;
  }
  if (itemId === 3) {
    allowArmour(player as Parameters<typeof allowArmour>[0]);
    player.armour = params.health || 0;
    player.setClothes(9, params.variation || 0, params.texture || 0, 0);
    return;
  }
  if (itemId === 7) {
    player.setClothes(3, params.torso || 0, params.tTexture || 0, 0);
    putCloth(player, {
      component: 11,
      drawable: params.variation || 0,
      texture: params.texture || 0,
      dlc: params.dlc || undefined,
    });
    if (params.undershirt != null) player.setClothes(8, params.undershirt, params.uTexture || 0, 0);
    if (params.decal != null) player.setClothes(10, params.decal, params.dTexture || 0, 0);
    return;
  }
  if (itemId === 14) {
    player.setClothes(1, params.variation || 0, params.texture || 0, 0);
  }
}

export function clearItem(player: { setClothes: (component: number, drawable: number, texture: number, palette?: number) => boolean; setProp: (component: number, drawable: number, texture: number) => boolean; armour: number }, itemId: number, gender: number, hair: number): void {
  const male = gender !== 1;
  if (itemId === 2) player.setClothes(7, 0, 0, 0);
  else if (itemId === 13) player.setClothes(5, 0, 0, 0);
  else if (itemId === 3) {
    player.armour = 0;
    player.setClothes(9, 0, 0, 0);
  } else if (itemId === 7) {
    player.setClothes(3, 15, 0, 0);
    player.setClothes(11, male ? 15 : 18, 0, 0);
    player.setClothes(8, male ? 15 : 3, 0, 0);
    player.setClothes(10, 0, 0, 0);
  } else if (itemId === 8) {
    player.setClothes(4, male ? 18 : 17, male ? 2 : 0, 0);
  } else if (itemId === 9) {
    player.setClothes(6, male ? 34 : 35, 0, 0);
  } else if (itemId === 14) {
    player.setClothes(2, hair, 0, 2);
    player.setClothes(1, 0, 0, 0);
  } else if (PROPS[itemId] != null) {
    player.setProp(PROPS[itemId], -1, 0);
  }
}

export async function applyWorn(player: Pick<Dresser, 'setClothes' | 'setProp' | 'setDlcClothes'>, characterId: number, gender: number): Promise<void> {
  applyNaked(player, gender);
  const worn = await loadWorn(characterId);
  for (const piece of worn.clothes) putCloth(player, piece);
  for (const piece of worn.props) player.setProp(piece.component, piece.drawable, piece.texture);
}
