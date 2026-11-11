import * as mint from 'mint-server';
import { db, table } from '../core/db.js';
import type { DbRow } from '../player/session.js';

export type Cloth = DbRow & {
  id: number;
  name: string;
  price: number;
  variation: number;
  textures: number[];
  sex: number;
  class: number;
  dlc?: string | null;
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

const ADDON_SHOES: { name: string; dlc: string; sex: number; class: number }[] = [
  { name: 'Ботинки', dlc: 'mp_m_mpfeet', sex: 1, class: 1 },
  { name: 'Ботинки', dlc: 'mp_m_mpfeet', sex: 1, class: 2 },
  { name: 'Ботинки', dlc: 'mp_m_mpfeet', sex: 1, class: 3 },
  { name: 'Ботинки', dlc: 'mp_f_mpfeet', sex: 0, class: 1 },
  { name: 'Ботинки', dlc: 'mp_f_mpfeet', sex: 0, class: 2 },
  { name: 'Ботинки', dlc: 'mp_f_mpfeet', sex: 0, class: 3 },
];

const ADDON_TOPS: { name: string; dlc: string; sex: number; class: number }[] = [
  { name: 'Куртка', dlc: 'mp_m_mpjbib', sex: 1, class: 1 },
  { name: 'Куртка', dlc: 'mp_m_mpjbib', sex: 1, class: 2 },
  { name: 'Куртка', dlc: 'mp_m_mpjbib', sex: 1, class: 3 },
];

async function ensureDlcColumn(tableName: string): Promise<void> {
  const sequelize = db.sequelize as { query: (sql: string) => Promise<[unknown[], unknown]> } | null;
  if (!sequelize) return;
  const [cols] = await sequelize.query(`SHOW COLUMNS FROM ${tableName} LIKE 'dlc'`);
  if (!Array.isArray(cols) || cols.length === 0) {
    await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN dlc VARCHAR(32) NULL`);
  }
}

async function ensureShoeDlc(): Promise<void> {
  await ensureDlcColumn('clothesshoes');
  const shoes = table(MODELS.shoes);
  for (const row of ADDON_SHOES) {
    const found = (await shoes.findOne({ where: { dlc: row.dlc, sex: row.sex, class: row.class } })) as Cloth | null;
    if (found) continue;
    await shoes.create({
      name: row.name,
      dlc: row.dlc,
      sex: row.sex,
      class: row.class,
      variation: 0,
      price: 7500,
      textures: [0],
      clime: [-20, 30],
    });
  }
}

async function ensureTopDlc(): Promise<void> {
  await ensureDlcColumn('clothestops');
  const tops = table(MODELS.tops);
  for (const row of ADDON_TOPS) {
    const found = (await tops.findOne({ where: { dlc: row.dlc, sex: row.sex, class: row.class } })) as Cloth | null;
    if (found) continue;
    await tops.create({
      name: row.name,
      dlc: row.dlc,
      sex: row.sex,
      class: row.class,
      variation: 0,
      price: 8500,
      textures: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      clime: [5, 30],
      pockets: [5, 5, 5, 5],
      torso: 4,
      undershirt: 15,
      uTextures: [0],
    });
  }
}

export async function loadClothes(): Promise<number> {
  await ensureShoeDlc();
  await ensureTopDlc();
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

export function clothDlcHash(dlc: string | null | undefined): number {
  return dlc ? mint.hash(dlc) : 0;
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
