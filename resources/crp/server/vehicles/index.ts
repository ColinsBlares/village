import * as mint from 'mint-server';
import { table } from '../core/db.js';
import type { DbRow } from '../player/session.js';
import { getSession } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess } from '../ui/notify.js';
import { installVehicleCabin } from './cabin.js';
import { installVehicleSell } from './sell.js';
import { installOwnVehicles } from './own.js';
import { installVehicleMusic } from './music.js';
import { installVehicleRadio } from './radio.js';

interface VehicleProps {
  name: string;
  maxFuel: number;
  consumption: number;
  vehType: number;
  isElectric: boolean;
  price: number;
}

interface VehicleState {
  row: DbRow | null;
  key: string;
  owner: number;
  fuel: number;
  mileage: number;
  windowsDown: number;
  props: VehicleProps;
  burn: ReturnType<typeof setInterval> | null;
  damageAt: number;
  damageKey: string;
}

const propsByModel = new Map<string, VehicleProps>();
const states = new WeakMap<mint.Vehicle, VehicleState>();
const panels = new WeakMap<mint.Vehicle, { hood: boolean; trunk: boolean }>();
const trunkHooks: Array<(player: mint.Player, vehicle: mint.Vehicle) => void> = [];

export function onTrunkOpen(hook: (player: mint.Player, vehicle: mint.Vehicle) => void): void {
  trunkHooks.push(hook);
}
const spawnedPrivate = new Set<number>();
const bySql = new Map<number, mint.Vehicle>();

export function rememberVehicleProps(model: string, props: VehicleProps): void {
  propsByModel.set(model, props);
}

function propsOf(model: string): VehicleProps {
  return propsByModel.get(model) ?? {
    name: model,
    maxFuel: 80,
    consumption: 1.5,
    vehType: 0,
    isElectric: false,
    price: 0,
  };
}

export function vehiclePrice(model: string): number {
  return propsOf(model).price;
}

export function vehicleTitle(model: string): string {
  return propsOf(model).name;
}

export function vehicleFacts(model: string): VehicleProps {
  return propsOf(model);
}

export function hideVehicle(id: number): void {
  const vehicle = bySql.get(id);
  if (vehicle?.valid) vehicle.destroy();
  bySql.delete(id);
  spawnedPrivate.delete(id);
}

export function vehicleSpawned(id: number): boolean {
  return !!bySql.get(id)?.valid;
}

export function placeVehicle(row: DbRow): mint.Vehicle | null {
  if (spawnedPrivate.has(Number(row.id))) return null;
  const vehicle = spawnRow(row);
  if (vehicle) spawnedPrivate.add(Number(row.id));
  return vehicle;
}

function meta(vehicle: mint.Vehicle, key: string, value: mint.ScriptValue | null): void {
  if (value == null) vehicle.deleteStreamSyncedMeta(key);
  else vehicle.setStreamSyncedMeta(key, value);
}

function remember(vehicle: mint.Vehicle, row: DbRow | null, key: string, owner: number, fuel: number, model: string): void {
  states.set(vehicle, {
    row,
    key,
    owner,
    fuel,
    mileage: Number(row?.mileage) || 0,
    windowsDown: 0,
    props: propsOf(model),
    burn: null,
    damageAt: 0,
    damageKey: '',
  });
  if (row) bySql.set(Number(row.id), vehicle);
  meta(vehicle, 'engine', false);
  meta(vehicle, 'leftTurnSignal', false);
  meta(vehicle, 'rightTurnSignal', false);
}

export function spawnAdminVehicle(player: mint.Player, model: string, color1: number, color2: number): mint.Vehicle | null {
  const name = model.trim();
  if (!name) return null;
  let vehicle: mint.Vehicle;
  try {
    vehicle = new mint.Vehicle(
      name,
      player.pos.x,
      player.pos.y + 2,
      player.pos.z,
      0,
      0,
      player.rot.z,
      undefined,
      false,
      player.dimension,
      true,
      mint.VehicleLockState.Unlocked,
      false,
    );
  } catch {
    return null;
  }
  vehicle.primaryColor = color1;
  vehicle.secondaryColor = color2;
  vehicle.numberPlateText = 'ADMIN';
  remember(vehicle, null, 'admin', 0, 40, name);
  return vehicle;
}

export function vehicleState(vehicle: mint.Vehicle): VehicleState | undefined {
  return states.get(vehicle);
}

export function parkStored(vehicle: mint.Vehicle): void {
  const state = states.get(vehicle);
  const row = state?.row;
  if (!state || !row || !vehicle.valid) return;
  const x = Number(row.x);
  const y = Number(row.y);
  const z = Number(row.z);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return;
  vehicle.engineOn = false;
  meta(vehicle, 'engine', false);
  vehicle.pos = new mint.Vector3(x, y, z);
  vehicle.rot = new mint.Vector3(0, 0, Number(row.h) || 0);
  if (state.key === 'job' || state.key === 'newbie') {
    state.fuel = state.props.maxFuel;
    row.fuel = Math.ceil(state.fuel);
    void row.save();
  }
}

export function addFuel(vehicle: mint.Vehicle, litres: number): void {
  const state = states.get(vehicle);
  if (!state || litres < 1) return;
  state.fuel = Math.min(state.props.maxFuel, state.fuel + litres);
  if (state.row) {
    state.row.fuel = Math.ceil(state.fuel);
    void state.row.save();
  }
  const driverPlayer = mint.Player.all.find((entry) => entry.vehicle === vehicle && (entry.seat === 1 || entry.seat === 0));
  if (driverPlayer) cef(driverPlayer, `speedometer.fuel = ${Math.ceil(state.fuel)};`);
}

function spawnRow(row: DbRow): mint.Vehicle | null {
  const model = String(row.modelName ?? '');
  const x = Number(row.x);
  const y = Number(row.y);
  const z = Number(row.z);
  if (!model || model === 'NOTREG' || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const heading = Number(row.h) || 0;
  const vehicle = new mint.Vehicle(
    model,
    x,
    y,
    z,
    0,
    0,
    heading,
    undefined,
    false,
    Number(row.dimension) || 0,
    true,
    mint.VehicleLockState.Unlocked,
    false,
  );
  vehicle.primaryColor = Number(row.color1) || 0;
  vehicle.secondaryColor = Number(row.color2) || 0;
  vehicle.numberPlateText = String(row.plate ?? '').slice(0, 8);
  remember(vehicle, row, String(row.key ?? ''), Number(row.owner) || 0, Number(row.fuel) || 0, model);
  const vehicleId = Number(row.id);
  if (vehicleId) {
    void import('../tuning/index.js').then((mod) => mod.applySavedMods(vehicle, vehicleId));
    void import('../inventory/boot.js').then((mod) => mod.attachVehicleInventory(vehicle));
  }
  return vehicle;
}

export async function loadVehicles(): Promise<number> {
  const props = (await table('VehicleProperties').findAll()) as DbRow[];
  for (const row of props) {
    propsByModel.set(String(row.model), {
      name: String(row.name ?? row.model),
      maxFuel: Number(row.maxFuel) || 80,
      consumption: Number(row.consumption) || 1.5,
      vehType: Number(row.vehType) || 0,
      isElectric: Number(row.isElectric) === 1,
      price: Number(row.price) || 0,
    });
  }
  const rows = (await table('Vehicle').findAll({
    where: { key: ['newbie', 'faction', 'job', 'farm', 'family', 'rent'] },
  })) as DbRow[];
  let count = 0;
  for (const row of rows) {
    if (spawnRow(row)) count += 1;
  }
  mint.log(`crp: транспорт ${count}, моделей ${propsByModel.size}`);
  return count;
}

export async function spawnPrivateVehicles(player: mint.Player): Promise<void> {
  const character = getSession(player).character;
  if (!character) return;
  const rows = (await table('Vehicle').findAll({
    where: { key: 'private', owner: character.id },
  })) as DbRow[];
  for (const row of rows) {
    if (Math.abs(Number(row.x)) + Math.abs(Number(row.y)) < 1) continue;
    placeVehicle(row);
  }
}

function driver(player: mint.Player): boolean {
  return player.vehicle != null && (player.seat === 1 || player.seat === 0);
}

async function haveKeys(player: mint.Player, state: VehicleState): Promise<boolean> {
  const character = getSession(player).character;
  if (!character || !state.row) return false;
  const items = (await table('CharacterInventory').findAll({
    where: { playerId: character.id, itemId: 33 },
    include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
  })) as DbRow[];
  return items.some((item) => {
    const params = (item.params ?? item.CharacterInventoryParams ?? []) as DbRow[];
    const values: Record<string, string> = {};
    for (const param of params) values[String(param.key)] = String(param.value);
    return values.vehId === String(state.row?.id) && values.owner === String(state.owner);
  });
}

export function isTrunkOpen(vehicle: mint.Vehicle): boolean {
  return panels.get(vehicle)?.trunk === true;
}

const repairing = new WeakSet<mint.Vehicle>();
const garaged = new WeakSet<mint.Vehicle>();

export function markRepair(vehicle: mint.Vehicle, on: boolean): void {
  if (on) repairing.add(vehicle);
  else repairing.delete(vehicle);
}

export function isRepair(vehicle: mint.Vehicle): boolean {
  return repairing.has(vehicle);
}

export function markGarage(vehicle: mint.Vehicle, on: boolean): void {
  if (on) garaged.add(vehicle);
  else garaged.delete(vehicle);
}

export function inGarage(vehicle: mint.Vehicle): boolean {
  return garaged.has(vehicle);
}

export function setVehiclePanel(vehicle: mint.Vehicle, part: 'hood' | 'trunk', open: boolean): void {
  setPanel(vehicle, part, open);
}

function setPanel(vehicle: mint.Vehicle, part: 'hood' | 'trunk', open: boolean): void {
  const current = panels.get(vehicle) ?? { hood: false, trunk: false };
  current[part] = open;
  panels.set(vehicle, current);
  mint.emitAllClients('crp:veh:door', vehicle.id, part === 'hood' ? 4 : 5, open);
}

export function vehicleById(id: unknown): mint.Vehicle | null {
  const value = typeof id === 'number' ? id : Number(id);
  if (!Number.isSafeInteger(value) || value <= 0) return null;
  try {
    return mint.Vehicle.getByID(value);
  } catch {
    return null;
  }
}

export function vehicleBySqlId(sqlId: number): mint.Vehicle | null {
  const vehicle = bySql.get(sqlId);
  return vehicle?.valid ? vehicle : null;
}

function showSpeedometer(player: mint.Player, vehicle: mint.Vehicle | null, show: boolean): void {
  const state = vehicle ? states.get(vehicle) : undefined;
  if (!show || !vehicle || !state) {
    cef(player, 'speedometer.show = false;');
    return;
  }
  cef(player, `speedometer.isElectricCar = ${state.props.isElectric}; speedometer.isActive = ${vehicle.engineOn}; speedometer.maxFuel = ${state.props.maxFuel}; speedometer.fuel = ${Math.ceil(state.fuel)}; speedometer.mileage = ${Math.floor(Number(state.row?.mileage) || 0)}; speedometer.show = true;`);
}

function fuelWear(state: VehicleState): number {
  const level = Number(state.row?.fuelState) || 0;
  if (level === 1) return wearOf(state) * 2;
  if (level >= 2) return wearOf(state) * 4;
  return wearOf(state);
}

function wearOf(state: VehicleState): number {
  if (state.key === 'admin') return 1;
  const mileage = Number(state.row?.mileage) || state.mileage;
  const destroys = Number(state.row?.destroys) || 0;
  let multiplier = 1;
  if (mileage < 10) multiplier += 0.01;
  else if (mileage < 100) multiplier += 0.05;
  else if (mileage < 300) multiplier += 0.1;
  else if (mileage < 500) multiplier += 0.2;
  else if (mileage < 1000) multiplier += 0.4;
  else if (mileage < 2000) multiplier += 0.5;
  else if (mileage < 4000) multiplier += 0.7;
  else if (mileage < 10000) multiplier += 1;
  else multiplier += 1.2;
  return multiplier + 0.01 * destroys;
}

const BREAKS = { engineState: 0.001, fuelState: 0.004, steeringState: 0.003, brakeState: 0.001 };

function generateBreakdowns(vehicle: mint.Vehicle): void {
  const state = states.get(vehicle);
  const row = state?.row;
  if (!state || !row || state.props.isElectric) return;
  const registered = row.regDate ? new Date(String(row.regDate)).getTime() : 0;
  if (registered && (Date.now() - registered) / 86400000 < 2) return;
  const mileage = Number(row.mileage) || 0;
  const price = state.props.price;
  if (mileage < 4000) return;
  if (price > 100000 && mileage < 8000) return;
  if (price > 1000000 && mileage < 12000) return;
  const wear = wearOf(state);
  let changed = false;
  for (const key of Object.keys(BREAKS) as (keyof typeof BREAKS)[]) {
    const level = Number(row[key]) || 0;
    if (level >= 2) continue;
    if (Math.random() < BREAKS[key] * wear) {
      row[key] = level + 1;
      changed = true;
    }
  }
  if (changed) void row.save();
}

function burn(vehicle: mint.Vehicle): void {
  const state = states.get(vehicle);
  if (!state) return;
  if (state.burn) clearInterval(state.burn);
  state.burn = null;
  if (!vehicle.engineOn || state.props.vehType === 2) return;
  const every = Math.max(1000, Math.round(60000 / Math.max(0.1, state.props.consumption * fuelWear(state))));
  state.burn = setInterval(() => {
    if (!vehicle.valid || !vehicle.engineOn) {
      if (state.burn) clearInterval(state.burn);
      state.burn = null;
      return;
    }
    state.fuel = Math.max(0, state.fuel - 1);
    if (state.row) {
      state.row.fuel = Math.ceil(state.fuel);
      void state.row.save();
    }
    const driverPlayer = mint.Player.all.find((entry) => entry.vehicle === vehicle && (entry.seat === 1 || entry.seat === 0));
    if (driverPlayer) cef(driverPlayer, `speedometer.fuel = ${Math.ceil(state.fuel)};`);
    if (state.fuel <= 0) {
      vehicle.engineOn = false;
      meta(vehicle, 'engine', false);
      if (driverPlayer) {
        cef(driverPlayer, 'speedometer.isActive = false;');
        notifyError(driverPlayer, state.props.isElectric ? 'Нет зарядки' : 'Нет топлива', 'Транспорт');
      }
    }
  }, every);
}

const idleSeen = new WeakMap<mint.Vehicle, number>();
const IDLE_MS = 20 * 60 * 1000;

function vehicleOccupied(vehicle: mint.Vehicle): boolean {
  if (vehicle.driver) return true;
  for (const player of mint.Player.all) {
    if (player.valid && player.vehicle === vehicle) return true;
  }
  return false;
}

function installIdleRespawn(): void {
  const touch = (vehicle: mint.Vehicle | null): void => {
    if (vehicle) idleSeen.set(vehicle, Date.now());
  };
  mint.on('playerEnteredVehicle', (_player, vehicle) => touch(vehicle));
  mint.on('playerLeftVehicle', (_player, vehicle) => touch(vehicle));
  setInterval(() => {
    const now = Date.now();
    for (const vehicle of mint.Vehicle.all) {
      if (!vehicle.valid) continue;
      const state = states.get(vehicle);
      const row = state?.row;
      if (!state || !row) continue;
      if (state.key === 'private' || state.key === 'market' || state.key === 'rent') continue;
      if (vehicleOccupied(vehicle)) {
        idleSeen.set(vehicle, now);
        continue;
      }
      const left = idleSeen.get(vehicle);
      if (left == null) {
        idleSeen.set(vehicle, now);
        continue;
      }
      if (now - left < IDLE_MS) continue;
      const dx = vehicle.pos.x - Number(row.x);
      const dy = vehicle.pos.y - Number(row.y);
      const dz = vehicle.pos.z - Number(row.z);
      if (dx * dx + dy * dy + dz * dz > 10 || vehicle.destroyed || vehicle.bodyHealth <= 0) parkStored(vehicle);
    }
  }, 60_000);
}

export function installVehicles(): void {
  installVehicleSell();
  installOwnVehicles();
  installVehicleCabin();
  installVehicleMusic();
  installVehicleRadio();
  installIdleRespawn();
  mint.on('playerEnteredVehicle', (player, vehicle, seat) => {
    if (!getSession(player).character) return;
    if (seat !== 1 && seat !== 0) return;
    showSpeedometer(player, vehicle, true);
    const state = vehicleState(vehicle);
    const mine = Number(getSession(player).character?.id);
    mint.emitClient(player, 'crp:veh:flags', state?.props.isElectric === true, state?.key === 'private' && state.owner === mine);
    mint.emitClient(player, 'crp:veh:garage', state ? inGarage(vehicle) : false);
  });

  mint.on('playerLeftVehicle', (player) => {
    showSpeedometer(player, null, false);
    mint.emitClient(player, 'crp:veh:flags', false, false);
    mint.emitClient(player, 'crp:veh:garage', false);
  });

  mint.onClient('crp:veh:engine', (player) => {
    const vehicle = player.vehicle;
    const state = vehicle ? states.get(vehicle) : undefined;
    if (!vehicle || !state || !driver(player)) return;
    if (state.key === 'market' || state.props.vehType === 2) return;
    if (state.fuel <= 0 && !vehicle.engineOn) {
      notifyError(player, state.props.isElectric ? 'Нет зарядки' : 'Нет топлива', 'Транспорт');
      return;
    }
    if (state.key === 'private' && state.owner !== Number(getSession(player).character?.id)) {
      notifyError(player, 'Вы не имеете ключи', state.props.name);
      return;
    }
    if (isRepair(vehicle)) return notifyError(player, 'Двигатель завести нельзя', 'Ремонт');
    vehicle.engineOn = !vehicle.engineOn;
    if (vehicle.engineOn && state.key === 'private') generateBreakdowns(vehicle);
    meta(vehicle, 'engine', vehicle.engineOn);
    cef(player, `speedometer.isActive = ${vehicle.engineOn};`);
    burn(vehicle);
  });

  mint.onClient('crp:veh:signal', (player, side, enabled) => {
    const vehicle = player.vehicle;
    if (!vehicle || !driver(player) || (side !== 'left' && side !== 'right' && side !== 'emergency')) return;
    const on = enabled === true;
    if (side === 'left') {
      meta(vehicle, 'leftTurnSignal', on);
      meta(vehicle, 'rightTurnSignal', false);
    } else if (side === 'right') {
      meta(vehicle, 'rightTurnSignal', on);
      meta(vehicle, 'leftTurnSignal', false);
    } else {
      meta(vehicle, 'leftTurnSignal', on);
      meta(vehicle, 'rightTurnSignal', on);
    }
  });

  mint.onClient('crp:veh:lights', (player, state) => {
    const vehicle = player.vehicle;
    const value = Number(state) | 0;
    if (!vehicle || !driver(player) || value < 0 || value > 3) return;
    meta(vehicle, 'lights', value);
  });

  mint.onClient('crp:veh:damage', (player, raw) => {
    const vehicle = player.vehicle;
    const state = vehicle ? states.get(vehicle) : undefined;
    if (!vehicle || !state || !driver(player) || typeof raw !== 'string' || raw.length > 700) return;
    const now = Date.now();
    if (now - state.damageAt < 700) return;
    let snapshot: unknown;
    try {
      snapshot = JSON.parse(raw);
    } catch {
      return;
    }
    if (!Array.isArray(snapshot) || snapshot.length < 4 || snapshot.length > 52) return;
    if (!snapshot.every((item) => typeof item === 'number' && Number.isFinite(item))) return;
    const clean = snapshot[0] === 0 && snapshot[1] === 0 && snapshot[2] === 0 && snapshot[3] < 0.05 && snapshot.length === 4;
    const key = clean ? '' : snapshot.join(',');
    if (state.damageKey === key) return;
    state.damageAt = now;
    state.damageKey = key;
    meta(vehicle, 'damage', clean ? null : snapshot);
  });

  mint.onClient('crp:veh:mileage', (player, value) => {
    const vehicle = player.vehicle;
    const state = vehicle ? states.get(vehicle) : undefined;
    const delta = Number(value);
    if (!vehicle || !state || !driver(player) || !(delta >= 0.1)) return;
    state.mileage += delta;
    if (state.row) {
      state.row.mileage = state.mileage;
      state.row.fuel = Math.ceil(state.fuel);
      void state.row.save();
    }
  });

  mint.onClient('crp:veh:lock', async (player, vehicleId) => {
    const character = getSession(player).character;
    const vehicle = vehicleById(Number(vehicleId));
    const state = vehicle ? states.get(vehicle) : undefined;
    if (!character || !vehicle || !state) return;
    if (vehicle.dimension !== player.dimension || player.pos.distanceTo(vehicle.pos) > 12) return;
    if (state.key !== 'faction' && state.key !== 'private') {
      notifyError(player, 'Это не ваш транспорт');
      return;
    }
    if (state.key === 'faction' && state.owner !== Number(character.factionId)) {
      notifyError(player, 'Это не ваш транспорт');
      return;
    }
    if (state.key === 'private' && !(await haveKeys(player, state))) {
      notifyError(player, 'У вас нет ключей', state.props.name);
      return;
    }
    const locked = vehicle.lockState === mint.VehicleLockState.Locked;
    vehicle.lockState = locked ? mint.VehicleLockState.Unlocked : mint.VehicleLockState.Locked;
    notifySuccess(player, locked ? 'Вы открыли транспорт' : 'Вы закрыли транспорт', 'Успешно');
  });

  mint.onClient('crp:veh:hood', async (player, vehicleId, _open) => {
    const character = getSession(player).character;
    const vehicle = vehicleById(Number(vehicleId));
    const state = vehicle ? states.get(vehicle) : undefined;
    if (!character || !vehicle || !state) return;
    if (vehicle.dimension !== player.dimension || player.pos.distanceTo(vehicle.pos) > 12) return;
    if (state.key === 'private' && !(await haveKeys(player, state))) {
      notifyError(player, 'Вы не имеете ключи', state.props.name);
      return;
    }
    if (state.key === 'faction' && Number(character.factionId) !== state.owner) {
      notifyError(player, 'Нет доступа', state.props.name);
      return;
    }
    setPanel(vehicle, 'hood', _open === true || _open === 1);
  });

  mint.onClient('crp:veh:trunk', async (player, vehicleId, _open) => {
    const character = getSession(player).character;
    const vehicle = vehicleById(Number(vehicleId));
    const state = vehicle ? states.get(vehicle) : undefined;
    if (!character || !vehicle || !state) return;
    if (vehicle.dimension !== player.dimension || player.pos.distanceTo(vehicle.pos) > 12) return;
    if (state.key === 'private' && !(await haveKeys(player, state))) {
      notifyError(player, 'Вы не имеете ключи', state.props.name);
      return;
    }
    if (state.key === 'faction' && Number(character.factionId) !== state.owner) {
      notifyError(player, 'Нет доступа', state.props.name);
      return;
    }
    const wantOpen = _open === true || _open === 1;
    setPanel(vehicle, 'trunk', wantOpen);
    if (wantOpen) {
      for (const hook of trunkHooks) hook(player, vehicle);
      const mod = await import('../factions/warehouse.js');
      await mod.atBoot(player, vehicle);
    }
  });

  mint.onClient('crp:veh:window', (player, rawIndex) => {
    const character = getSession(player).character;
    const vehicle = player.vehicle;
    const state = vehicle ? states.get(vehicle) : undefined;
    if (!character || !vehicle || !state) return;
    const index = Number(rawIndex) | 0;
    const driving = driver(player);
    if (!driving && index !== player.seat && index !== player.seat - 1) return;
    if (index !== -1 && (index < 0 || index > 3)) return;
    if (index === -1 && !driving) return;
    let bits = state.windowsDown;
    let opened = false;
    if (index === -1) {
      for (let i = 0; i < 4; i += 1) {
        if (!(bits & (1 << i))) opened = true;
      }
      for (let i = 0; i < 4; i += 1) {
        if (opened) bits |= 1 << i;
        else bits &= ~(1 << i);
      }
    } else if (bits & (1 << index)) bits &= ~(1 << index);
    else bits |= 1 << index;
    if (bits === state.windowsDown) return;
    state.windowsDown = bits;
    meta(vehicle, 'windowsDown', bits || null);
    if (index === -1) notifyInfo(player, opened ? 'Стёкла опущены' : 'Стёкла подняты', 'Окна');
    else notifyInfo(player, bits & (1 << index) ? 'Стекло опущено' : 'Стекло поднято', 'Окна');
  });

  mint.onClient('crp:veh:props', async (player, raw) => {
    let data: { model?: string; name?: string; type?: number; price?: number; maxFuel?: number; consumption?: number; isAvailable?: boolean; carShowId?: number; percentage?: number };
    try {
      data = JSON.parse(String(raw ?? '{}')) as typeof data;
    } catch {
      return;
    }
    try {
      await table('VehicleProperties').create({
        model: data.model,
        name: data.name,
        vehType: data.type,
        price: data.price,
        maxFuel: data.maxFuel,
        consumption: data.consumption,
      });
      rememberVehicleProps(String(data.model ?? ''), {
        name: String(data.name ?? data.model ?? ''),
        maxFuel: Number(data.maxFuel) || 50,
        consumption: Number(data.consumption) || 1,
        vehType: Number(data.type) || 0,
        isElectric: false,
        price: Number(data.price) || 0,
      });
      if (data.isAvailable) {
        await table('CarList').create({
          carShowId: data.carShowId,
          vehiclePropertyModel: data.model,
          percentage: data.percentage,
        });
        notifySuccess(player, 'Т/с добавлено');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      notifyError(player, `${message.slice(0, 50)}...`, 'Ошибка');
    }
  });

  mint.on('vehicleDestroy', (vehicle) => {
    const state = states.get(vehicle);
    if (state?.burn) clearInterval(state.burn);
  });
}

