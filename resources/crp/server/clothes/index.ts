import { table } from '../core/db.js';
import type { DbRow } from '../player/session.js';

export type Cloth = DbRow & {
  id: number;
  name: string;
  price: number;
  variation: number;
  textures: number[];
  sex: number;
  class: number;
  pockets?: unknown;
  clime?: unknown;
  torso?: number;
  undershirt?: number;
  uTextures?: unknown;
};

const GROUPS = ['bracelets', 'ears', 'glasses', 'hats', 'pants', 'shoes', 'ties', 'tops', 'watches'] as const;
const MODELS: Record<(typeof GROUPS)[number], string> = {
  bracelets: 'ClothesBracelet',
  ears: 'ClothesEar',
  glasses: 'ClothesGlasses',
  hats: 'ClothesHat',
  pants: 'ClothesPants',
  shoes: 'ClothesShoe',
  ties: 'ClothesTie',
  tops: 'ClothesTop',
  watches: 'ClothesWatch',
};

const list: Record<number, Record<string, Cloth[]>> = { 0: {}, 1: {} };

export async function loadClothes(): Promise<number> {
  let count = 0;
  for (const group of GROUPS) {
    list[0][group] = [];
    list[1][group] = [];
    const rows = (await table(MODELS[group]).findAll()) as Cloth[];
    for (const row of rows) {
      const sex = Number(row.sex) ? 1 : 0;
      list[sex][group].push(row);
    }
    count += rows.length;
  }
  return count;
}

export function clothesOf(sex: number, group: string): Cloth[] {
  return list[sex]?.[group] ?? [];
}

export const ITEM_IDS: Record<string, number> = {
  bracelets: 12,
  ears: 10,
  glasses: 1,
  watches: 11,
  ties: 2,
  hats: 6,
  tops: 7,
  pants: 8,
  shoes: 9,
};
