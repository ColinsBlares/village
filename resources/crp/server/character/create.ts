import { table } from '../core/db.js';
import { writeCrash } from '../core/log.js';
import { randomInteger } from '../core/utils.js';
import type { DbRow } from '../player/session.js';
import { streetSpawn } from './spawn.js';

const NAME = /^[A-Z][a-z]{1,14} [A-Z][a-z]{1,14}$/;

export interface CreatorInput {
  name: string;
  gender: number;
  mother: number;
  father: number;
  similarity: number;
  skin: number;
  hair: number;
  hairColor: number;
  hairHighlightColor?: number;
  eyebrowColor?: number;
  beardColor?: number;
  eyeColor?: number;
  blushColor?: number;
  lipstickColor?: number;
  chestHairColor?: number;
  Features?: { value?: number; order?: number }[];
  Appearances?: { value?: number; opacity?: number; order?: number }[];
}

export function isCharacterName(name: string): boolean {
  return NAME.test(name);
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function code(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let value = '';
  for (let i = 0; i < 8; i += 1) {
    const index = Math.min(alphabet.length - 1, Math.max(0, randomInteger(0, alphabet.length - 1)));
    value += alphabet[index];
  }
  return value;
}

function clampFloat(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

type BulkTable = { bulkCreate(rows: object[]): Promise<DbRow[]> };

export async function createCharacter(accountId: number, input: CreatorInput): Promise<DbRow> {
  const point = streetSpawn();
  const gender = input.gender === 1 ? 1 : 0;
  const character = (await table('Character').create({
    accountId,
    name: input.name,
    gender,
    father: clamp(input.father, 0, 45, 0),
    mother: clamp(input.mother, 0, 45, 21),
    similarity: clamp(input.similarity, 0, 100, 50),
    skin: clamp(input.skin, 0, 45, 0),
    hair: clamp(input.hair, 0, 73, 0),
    hairColor: clamp(input.hairColor, 0, 63, 0),
    hairHighlightColor: clamp(input.hairHighlightColor, 0, 63, 0),
    eyebrowColor: clamp(input.eyebrowColor, 0, 63, 0),
    beardColor: clamp(input.beardColor, 0, 63, 0),
    eyeColor: clamp(input.eyeColor, 0, 31, 0),
    blushColor: clamp(input.blushColor, 0, 63, 0),
    lipstickColor: clamp(input.lipstickColor, 0, 63, 0),
    chestHairColor: clamp(input.chestHairColor, 0, 63, 0),
    cash: 300,
    x: point.x,
    y: point.y,
    z: point.z,
    h: point.h,
  })) as DbRow;

  const features = Array.from({ length: 20 }, (_, order) => {
    const src = input.Features?.[order];
    return { characterId: character.id, value: clampFloat(src?.value, -1, 1, 0), order };
  });
  const appearances = Array.from({ length: 11 }, (_, order) => {
    const src = input.Appearances?.[order];
    return {
      characterId: character.id,
      value: clamp(src?.value, 0, 255, 255),
      opacity: clampFloat(src?.opacity, 0, 1, 1),
      order,
    };
  });
  character.Features = await (table('Feature') as unknown as BulkTable).bulkCreate(features);
  character.Appearances = await (table('Appearance') as unknown as BulkTable).bulkCreate(appearances);
  await table('CharacterSettings').create({ characterId: character.id }).catch((err: unknown) => {
    writeCrash('character.settings', err);
  });
  await table('Promocode').create({ characterId: character.id, promocode: code() }).catch((err: unknown) => {
    writeCrash('character.promocode', err);
  });
  return character;
}
