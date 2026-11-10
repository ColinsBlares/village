import * as mint from 'mint-server';
import { allowMove } from '../anticheat/index.js';
import { table } from '../core/db.js';
import { houseForCharacter } from '../houses/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { hideVehicle, inGarage, markGarage, placeVehicle, vehicleState } from './index.js';

interface Slot {
  x: number;
  y: number;
  z: number;
  h: number;
  d: number;
  veh: number | null;
}

const slots = new WeakMap<mint.Player, Slot[]>();

async function layout(player: mint.Player): Promise<Slot[]> {
  const character = getSession(player).character;
  const house = character ? houseForCharacter(Number(character.id)) : null;
  if (!house) return [];
  const street: Slot = {
    x: Number(house.info.carX) || 0,
    y: Number(house.info.carY) || 0,
    z: Number(house.info.carZ) || 0,
    h: Number(house.info.carAngle) || 0,
    d: 0,
    veh: null,
  };
  const garageId = Number(house.garage?.id) || Number(house.interior.garageId) || 0;
  const rows = garageId ? ((await table('GaragePlace').findAll({ where: { garageId } })) as DbRow[]) : [];
  return [street, ...rows.map((row) => ({
    x: Number(row.x) || 0,
    y: Number(row.y) || 0,
    z: Number(row.z) || 0,
    h: Number(row.angle) || 0,
    d: Number(house.info.id),
    veh: null,
  }))];
}

function parkRow(row: DbRow, slot: Slot, inside: boolean): void {
  row.x = slot.x;
  row.y = slot.y;
  row.z = slot.z;
  row.h = slot.h;
  row.dimension = slot.d;
  row.parkingId = null;
  row.parkingDate = null;
  hideVehicle(Number(row.id));
  const vehicle = placeVehicle(row);
  if (vehicle) markGarage(vehicle, inside);
  void row.save();
}

function takeInside(list: Slot[], row: DbRow): boolean {
  if (list.length === 1 && list[0].d === 0) {
    list[0].veh = Number(row.id);
    parkRow(row, list[0], false);
    return true;
  }
  const index = list.findIndex((slot) => slot.veh == null && slot.d !== 0);
  if (index < 0) return false;
  list[index].veh = Number(row.id);
  parkRow(row, list[index], true);
  return true;
}

async function closestParking(player: mint.Player): Promise<DbRow | null> {
  const rows = (await table('Parking').findAll()) as DbRow[];
  let best: DbRow | null = null;
  let gap = Number.POSITIVE_INFINITY;
  for (const row of rows) {
    const next = Math.hypot(Number(row.x) - player.pos.x, Number(row.y) - player.pos.y);
    if (next < gap) {
      gap = next;
      best = row;
    }
  }
  return best;
}

export async function spawnOwnedVehicles(player: mint.Player): Promise<void> {
  const character = getSession(player).character;
  if (!character) return;
  const rows = (await table('Vehicle').findAll({ where: { key: 'private', owner: character.id } })) as DbRow[];
  const places = await layout(player);
  if (!places.length) {
    const parking = await closestParking(player);
    const now = new Date();
    for (const row of rows) {
      hideVehicle(Number(row.id));
      if (!row.parkingDate) {
        row.parkingDate = now;
        if (parking) row.parkingId = parking.id;
        await row.save();
      }
    }
    return;
  }
  slots.set(player, places);
  const limit = places.length === 1 ? places.length : places.length - 1;
  for (let i = 0; i < limit && i < rows.length; i += 1) {
    if (rows[i].parkingDate) continue;
    takeInside(places, rows[i]);
  }
}

export function installGarage(): void {
  mint.onClient('crp:veh:garage:leave', (player) => {
    const vehicle = player.vehicle;
    const character = getSession(player).character;
    const places = slots.get(player);
    const state = vehicle ? vehicleState(vehicle) : undefined;
    if (!vehicle || !character || !places || !state?.row || !inGarage(vehicle)) return;
    if (state.key !== 'private' || state.owner !== Number(character.id)) return;
    const street = places.find((slot) => slot.d === 0);
    if (!street) return;
    const sqlId = Number(state.row.id);
    const slot = places.find((item) => item.veh === sqlId);
    if (slot) slot.veh = null;
    allowMove(player);
    vehicle.dimension = 0;
    player.dimension = 0;
    vehicle.pos = new mint.Vector3(street.x, street.y, street.z);
    vehicle.rot = new mint.Vector3(0, 0, street.h);
    markGarage(vehicle, false);
    state.row.x = street.x;
    state.row.y = street.y;
    state.row.z = street.z;
    state.row.h = street.h;
    state.row.dimension = 0;
    void state.row.save();
    mint.emitClient(player, 'crp:veh:garage', false);
  });
}
