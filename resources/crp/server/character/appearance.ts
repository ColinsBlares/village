import type * as mint from 'mint-server';
import type { DbRow } from '../player/session.js';
import { applyWorn } from './clothes.js';
import { applyTattoos } from '../tattoo/index.js';

function mixOf(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.5;
  if (n > 1) return Math.max(0, Math.min(1, n / 100));
  return Math.max(0, Math.min(1, n));
}

function rowsOf(character: DbRow, key: string): DbRow[] {
  const value = character[key];
  return Array.isArray(value) ? (value as DbRow[]) : [];
}

/** Лицо из персонажа, одежда из надетых вещей инвентаря, как в Rage. */
export async function applyAppearance(player: mint.Player, character: DbRow): Promise<void> {
  const gender = Number(character.gender) === 1 ? 1 : 0;
  player.setHeadBlendData(
    Number(character.mother) || 21,
    Number(character.father) || 0,
    0,
    0,
    Number(character.skin) || 0,
    0,
    mixOf(character.similarity),
    1,
    0,
  );
  player.setEyeColor(Number(character.eyeColor) || 0);
  player.setHairColor(Number(character.hairColor) || 0);
  player.setHairHighlightColor(Number(character.hairHighlightColor) || 0);

  const features = rowsOf(character, 'Features').slice().sort((a, b) => Number(a.order) - Number(b.order));
  for (let i = 0; i < 20; i += 1) {
    player.setFaceFeature(i, Number(features[i]?.value) || 0);
  }

  player.setClothes(2, Number(character.hair) || 0, 0, 2);
  const appearances = rowsOf(character, 'Appearances').slice().sort((a, b) => Number(a.order) - Number(b.order));
  for (let i = 0; i < 11; i += 1) {
    const overlay = appearances[i];
    const value = Number(overlay?.value);
    if (!Number.isFinite(value) || value >= 255) continue;
    player.setHeadOverlay(i, value, Number(overlay?.opacity) || 0);
    const colorType = i === 5 || i === 8 ? 2 : 1;
    const color = overlayColor(character, i);
    player.setHeadOverlayColor(i, colorType, color, color);
  }

  await applyWorn(player, character.id, gender);
  await applyTattoos(player, character.id);
}

function overlayColor(character: DbRow, index: number): number {
  if (index === 1) return Number(character.beardColor) || 0;
  if (index === 2) return Number(character.eyebrowColor) || 0;
  if (index === 5) return Number(character.blushColor) || 0;
  if (index === 8) return Number(character.lipstickColor) || 0;
  if (index === 10) return Number(character.chestHairColor) || 0;
  return 0;
}
