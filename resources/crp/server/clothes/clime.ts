import * as mint from 'mint-server';
import { godmodeOn } from '../anticheat/index.js';
import { table } from '../core/db.js';
import { farmShift } from '../farms/index.js';
import { rowParams } from '../inventory/items.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { setNeeds } from '../world/satiety.js';
import { weatherHere } from '../world/weather.js';

const WAIT = 2 * 60 * 1000;
const NAKED: Record<'head' | 'body' | 'legs' | 'feets', [number, number]> = {
  head: [10, 40],
  body: [21, 40],
  legs: [21, 40],
  feets: [15, 35],
};
const WEIGHT = { head: 0.4, body: 0.2, legs: 0.1, feets: 0.5 };
const SCALE = 0.5;
const SLOTS = [
  { itemId: 6, part: 'head' },
  { itemId: 7, part: 'body' },
  { itemId: 8, part: 'legs' },
  { itemId: 9, part: 'feets' },
] as const;

function span(raw: unknown, fallback: readonly [number, number]): [number, number] {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [fallback[0], fallback[1]];
    }
  }
  if (!Array.isArray(value) || value.length < 2) return [fallback[0], fallback[1]];
  const min = Number(value[0]);
  const max = Number(value[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [fallback[0], fallback[1]];
  return [min, max];
}

async function check(player: mint.Player): Promise<void> {
  const character = getSession(player).character;
  if (!character || !player.valid) return;
  if (player.vehicle || player.dimension || godmodeOn(player) || farmShift(player)) return;
  const rows = (await table('CharacterInventory').findAll({
    where: { playerId: character.id, parentId: null, itemId: SLOTS.map((slot) => slot.itemId) },
    include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
  })) as DbRow[];
  const temp = weatherHere(player).temperature;
  let damage = 0;
  let thirst = 0;
  for (const slot of SLOTS) {
    const worn = rows.find((row) => Number(row.itemId) === slot.itemId);
    const limits = span(worn ? rowParams(worn).clime : null, NAKED[slot.part]);
    const weight = WEIGHT[slot.part];
    if (temp < limits[0]) damage += weight * (limits[0] - temp) * SCALE;
    else if (temp > limits[1]) thirst += weight * (temp - limits[1]) * SCALE;
  }
  if (damage) player.health = Math.max(0, Math.round(Number(player.health) || 0) - Math.round(damage));
  if (thirst) setNeeds(player, Number(character.satiety) || 0, (Number(character.thirst) || 0) - thirst);
  const data: Record<string, boolean> = {};
  if (damage) data.cold = true;
  if (thirst) data.heat = true;
  if (Object.keys(data).length) cef(player, `mp.event.call('hud.setData', ${JSON.stringify(data)});`);
}

export function installClime(): void {
  setInterval(() => {
    for (const player of mint.Player.all) {
      if (!player.valid || !getSession(player).character) continue;
      void check(player);
    }
  }, WAIT);
}
