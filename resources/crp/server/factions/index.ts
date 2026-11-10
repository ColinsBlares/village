import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { writeCrash } from '../core/log.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import type { DbRow } from '../player/session.js';
import { getSession } from '../player/session.js';

interface FactionInfo {
  id: number;
  name: string;
  inviteRank: number;
  uvalRank: number;
  giveRankRank: number;
  ranks: { id: number; rank: number; name: string; pay: number }[];
}

const factions = new Map<number, FactionInfo>();

function ranksOf(row: DbRow): FactionInfo['ranks'] {
  const list = (row.ranks ?? row.FactionRanks ?? []) as DbRow[];
  return list
    .map((rank) => ({
      id: Number(rank.id),
      rank: Number(rank.rank) || 0,
      name: String(rank.name ?? ''),
      pay: Number(rank.pay) || 0,
    }))
    .sort((a, b) => a.id - b.id);
}

export async function loadFactions(): Promise<number> {
  let rows: DbRow[] = [];
  try {
    rows = (await table('Faction').findAll({
      include: [{ model: table('FactionRank'), as: 'ranks' }],
    })) as DbRow[];
  } catch (err) {
    writeCrash('factions.ranks', err);
    rows = (await table('Faction').findAll()) as DbRow[];
  }
  factions.clear();
  for (const row of rows) {
    const id = Number(row.id);
    const x = Number(row.x);
    const y = Number(row.y);
    const z = Number(row.z);
    factions.set(id, {
      id,
      name: String(row.name ?? `Организация ${id}`),
      inviteRank: Number(row.inviteRank) || 1,
      uvalRank: Number(row.uvalRank) || 1,
      giveRankRank: Number(row.giveRankRank) || 1,
      ranks: ranksOf(row),
    });
    if (!Number.isFinite(x) || !Number.isFinite(y) || (x === 0 && y === 0)) continue;
    try {
      new mint.Marker(
        mint.MarkerType.MarkerCylinder,
        x, y, z - 1,
        0, 0, 0, 0, 0, 0,
        0.5, 0.5, 0.5,
        70, 255, 187, 0,
        0,
      );
      const blip = new mint.PointBlip(Number(row.blip) || 1, x, y, z, Number(row.blipColor) || 0, 0.8, true, 0, String(row.name ?? ''));
      void blip;
      const shape = new mint.ColshapeSphere(x, y, z, 1.5, 0, true);
      setColshapeHandlers(shape, {
        onEnter: (player) => {
          const mine = Number(getSession(player).character?.factionId) || 0;
          const text = mine === id
            ? `!{#ffdf29}${row.name}. Планшет — P`
            : `!{#cccccc}${row.name}`;
          mint.emitClient(player, 'crp:chat', text);
        },
      });
    } catch (err) {
      writeCrash(`factions.marker.${id}`, err);
    }
  }
  return factions.size;
}

export function factionInfo(id: number): FactionInfo | undefined {
  return factions.get(id);
}

export function rankNumber(player: mint.Player): number {
  const character = getSession(player).character;
  const faction = factions.get(Number(character?.factionId) || 0);
  return faction?.ranks.find((rank) => rank.id === Number(character?.factionRank))?.rank ?? 0;
}

export function factionKind(id: number): string | null {
  if (id === 1) return 'government';
  if (id === 2 || id === 3) return 'police';
  if (id === 4) return 'fib';
  if (id === 5) return 'hospital';
  if (id === 6) return 'army';
  if (id === 7) return 'news';
  if (id >= 8 && id <= 11) return 'bands';
  if (id >= 12 && id <= 14) return 'mafia';
  return null;
}

export function factionName(player: mint.Player): string {
  const id = Number(getSession(player).character?.factionId) || 0;
  return factions.get(id)?.name ?? '';
}

export function rankName(player: mint.Player): string {
  const character = getSession(player).character;
  const faction = factions.get(Number(character?.factionId) || 0);
  return faction?.ranks.find((rank) => rank.id === Number(character?.factionRank))?.name ?? '';
}

export async function openFaction(player: mint.Player): Promise<void> {
  const mod = await import('../mapcase/tablet.js');
  await mod.openTablet(player);
}
