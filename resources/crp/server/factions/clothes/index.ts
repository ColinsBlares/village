import type * as mint from 'mint-server';
import { table } from '../../core/db.js';
import { factionInfo } from '../index.js';
import { getSession } from '../../player/session.js';
import { notifyError } from '../../ui/notify.js';
import { armyUniform } from './generated/army.js';
import { fibUniform } from './generated/fib.js';
import { governmentUniform } from './generated/government.js';
import { policeUniform } from './generated/police.js';
import { hospitalEarsBug, hospitalUniform } from './hospital.js';
import { newsUniform } from './news.js';
import { issueClothes, type ClothSet } from './uniform.js';
import type { DbRow } from '../../player/session.js';

const CLOTHES_AMMO = 0;

const clothesRanks = new Map<number, { clothesIndex: number; rank: number }[]>();

type Builder = (character: { gender: number; factionId: number }, index: number) => ClothSet;

const builders: Record<string, Builder> = {
  government: governmentUniform,
  police: policeUniform,
  fib: fibUniform,
  army: armyUniform,
  hospital: (character, index) => hospitalUniform(character.gender, index),
  news: (character, index) => newsUniform(character.gender, index),
};

export async function loadClothesRanks(): Promise<void> {
  clothesRanks.clear();
  const rows = (await table('FactionClothesRank').findAll()) as DbRow[];
  for (const row of rows) {
    const factionId = Number(row.factionId);
    const list = clothesRanks.get(factionId) ?? [];
    list.push({ clothesIndex: Number(row.clothesIndex), rank: Number(row.rank) || 0 });
    clothesRanks.set(factionId, list);
  }
}

function rankNumber(factionId: number, rankId: number): number {
  return factionInfo(factionId)?.ranks.find((rank) => rank.id === rankId)?.rank ?? 0;
}

function rankTitle(factionId: number, rank: number): string {
  return factionInfo(factionId)?.ranks[rank - 1]?.name ?? String(rank);
}

export async function takeFactionClothes(player: mint.Player, kind: string, index: number): Promise<void> {
  const build = builders[kind];
  if (!build) return;
  const factionId = Number(getSession(player).character?.factionId) || 0;
  const character = getSession(player).character;
  if (!character || !factionId) return;
  const header = `Склад ${factionInfo(factionId)?.name ?? ''}`;
  const need = clothesRanks.get(factionId)?.find((row) => row.clothesIndex === index);
  const mine = rankNumber(factionId, Number(character.factionRank) || 0);
  if (need && need.rank > mine) return notifyError(player, `Доступно с ранга ${rankTitle(factionId, need.rank)}`, header);
  const set = build({ gender: Number(character.gender), factionId }, index);
  if (kind === 'hospital') hospitalEarsBug(set);
  await issueClothes(player, header, set, CLOTHES_AMMO);
}
