import * as mint from 'mint-server';
import { allowMove } from '../anticheat/index.js';
import { table } from '../core/db.js';
import { houseForCharacter } from '../houses/index.js';
import { giveItem } from '../inventory/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { addBank, addCash, removeBank, removeCash } from '../world/money.js';
import { placeVehicle, vehicleFacts, vehiclePrice, vehicleTitle } from '../vehicles/index.js';
import { canOwnAnother } from '../vehicles/sell.js';

interface Show {
  id: number;
  name: string;
  x: number;
  y: number;
  z: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  toX: number;
  toY: number;
  toZ: number;
  toH: number;
  returnX: number;
  returnY: number;
  returnZ: number;
  returnH: number;
}

interface Listing {
  id: number;
  showId: number;
  model: string;
  count: number;
  row: DbRow;
}

const shows = new Map<number, Show>();
const listings: Listing[] = [];
const inside = new WeakMap<mint.Player, number>();
let parkings: DbRow[] = [];

function plate(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let text = '';
  for (let i = 0; i < 3; i += 1) text += letters[Math.floor(Math.random() * letters.length)];
  return `${text}${100 + Math.floor(Math.random() * 900)}`;
}

function nearestParking(player: mint.Player): DbRow | null {
  let best: DbRow | null = null;
  let distance = Number.POSITIVE_INFINITY;
  for (const row of parkings) {
    const next = Math.hypot(Number(row.x) - player.pos.x, Number(row.y) - player.pos.y);
    if (next < distance) {
      distance = next;
      best = row;
    }
  }
  return best;
}

function answer(player: mint.Player, code: number, name = '', parking?: { name: string; x: number; y: number }): void {
  player.emit('crp:carshow:ans', code, name, parking ? JSON.stringify(parking) : '');
}

export async function loadCarShows(): Promise<number> {
  parkings = (await table('Parking').findAll()) as DbRow[];
  const rows = (await table('CarShow').findAll()) as DbRow[];
  for (const row of rows) {
    const show: Show = {
      id: Number(row.id),
      name: String(row.name ?? 'Автосалон'),
      x: Number(row.x),
      y: Number(row.y),
      z: Number(row.z),
      cameraX: Number(row.cameraX),
      cameraY: Number(row.cameraY),
      cameraZ: Number(row.cameraZ),
      toX: Number(row.toX),
      toY: Number(row.toY),
      toZ: Number(row.toZ),
      toH: Number(row.toH),
      returnX: Number(row.returnX),
      returnY: Number(row.returnY),
      returnZ: Number(row.returnZ),
      returnH: Number(row.returnH),
    };
    shows.set(show.id, show);
    new mint.PointBlip(Number(row.blipId) || 225, show.x, show.y, show.z, Number(row.blipColor) || 0, 0.8, true, 0, show.name);
    const shape = new mint.ColshapeSphere(show.x, show.y, show.z + 0.5, 2, 0, true);
    shape.setMeta('carShow', show.id);
  }
  const cars = (await table('CarList').findAll()) as DbRow[];
  for (const row of cars) {
    listings.push({
      id: Number(row.id),
      showId: Number(row.carShowId),
      model: String(row.vehiclePropertyModel),
      count: Number(row.count) || 0,
      row,
    });
  }
  listings.sort((a, b) => vehiclePrice(a.model) - vehiclePrice(b.model));
  setInterval(() => {
    for (const car of listings) {
      if (Math.floor(Math.random() * 100) > (Number(car.row.percentage) || 1)) continue;
      car.count += 1;
      car.row.count = car.count;
      void car.row.save();
    }
  }, 60 * 60 * 1000);
  mint.log(`crp: автосалонов ${shows.size}, моделей ${listings.length}`);
  return shows.size;
}

function open(player: mint.Player, show: Show): void {
  if (!getSession(player).character || player.vehicle || player.getSyncedMeta('crp:cuffs')) return;
  const list = listings.filter((car) => car.showId === show.id).map((car) => ({
    sqlId: car.id,
    vehiclePropertyModel: car.model,
    count: car.count,
    properties: {
      name: vehicleTitle(car.model),
      price: vehiclePrice(car.model),
      maxFuel: vehicleFacts(car.model).maxFuel,
      isElectric: vehicleFacts(car.model).isElectric,
    },
  }));
  if (!list.length) return;
  allowMove(player);
  player.dimension = player.id + 1;
  player.frozen = true;
  inside.set(player, show.id);
  player.emit('crp:carshow', JSON.stringify({ show, list }));
}

export function installCarShows(): void {
  mint.on('entityEnterColshape', (shape, entity) => {
    const id = shape.getMeta('carShow');
    const show = typeof id === 'number' ? shows.get(id) : undefined;
    if (show && entity instanceof mint.Player) open(entity, show);
  });
  mint.onClient('crp:carshow:close', (player) => {
    const show = shows.get(inside.get(player) ?? 0);
    inside.delete(player);
    if (!show || !player.valid) return;
    allowMove(player);
    player.frozen = false;
    player.dimension = 0;
    player.pos = new mint.Vector3(show.returnX, show.returnY, show.returnZ);
    player.rot = new mint.Vector3(0, 0, (show.returnH * Math.PI) / 180);
  });
  mint.onClient('crp:carshow:buy', async (player, carId, primary, secondary, method) => {
    const car = listings.find((item) => item.id === Number(carId));
    const character = getSession(player).character;
    if (!car || !character) return;
    const price = vehiclePrice(car.model);
    const payMethod = Number(method) || 0;
    const have = payMethod === 1 ? Number(character.bank) || 0 : Number(character.cash) || 0;
    if (have < price) return answer(player, 2);
    if (car.count < 1) return answer(player, 0);
    if (!(await canOwnAnother(player))) return answer(player, 5);
    const paid = payMethod === 1 ? await removeBank(player, price) : await removeCash(player, price);
    if (!paid) return answer(player, 3);
    const house = houseForCharacter(Number(character.id));
    const parking = nearestParking(player);
    const spot = house
      ? { x: Number(house.info.pickupX), y: Number(house.info.pickupY), z: Number(house.info.pickupZ), h: 0 }
      : { x: Number(parking?.carX ?? 0), y: Number(parking?.carY ?? 0), z: Number(parking?.carZ ?? 0), h: Number(parking?.carH ?? 0) };
    const created = (await table('Vehicle').create({
      key: 'private',
      owner: character.id,
      modelName: car.model,
      color1: Number(primary) || 0,
      color2: Number(secondary) || 0,
      x: spot.x,
      y: spot.y,
      z: spot.z,
      h: spot.h,
      parkingDate: house ? null : new Date(),
      parkingId: house ? null : parking?.id ?? null,
      plate: plate(),
      owners: 1,
      regDate: new Date(),
      fuel: 50,
    })) as DbRow;
    const keys = await giveItem(player, 33, { owner: character.id, vehId: created.id, vehName: vehicleTitle(car.model) });
    if (!keys) {
      if (typeof created.destroy === 'function') await created.destroy();
      if (payMethod === 1) await addBank(player, price);
      else await addCash(player, price);
      return answer(player, 7, 'Нет места для ключей');
    }
    car.count = Math.max(0, car.count - 1);
    car.row.count = car.count;
    await car.row.save();
    placeVehicle(created);
    const title = vehicleTitle(car.model);
    mint.emitClient(player, 'crp:chat', `!{#80c102}Вы успешно приобрели транспортное средство !{#009eec}${title}`);
    if (house) {
      mint.emitClient(player, 'crp:chat', '!{#f3c800}Транспорт доставлен !{#009eec}к вашему дому');
      answer(player, 6, title);
    } else {
      mint.emitClient(player, 'crp:chat', `!{#f3c800}Транспорт доставлен на подземную парковку !{#009eec}${String(parking?.name ?? 'Парковка')}`);
      mint.emitClient(player, 'crp:chat', '!{#f3c800}Местоположение парковки отмечено на карте');
      answer(player, 1, title, { name: String(parking?.name ?? 'Парковка'), x: spot.x, y: spot.y });
    }
  });
}
