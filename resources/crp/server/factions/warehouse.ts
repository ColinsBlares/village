import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { addAttachment } from '../attaches/index.js';
import { stopAnimation } from '../animations/index.js';
import { factionInfo } from './index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess, notifyWarning } from '../ui/notify.js';
import { isTrunkOpen, vehicleById, vehicleState } from '../vehicles/index.js';
import { installHolderColshape } from '../inventory/holder.js';

const BOX = 500;
const VEH_MAX = 3000;
const AMMO_MODELS = new Set(['barracks', 'barracks3', 'moonbeam', 'youga2', 'insurgent2', 'riot']);
const MEDICINE_MODELS = new Set(['granger', 'fbi2']);

interface Stock {
  id: number;
  name: string;
  ammoRank: number;
  blipColor: number;
  row: DbRow;
  label: mint.TextLabel | null;
  warehouse: { x: number; y: number; z: number } | null;
}

interface Carry {
  type: 'ammo' | 'medicines';
}

interface Cargo {
  type: 'ammo' | 'medicines';
  count: number;
}

const stocks = new Map<number, Stock>();
const carry = new WeakMap<mint.Player, Carry>();
const cargo = new WeakMap<mint.Vehicle, Cargo>();
const supply = new WeakMap<mint.Player, 'ammo' | 'medicines'>();
const site = new WeakMap<mint.Player, number>();

function boxName(type: 'ammo' | 'medicines'): string {
  return type === 'ammo' ? 'ammoBox' : 'medicinesBox';
}

function prompt(player: mint.Player, name: string | null): void {
  cef(player, name ? `prompt.showByName(${JSON.stringify(name)});` : 'prompt.hide();');
}

function labelText(row: DbRow): string {
  const lines: string[] = [];
  if (Number(row.maxAmmo)) lines.push(`Боеприпасы: ${row.ammo} из ${row.maxAmmo}`);
  if (Number(row.maxMedicines)) lines.push(`Медикаменты: ${row.medicines} из ${row.maxMedicines}`);
  return lines.join('\n');
}

function army(id: number): boolean {
  return id === 6;
}

function hospital(id: number): boolean {
  return id === 5;
}

function mafia(id: number): boolean {
  return id >= 12 && id <= 14;
}

function band(id: number): boolean {
  return id >= 8 && id <= 11;
}

async function handsBusy(player: mint.Player): Promise<boolean> {
  const character = getSession(player).character;
  if (!character) return true;
  const item = await table('CharacterInventory').findOne({
    where: { playerId: character.id, parentId: null, index: 13 },
  });
  return item != null;
}

function clearBox(player: mint.Player): void {
  const current = carry.get(player);
  carry.delete(player);
  if (current && player.valid) addAttachment(player, boxName(current.type), true);
  if (player.valid) stopAnimation(player);
}

function giveBox(player: mint.Player, type: 'ammo' | 'medicines'): void {
  clearBox(player);
  addAttachment(player, boxName(type));
  carry.set(player, { type });
}

async function setCount(stock: Stock, type: 'ammo' | 'medicines', count: number): Promise<void> {
  if (type === 'ammo') stock.row.ammo = count;
  else stock.row.medicines = count;
  await stock.row.save();
  if (stock.label?.valid) stock.label.text = labelText(stock.row);
}

function canTake(player: mint.Player, type: 'ammo' | 'medicines', stock: Stock): boolean {
  const character = getSession(player).character;
  const mine = Number(character?.factionId) || 0;
  if (type === 'ammo' && band(mine) && army(stock.id)) return true;
  const gate = factionInfo(stock.id)?.ranks[(stock.ammoRank || 1) - 1];
  return mine === stock.id && gate != null && Number(character?.factionRank) >= gate.id;
}

async function takeSupply(player: mint.Player): Promise<void> {
  const type = supply.get(player);
  if (!type || player.vehicle) return;
  const header = type === 'ammo' ? 'Склад боеприпасов' : 'Склад медикаментов';
  const mine = Number(getSession(player).character?.factionId) || 0;
  if (type === 'ammo' && !army(mine) && !mafia(mine)) return notifyError(player, 'Нет доступа', header);
  if (type === 'medicines' && !hospital(mine)) return notifyError(player, 'Нет доступа', header);
  if (carry.has(player)) return notifyError(player, 'Нельзя нести больше', header);
  if (await handsBusy(player)) return notifyError(player, 'Освободите руки', header);
  giveBox(player, type);
}

async function useFactionWarehouse(player: mint.Player): Promise<void> {
  const stock = stocks.get(site.get(player) ?? 0);
  if (!stock || player.vehicle) return;
  const header = `Склад ${stock.name}`;
  const current = carry.get(player)?.type;
  if (current) {
    const have = Number(current === 'ammo' ? stock.row.ammo : stock.row.medicines);
    const max = Number(current === 'ammo' ? stock.row.maxAmmo : stock.row.maxMedicines);
    await setCount(stock, current, have + BOX);
    clearBox(player);
    const now = Number(current === 'ammo' ? stock.row.ammo : stock.row.medicines);
    notifyInfo(player, `${current === 'ammo' ? 'Боеприпасы' : 'Медикаменты'}: ${now} из ${max} ед.`, header);
    if (now === max) notifyWarning(player, 'Склад заполнен', header);
    return;
  }
  const type: 'ammo' | 'medicines' | '' = Number(stock.row.maxAmmo) ? 'ammo' : Number(stock.row.maxMedicines) ? 'medicines' : '';
  if (!type) return notifyError(player, 'Подходящий товар не найден', header);
  const have = Number(type === 'ammo' ? stock.row.ammo : stock.row.medicines);
  if (have < BOX) return notifyError(player, 'Склад пустой', header);
  if (!canTake(player, type, stock)) return notifyError(player, 'Нет доступа', header);
  await setCount(stock, type, have - BOX);
  giveBox(player, type);
}

function paintCargo(vehicle: mint.Vehicle, load: Cargo | null): void {
  if (!load || load.count <= 0) {
    cargo.delete(vehicle);
    vehicle.deleteStreamSyncedMeta('crp:cargo');
    vehicle.deleteStreamSyncedMeta('crp:unload');
    return;
  }
  cargo.set(vehicle, load);
  vehicle.setStreamSyncedMeta('crp:cargo', `${load.count} из ${VEH_MAX} ед.`);
}

async function putCargo(player: mint.Player, vehicle: mint.Vehicle): Promise<void> {
  const header = 'Погрузка ящика';
  const state = vehicleState(vehicle);
  const type = carry.get(player)?.type;
  if (!state?.row || !type) return;
  if (player.pos.distanceTo(vehicle.pos) > 10) return notifyError(player, 'Авто далеко', header);
  if (state.key !== 'faction') return notifyError(player, `Авто ${state.row.modelName} не принадлежит организации`, header);
  const model = String(state.row.modelName ?? '').toLowerCase();
  const allowed = type === 'ammo' ? AMMO_MODELS : MEDICINE_MODELS;
  if (!allowed.has(model)) return notifyError(player, `Авто не предназначено для перевоза ${type === 'ammo' ? 'боеприпасов' : 'медикаментов'}`, header);
  const load = cargo.get(vehicle) ?? { type, count: 0 };
  if (load.type !== type) return notifyError(player, 'Авто содержит другой тип товара', header);
  load.count = Math.max(0, Math.min(VEH_MAX, load.count + BOX));
  paintCargo(vehicle, load);
  clearBox(player);
  if (load.count === VEH_MAX) notifyWarning(player, 'Багажник заполнен', header);
}

async function takeCargo(player: mint.Player, vehicle: mint.Vehicle): Promise<void> {
  const header = 'Взятие ящика';
  const state = vehicleState(vehicle);
  const load = cargo.get(vehicle);
  if (!state?.row) return notifyError(player, 'Авто не найдено', header);
  if (player.pos.distanceTo(vehicle.pos) > 10) return notifyError(player, 'Авто далеко', header);
  if (state.key !== 'faction') return notifyError(player, `Авто ${state.row.modelName} не принадлежит организации`, header);
  if (!load?.count) return notifyError(player, 'Багажник пустой', header);
  if (carry.has(player)) return notifyError(player, 'Нельзя нести больше', header);
  giveBox(player, load.type);
  load.count -= BOX;
  paintCargo(vehicle, load.count > 0 ? load : null);
}

export async function atBoot(player: mint.Player, vehicle: mint.Vehicle): Promise<void> {
  if (!player.valid || player.vehicle) return;
  if (player.pos.distanceTo(vehicle.pos) > 10) return;
  if (carry.has(player)) {
    if (!isTrunkOpen(vehicle)) return notifyWarning(player, 'Для погрузки ящика откройте багажник');
    await putCargo(player, vehicle);
    return;
  }
  const load = cargo.get(vehicle);
  if (!load?.count) return;
  const state = vehicleState(vehicle);
  const mine = Number(getSession(player).character?.factionId) || 0;
  if (vehicle.getStreamSyncedMeta('crp:unload') !== true) {
    if (!state || state.key !== 'faction' || state.owner !== mine) return;
    cef(player, `offerDialog.show('vehicle_unload', ${JSON.stringify({ type: load.type, vehId: vehicle.id })});`);
    return;
  }
  await takeCargo(player, vehicle);
}

export async function spendStock(factionId: number, type: 'ammo' | 'medicines', amount: number): Promise<boolean> {
  const stock = stocks.get(factionId);
  if (!stock) return false;
  const have = Number(type === 'ammo' ? stock.row.ammo : stock.row.medicines);
  if (amount > 0 && have < amount) return false;
  await setCount(stock, type, have - amount);
  return true;
}

export function placesFor(factionId: number): { name: string; sprite: number; color: number; x: number; y: number; z: number }[] {
  const stock = stocks.get(factionId);
  if (!stock) return [];
  const storageSprite = [0, 567, 175, 175, 175, 498, 175, 498, 110, 110, 110, 110, 110, 110, 110][factionId] ?? 175;
  const places: { name: string; sprite: number; color: number; x: number; y: number; z: number }[] = [];
  if (Number(stock.row.sX) || Number(stock.row.sY)) {
    places.push({ name: 'Инвентарь организации', sprite: storageSprite, color: stock.blipColor, x: Number(stock.row.sX), y: Number(stock.row.sY), z: Number(stock.row.sZ) });
  }
  if (stock.warehouse) {
    places.push({ name: 'Склад организации', sprite: 478, color: stock.blipColor, x: stock.warehouse.x, y: stock.warehouse.y, z: stock.warehouse.z });
  }
  if (Number(stock.row.hX) || Number(stock.row.hY)) {
    places.push({ name: 'Личные вещи', sprite: 73, color: stock.blipColor, x: Number(stock.row.hX), y: Number(stock.row.hY), z: Number(stock.row.hZ) });
  }
  return places;
}

function marker(x: number, y: number, z: number, scale: number, r: number, g: number, b: number, a: number, dimension: number): void {
  new mint.Marker(
    mint.MarkerType.MarkerCylinder,
    x, y, z,
    0, 0, 0, 0, 0, 0,
    scale, scale, scale,
    a, r, g, b,
    dimension,
  );
}

export async function loadWarehouses(): Promise<number> {
  const rows = (await table('Faction').findAll()) as DbRow[];
  for (const row of rows) {
    const id = Number(row.id);
    const stock: Stock = {
      id,
      name: String(row.name ?? ''),
      ammoRank: Number(row.ammoRank) || 1,
      blipColor: Number(row.blipColor) || 0,
      row,
      label: null,
      warehouse: null,
    };
    stocks.set(id, stock);
    if (Number(row.hX)) {
      installHolderColshape(
        id,
        stock.name,
        Number(row.hX),
        Number(row.hY),
        Number(row.hZ) - 1,
        Number(row.hD) || 0,
      );
    }
    if (!Number(row.wX)) continue;
    const x = Number(row.wX);
    const y = Number(row.wY);
    const z = Number(row.wZ) - 1;
    const dimension = Number(row.wD) || 0;
    stock.warehouse = { x, y, z: Number(row.wZ) };
    marker(x, y, z, 0.5, 0, 187, 255, 70, dimension);
    try {
      stock.label = new mint.TextLabel(
        labelText(row) || stock.name,
        'arial',
        0.35,
        0.35,
        new mint.Vector3(x, y, z + 1.5),
        new mint.Vector3(0, 0, 0),
        new mint.RGBA(255, 255, 255, 255),
        0,
        new mint.RGBA(0, 0, 0, 180),
        dimension,
        10,
      );
    } catch {
      stock.label = null;
    }
    const shape = new mint.ColshapeSphere(x, y, z, 1.5, dimension, true);
    setColshapeHandlers(shape, {
      onEnter: (player) => {
        if (player.vehicle) return;
        site.set(player, id);
        const type = carry.get(player)?.type;
        prompt(player, type ? `put_${type}box` : 'take_ammobox');
      },
      onExit: (player) => {
        site.delete(player);
        prompt(player, null);
      },
    });
  }
  marker(211.51, -3091.53, 6.01, 0.5, 255, 187, 0, 100, 0);
  new mint.PointBlip(473, 211.51, -3091.53, 7.01, 1, 0.8, true, 0, 'Боеприпасы');
  const ammoShape = new mint.ColshapeSphere(211.51, -3091.53, 6.01, 1.5, 0, true);
  setColshapeHandlers(ammoShape, {
    onEnter: (player) => {
      if (player.vehicle) return;
      const mine = Number(getSession(player).character?.factionId) || 0;
      if (!army(mine) && !mafia(mine)) return notifyError(player, 'Нет доступа', 'Склад боеприпасов');
      supply.set(player, 'ammo');
      prompt(player, 'take_ammobox');
    },
    onExit: (player) => {
      if (supply.get(player) === 'ammo') supply.delete(player);
      prompt(player, null);
    },
  });
  marker(3608, 3720.03, 27.69, 2, 255, 187, 0, 100, 0);
  new mint.PointBlip(153, 3608, 3720.03, 29.69, 1, 0.8, true, 0, 'Медикаменты');
  const medShape = new mint.ColshapeSphere(3608, 3720.03, 27.69, 2.5, 0, true);
  setColshapeHandlers(medShape, {
    onEnter: (player) => {
      if (player.vehicle) return;
      const mine = Number(getSession(player).character?.factionId) || 0;
      if (!hospital(mine)) return notifyError(player, 'Нет доступа', 'Склад медикаментов');
      supply.set(player, 'medicines');
      prompt(player, 'take_medicinesbox');
    },
    onExit: (player) => {
      if (supply.get(player) === 'medicines') supply.delete(player);
      prompt(player, null);
    },
  });
  mint.log(`crp: склады фракций ${[...stocks.values()].filter((stock) => stock.warehouse).length}`);
  return stocks.size;
}

export function installWarehouse(): void {
  mint.onClient('crp:shop:use', (player) => {
    if (supply.has(player)) void takeSupply(player);
    else if (site.has(player)) void useFactionWarehouse(player);
  });
  mint.onClient('crp:faction:boot', (player, vehicleId) => {
    const vehicle = vehicleById(vehicleId);
    if (vehicle) void atBoot(player, vehicle);
  });
  mint.onClient('crp:faction:unload', (player, vehicleId) => {
    const header = 'Разгрузка авто';
    const vehicle = vehicleById(vehicleId);
    const state = vehicle ? vehicleState(vehicle) : undefined;
    const load = vehicle ? cargo.get(vehicle) : undefined;
    const mine = Number(getSession(player).character?.factionId) || 0;
    if (!vehicle || !state?.row) return notifyError(player, 'Авто не найдено', header);
    if (player.pos.distanceTo(vehicle.pos) > 10) return notifyError(player, 'Авто далеко', header);
    if (state.key !== 'faction' || state.owner !== mine) return notifyError(player, `Авто не принадлежит ${stocks.get(mine)?.name ?? 'организации'}`, header);
    if (!load?.count) return notifyError(player, 'Авто не содержит ящики', header);
    vehicle.setStreamSyncedMeta('crp:unload', true);
    notifySuccess(player, 'Разгрузка началась', header);
  });
  mint.onClient('crp:attach:lost', (player, name) => {
    if (name !== 'ammoBox' && name !== 'medicinesBox') return;
    clearBox(player);
  });
  mint.on('playerDisconnect', (player) => {
    clearBox(player);
    supply.delete(player);
    site.delete(player);
  });
}
