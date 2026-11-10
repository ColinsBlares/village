import * as mint from 'mint-server';
import { allowMove } from '../anticheat/index.js';
import { table } from '../core/db.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { removeBank, removeCash } from '../world/money.js';
import { vehicleState } from '../vehicles/index.js';
import { onBizPrice } from '../bizes/prices.js';

const REPAIR = 125;
const COLOR = 100;
const RATES: Record<number, number> = { 11: 0.02, 12: 0.02, 13: 0.01, 15: 0.01, 16: 0.03 };
const NAMES: Record<number, string> = {
  11: 'engineType', 12: 'brakeType', 13: 'transmissionType', 15: 'suspensionType', 16: 'armourType',
  18: 'turbo', 0: 'spoiler', 1: 'frontBumper', 2: 'rearBumper', 3: 'sideSkirt', 4: 'exhaust',
  5: 'frame', 6: 'grille', 7: 'hood', 8: 'fender', 9: 'rightFender', 10: 'roof', 23: 'frontWheels',
  48: 'livery', 55: 'windowTint', 22: 'xenon',
};

interface Shop {
  id: number;
  bizId: number | null;
  multiplier: number;
  x: number;
  y: number;
  z: number;
  tuneX: number;
  tuneY: number;
  tuneZ: number;
  tuneH: number;
  returnX: number;
  returnY: number;
  returnZ: number;
  returnH: number;
}

const shops = new Map<number, Shop>();
const inside = new WeakMap<mint.Player, number>();

function note(player: mint.Player, text: string): void {
  cef(player, `selectMenu.loader = false; notifications.error(${JSON.stringify(text)}, 'LSC');`);
}

function ok(player: mint.Player, text: string): void {
  cef(player, `selectMenu.loader = false; notifications.success(${JSON.stringify(text)}, 'LSC');`);
}

function priceOf(type: number, index: number, vehPrice: number, multiplier: number): number {
  const rate = RATES[type] ?? 0.005;
  return Math.trunc(rate * vehPrice * (index + 1) * multiplier);
}

async function pay(player: mint.Player, method: number, sum: number): Promise<boolean> {
  return method === 1 ? removeBank(player, sum) : removeCash(player, sum);
}

function afford(player: mint.Player, method: number, sum: number): boolean {
  const character = getSession(player).character;
  if (!character) return false;
  const have = method === 1 ? Number(character.bank) || 0 : Number(character.cash) || 0;
  return have >= sum;
}

async function saveMod(vehicleId: number, field: string, index: number): Promise<void> {
  let row = (await table('VehicleTuning').findOne({ where: { vehicleId } })) as DbRow | null;
  if (!row) row = (await table('VehicleTuning').create({ vehicleId })) as DbRow;
  row[field] = index;
  await row.save();
}

export async function applySavedMods(vehicle: mint.Vehicle, vehicleId: number): Promise<void> {
  const row = (await table('VehicleTuning').findOne({ where: { vehicleId } })) as DbRow | null;
  if (!row || !vehicle.valid) return;
  for (const [type, field] of Object.entries(NAMES)) {
    const index = Number(row[field]);
    if (!Number.isFinite(index) || index < 0) continue;
    vehicle.setMod(Number(type) as mint.VehicleModType, index);
  }
}

export async function loadTuning(): Promise<number> {
  const rows = (await table('LosSantosCustoms').findAll()) as DbRow[];
  for (const row of rows) {
    const shop: Shop = {
      id: Number(row.id),
      bizId: row.bizId == null ? null : Number(row.bizId),
      multiplier: Number(row.priceMultiplier) || 1,
      x: Number(row.x), y: Number(row.y), z: Number(row.z),
      tuneX: Number(row.tuneX), tuneY: Number(row.tuneY), tuneZ: Number(row.tuneZ), tuneH: Number(row.tuneH),
      returnX: Number(row.returnX), returnY: Number(row.returnY), returnZ: Number(row.returnZ), returnH: Number(row.returnH),
    };
    shops.set(shop.id, shop);
    const shape = new mint.ColshapeSphere(shop.x, shop.y, shop.z, 4, 0, true);
    shape.setMeta('lsc', shop.id);
  }
  onBizPrice((bizId, key, value) => {
    if (key !== 'priceMultiplier') return;
    for (const shop of shops.values()) if (shop.bizId === bizId) shop.multiplier = value;
  });
  mint.log(`crp: LSC ${shops.size}`);
  return shops.size;
}

function ownCar(player: mint.Player): { vehicle: mint.Vehicle; price: number; id: number } | null {
  const vehicle = player.vehicle;
  const state = vehicle ? vehicleState(vehicle) : undefined;
  const character = getSession(player).character;
  if (!vehicle || !state?.row || !character) return null;
  if (state.key !== 'private' || state.owner !== Number(character.id)) return null;
  if (![0, 3].includes(state.props.vehType)) return null;
  if (String(state.row.modelName).toLowerCase() === 'caddy') return null;
  return { vehicle, price: state.props.price, id: Number(state.row.id) };
}

export function installTuning(): void {
  mint.on('entityEnterColshape', (shape, entity) => {
    const id = shape.getMeta('lsc');
    const shop = typeof id === 'number' ? shops.get(id) : undefined;
    if (!shop || !(entity instanceof mint.Player)) return;
    if (!entity.vehicle) {
      cef(entity, `prompt.show(${JSON.stringify('Вы должны находиться в транспорте')});`);
      return;
    }
    const car = ownCar(entity);
    if (!car) {
      cef(entity, `prompt.show(${JSON.stringify('Этот транспорт нельзя модифицировать')});`);
      return;
    }
    const passengers = mint.Player.all.filter((entry) => entry.vehicle === car.vehicle);
    if (passengers.length > 1) {
      cef(entity, `prompt.show(${JSON.stringify('Нельзя тюнинговать транспорт с пассажирами')});`);
      return;
    }
    allowMove(entity);
    car.vehicle.dimension = entity.id + 10000;
    entity.dimension = car.vehicle.dimension;
    car.vehicle.pos = new mint.Vector3(shop.tuneX, shop.tuneY, shop.tuneZ);
    car.vehicle.rot = new mint.Vector3(0, 0, (shop.tuneH * Math.PI) / 180);
    inside.set(entity, shop.id);
    entity.emit('crp:tuning', JSON.stringify({
      id: shop.id,
      price: car.price,
      multiplier: shop.multiplier,
      repair: Math.trunc(REPAIR * shop.multiplier),
      color: Math.trunc(COLOR * shop.multiplier),
    }));
  });
  mint.onClient('crp:tuning:end', (player) => {
    const shop = shops.get(inside.get(player) ?? 0);
    inside.delete(player);
    allowMove(player);
    const vehicle = player.vehicle;
    if (!shop || !vehicle) {
      player.dimension = 0;
      return;
    }
    vehicle.dimension = 0;
    player.dimension = 0;
    vehicle.pos = new mint.Vector3(shop.returnX, shop.returnY, shop.returnZ);
    vehicle.rot = new mint.Vector3(0, 0, (shop.returnH * Math.PI) / 180);
  });
  mint.onClient('crp:tuning:color', async (player, primary, secondary, method) => {
    const shop = shops.get(inside.get(player) ?? 0);
    const car = ownCar(player);
    const payMethod = Number(method) || 0;
    if (!shop || !car) return note(player, 'Это не ваш транспорт');
    const price = Math.trunc(COLOR * shop.multiplier);
    if (!afford(player, payMethod, price)) return note(player, 'Недостаточно денег');
    if (!(await pay(player, payMethod, price))) return note(player, 'Операция не прошла');
    car.vehicle.primaryColor = Number(primary) || 0;
    car.vehicle.secondaryColor = Number(secondary) || 0;
    const state = vehicleState(car.vehicle);
    if (state?.row) {
      state.row.color1 = car.vehicle.primaryColor;
      state.row.color2 = car.vehicle.secondaryColor;
      await state.row.save();
    }
    ok(player, 'Цвет изменён');
  });
  mint.onClient('crp:tuning:buy', async (player, typeRaw, indexRaw, method) => {
    const shop = shops.get(inside.get(player) ?? 0);
    const car = ownCar(player);
    const type = Number(typeRaw);
    const index = Number(indexRaw);
    const payMethod = Number(method) || 0;
    const field = NAMES[type];
    if (!shop || !car || !field || index < -1) return note(player, 'Деталь недоступна');
    const price = index < 0 ? 0 : priceOf(type, index, car.price, shop.multiplier);
    if (price > 0 && !afford(player, payMethod, price)) return note(player, 'Недостаточно денег');
    if (price > 0 && !(await pay(player, payMethod, price))) return note(player, 'Операция не прошла');
    car.vehicle.setMod(type as mint.VehicleModType, index);
    await saveMod(car.id, field, index);
    ok(player, 'Деталь установлена');
  });
  mint.onClient('crp:tuning:repair', async (player, method) => {
    const shop = shops.get(inside.get(player) ?? 0);
    const car = ownCar(player);
    const payMethod = Number(method) || 0;
    if (!shop || !car) return note(player, 'Это не ваш транспорт');
    const price = Math.trunc(REPAIR * shop.multiplier);
    if (!afford(player, payMethod, price)) return note(player, 'Недостаточно денег');
    if (!(await pay(player, payMethod, price))) return note(player, 'Операция не прошла');
    car.vehicle.repair();
    ok(player, 'Транспорт отремонтирован');
  });
}
