import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { carrierCap, setVehicleCargo, vehicleCargo } from '../carrier/index.js';
import { factionKind } from '../factions/index.js';
import { giveItem } from '../inventory/index.js';
import { addJobExp } from '../jobs/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess, notifyWarning } from '../ui/notify.js';
import { addCash, removeCash } from '../world/money.js';
import { vehicleState } from '../vehicles/index.js';
import { bindCrop, sproutReady, startGrowth } from './crops.js';

const GRAINS_MAX = 2000;
const PRODUCTS_MAX = 800;
const SOILS_MAX = 1000;
const PRICE_MAX = 100;
const PAY_MAX = 100;
const TAX_MAX = 10000;
const CROP_MAX = 1000;
const NAMES = ['Работник', 'Фермер', 'Тракторист', 'Пилот'];
const CROPS = ['productA', 'productB', 'productC'] as const;
const WAREHOUSE: Array<[number, number, number]> = [
  [1982.4197998046875, 5020.7783203125, 40.205257415771484],
  [410.41259765625, 6455.1552734375, 26.809022903442383],
];
const SOILS: Array<[number, number, number]> = [
  [2104.8779296875, 4785.744140625, 39.21879959106445],
  [469.9630126953125, 6526.43505859375, 27.309743881225586],
];
const PILOT: Array<[number, number, number]> = [
  [2090.642822265625, 4791.0380859375, 41.06044387817383],
  [2050.44677734375, 4773.1884765625, 41.06514358520508],
  [2001.443603515625, 4749.4453125, 41.06047821044922],
  [1955.3023681640625, 4728.11083984375, 41.06528091430664],
  [1914.87060546875, 4708.4716796875, 41.34502029418945],
  [1819.9908447265625, 4653.00146484375, 37.763179779052734],
  [1749.459228515625, 4675.36279296875, 44.00497055053711],
  [1788.14599609375, 4760.419921875, 40.28403854370117],
  [1871.528564453125, 4813.0458984375, 45.05659484863281],
  [1966.951904296875, 4870.236328125, 45.468971252441406],
  [2003.7847900390625, 4903.142578125, 42.77552032470703],
  [2048.97216796875, 4953.45654296875, 40.96768569946289],
  [2111.275634765625, 5097.65283203125, 46.71536636352539],
  [2209.676025390625, 5130.552734375, 53.69499206542969],
  [2272.67529296875, 5121.6875, 51.33568572998047],
  [2249.429443359375, 5046.5380859375, 44.653648376464844],
  [2176.230224609375, 5001.357421875, 41.648277282714844],
  [2072.47705078125, 4913.0673828125, 41.085052490234375],
  [2014.7940673828125, 4882.927734375, 42.888336181640625],
  [1924.393798828125, 4841.20703125, 46.36700439453125],
  [1818.208984375, 4867.21875, 41.570648193359375],
  [1706.7135009765625, 4799.94970703125, 41.805519104003906],
  [1727.8955078125, 4715.150390625, 42.08133316040039],
  [1796.1060791015625, 4660.0517578125, 40.08576965332031],
  [1914.87060546875, 4708.4716796875, 41.34502029418945],
  [1955.3023681640625, 4728.11083984375, 41.06528091430664],
  [2001.443603515625, 4749.4453125, 41.06047821044922],
  [2050.44677734375, 4773.1884765625, 41.06514358520508],
  [2090.642822265625, 4791.0380859375, 41.06044387817383],
  [2132.9755859375, 4782.25, 40.97028732299805],
];

export interface FarmJob {
  farm: DbRow;
  type: number;
  pay: number;
}

interface Spot {
  x: number;
  y: number;
  z: number;
}

interface Load {
  type: number;
  count: number;
}

interface Run {
  index: number;
  shape: mint.ColshapeSphere | null;
  kind: 'sow' | 'pilot';
  farm: DbRow;
  field?: DbRow;
  crop: number;
  points: Spot[];
  vehicleId: number;
}

const fields = new Map<number, DbRow[]>();
const dock = new WeakMap<mint.Player, DbRow>();
const soilsDock = new WeakMap<mint.Player, DbRow>();
const pickup = new Map<number, Load>();
const soilsLoad = new Map<number, number>();
const runs = new Map<number, Run>();
let wired = false;
let jobOf: (player: mint.Player) => FarmJob | undefined = () => undefined;

function whole(value: unknown, min: number, max: number): number | null {
  const number = Math.trunc(Number(value));
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}

function spot(value: unknown): Spot | null {
  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const point = parsed as { x?: number; y?: number; z?: number };
  if (!Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.y))) return null;
  return { x: Number(point.x), y: Number(point.y), z: Number(point.z) || 0 };
}

function driving(player: mint.Player, key: string, owner?: number): mint.Vehicle | null {
  const vehicle = player.vehicle;
  const state = vehicle ? vehicleState(vehicle) : undefined;
  if (!vehicle || !state || state.key !== key) return null;
  if (owner != null && state.owner !== owner) return null;
  if (player.seat !== 1 && player.seat !== 0) return null;
  return vehicle;
}

function tag(vehicle: mint.Vehicle, text: string | null): void {
  if (text) vehicle.setStreamSyncedMeta('crp:cargo', text);
  else vehicle.deleteStreamSyncedMeta('crp:cargo');
  const count = text ? Number(/^(\d+) из 200/.exec(text)?.[1]) : 0;
  const state = Math.min(6, Math.trunc((Number.isFinite(count) ? count : 0) / 33));
  if (state > 0) vehicle.setStreamSyncedMeta('crp:farmBales', state);
  else vehicle.deleteStreamSyncedMeta('crp:farmBales');
}

function interval(a: Spot, b: Spot, step: number): Spot[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const count = Math.trunc(Math.hypot(dx, dy) / step);
  if (count < 2) return [];
  const list: Spot[] = [];
  for (let i = 1; i < count; i += 1) list.push({ x: a.x + (dx / count) * i, y: a.y + (dy / count) * i, z: a.z });
  return list;
}

function sowPoints(field: DbRow): Spot[] {
  const p1 = spot(field.p1);
  const p2 = spot(field.p2);
  const p3 = spot(field.p3);
  const p4 = spot(field.p4);
  if (!p1 || !p2 || !p3 || !p4) return [];
  let left = interval(p1, p3, 4);
  let right = interval(p2, p4, 4);
  if (left.length > right.length) left = left.slice(0, right.length);
  if (right.length > left.length) right = right.slice(0, left.length);
  const route: Spot[] = [];
  left.forEach((point, index) => {
    route[index * 2] = { ...point, z: p1.z + 1 };
  });
  right.forEach((point, index) => {
    route[index * 2 + 1] = { ...point, z: p1.z + 1 };
  });
  return route.filter(Boolean);
}

function pilotPoints(farmId: number): Spot[] {
  if (farmId !== 1) return [];
  const list = PILOT.map((point) => ({ x: point[0], y: point[1], z: point[2] + 3 }));
  for (let i = 5; i < list.length - 5; i += 1) list[i].z = 70 + Math.floor(Math.random() * 11);
  return list;
}

function objectCount(field: DbRow): number {
  const p1 = spot(field.p1);
  const p2 = spot(field.p2);
  const p3 = spot(field.p3);
  const p4 = spot(field.p4);
  if (!p1 || !p2 || !p3 || !p4) return 0;
  let left = interval(p1, p3, 5);
  let right = interval(p2, p4, 5);
  if (left.length > right.length) left = left.slice(0, right.length);
  if (right.length > left.length) right = right.slice(0, left.length);
  return left.reduce((sum, from, index) => sum + interval(from, right[index], 5).length, 0);
}

export function fieldCount(farmId: number): number {
  return fields.get(farmId)?.length ?? 0;
}

export function rememberFarm(player: mint.Player, farm: DbRow): void {
  dock.set(player, farm);
}

export function forgetFarm(player: mint.Player, farm: DbRow): void {
  if (dock.get(player)?.id === farm.id) dock.delete(player);
}

function dropRun(playerId: number): void {
  const run = runs.get(playerId);
  run?.shape?.destroy();
  runs.delete(playerId);
}

function placeRun(player: mint.Player, run: Run): void {
  const point = run.points[run.index];
  if (!point) return;
  const step = run.index;
  const radius = run.kind === 'pilot' ? 12 : 5;
  const shape = new mint.ColshapeSphere(point.x, point.y, point.z, radius, player.dimension, true);
  run.shape = shape;
  setColshapeHandlers(shape, {
    onEnter: (who) => {
      if (who.id !== player.id) return;
      const current = runs.get(player.id);
      if (!current || current.index !== step) return;
      const job = jobOf(player);
      const vehicle = driving(player, 'farm');
      if (!vehicle || !job || Number(getSession(player).character?.job) !== 5) {
        notifyError(player, current.kind === 'pilot' ? 'Необходимо находиться в рабочем Т/С' : 'Необходимо находиться в тракторе', current.kind === 'pilot' ? 'Орошение' : 'Посев');
        return;
      }
      if (current.kind === 'sow') {
        const load = pickup.get(vehicle.id);
        if (load) {
          load.count = Math.max(0, load.count - Math.trunc(600 / current.points.length));
          tag(vehicle, load.count ? `${load.count} из 600 ед.` : null);
        }
      }
      shape.destroy();
      const next = current.index + 1;
      if (next >= current.points.length) {
        runs.delete(player.id);
        finishRun(player, current, vehicle);
        return;
      }
      current.index = next;
      placeRun(player, current);
    },
  });
  mint.emitClient(player, 'crp:waypoint', point.x, point.y);
}

function finishRun(player: mint.Player, run: Run, vehicle: mint.Vehicle): void {
  const job = jobOf(player);
  mint.emitClient(player, 'crp:waypoint', 0, 0);
  if (run.kind === 'sow') {
    pickup.delete(vehicle.id);
    tag(vehicle, null);
    if (run.field) startGrowth(run.field, run.crop || 1);
    const pay = Number(run.farm.tractorPay) || 0;
    if (job) job.pay += pay;
    notifySuccess(player, `Поле засеяно. Премия $${pay}`, 'Загрузка зерна');
    return;
  }
  soilsLoad.delete(vehicle.id);
  const pay = Number(run.farm.pilotPay) || 0;
  const rows = fields.get(Number(run.farm.id)) ?? [];
  for (const field of rows) {
    const count = Number(field.count) || 0;
    if (!count || count >= CROP_MAX) continue;
    field.count = Math.min(CROP_MAX, count + objectCount(field) * 2);
    void field.save();
  }
  if (run.farm.playerId) {
    if ((Number(run.farm.balance) || 0) < pay) notifyWarning(player, 'Баланс фермы не позволяет вам выплатить заплату', 'Орошение');
    else {
      run.farm.balance = (Number(run.farm.balance) || 0) - pay;
      void run.farm.save();
      void addCash(player, pay);
    }
  } else {
    void addCash(player, pay);
  }
  notifySuccess(player, `Урожай полей увеличился. Премия $${pay}`, 'Орошение');
}

export function openFarmOffice(player: mint.Player, farm: DbRow, count: number): void {
  const ownerId = Number(farm.playerId) || 0;
  const mine = ownerId === (Number(getSession(player).character?.id) || 0);
  const owner = ownerId ? String(farm.owner || 'Хозяин') : null;
  const items = [
    { text: 'Ферма', values: [`ID ${farm.id}`] },
    { text: 'Хозяин', values: [owner || '-'] },
    { text: 'Баланс', values: [`$${Number(farm.balance) || 0}`] },
    { text: 'Налог. баланс', values: [`$${Number(farm.taxBalance) || 0}`] },
    { text: 'Зарплата', values: [`$${Number(farm.pay) || 0}`] },
    { text: 'Премия фермера', values: [`$${Number(farm.farmerPay) || 0}`] },
    { text: 'Премия тракториста', values: [`$${Number(farm.tractorPay) || 0}`] },
    { text: 'Премия пилота', values: [`$${Number(farm.pilotPay) || 0}`] },
    { text: 'Количество полей', values: [`${count} ед.`] },
    { text: 'Вернуться' },
  ];
  const lines = [
    `selectMenu.setItems('farmInfo', ${JSON.stringify(items)});`,
    `selectMenu.showByName('farm');`,
  ];
  if (ownerId) {
    lines.push(`selectMenu.deleteItem('farm', 'Купить');`);
    if (mine) {
      const crops = [Number(farm.productAPrice) || 0, Number(farm.productBPrice) || 0, Number(farm.productCPrice) || 0];
      const pays = [Number(farm.pay) || 0, Number(farm.farmerPay) || 0, Number(farm.tractorPay) || 0, Number(farm.pilotPay) || 0];
      lines.push(
        `selectMenu.addItem('farm', ${JSON.stringify({ text: 'Управление' })}, 2);`,
        `selectMenu.menus['farmControlGrains'].items[0].values[0] = "${Number(farm.grainPrice) || 0}";`,
        `selectMenu.menus['farmControlSoils'].items[0].values[0] = "${Number(farm.soilPrice) || 0}";`,
        `selectMenu.menus['farmControlCrops'].items[1].values[0] = "${crops[0]}";`,
        `selectMenu.menus['farmControlPays'].items[1].values[0] = "${pays[0]}";`,
        `selectMenu.menus['farmControlSell'].items[0].values[0] = "$${Math.trunc(Number(farm.price) * 0.8)}";`,
        `selectMenu.setProp('farmControlCrops', 'cropsPrice', ${JSON.stringify(crops)});`,
        `selectMenu.setProp('farmControlPays', 'pays', ${JSON.stringify(pays)});`,
      );
    }
  } else {
    lines.push(
      `selectMenu.deleteItem('farm', 'Управление');`,
      `selectMenu.addItem('farm', ${JSON.stringify({ text: 'Купить', values: [`$${Number(farm.price) || 0}`] })}, 0);`,
    );
  }
  cef(player, lines.join('\n'));
}

function showWarehouse(player: mint.Player, farm: DbRow): void {
  const rows = fields.get(Number(farm.id)) ?? [];
  const items = [
    { text: 'Зерно', values: [`${Number(farm.grains) || 0} из ${GRAINS_MAX} ед. ($${Number(farm.grainPrice) || 0})`] },
    { text: 'Урожай А', values: [`${Number(farm.productA) || 0} из ${PRODUCTS_MAX} ед. ($${Number(farm.productAPrice) || 0})`] },
    { text: 'Урожай Б', values: [`${Number(farm.productB) || 0} из ${PRODUCTS_MAX} ед. ($${Number(farm.productBPrice) || 0})`] },
    { text: 'Урожай С', values: [`${Number(farm.productC) || 0} из ${PRODUCTS_MAX} ед. ($${Number(farm.productCPrice) || 0})`] },
    { text: 'Вернуться' },
  ];
  cef(player, [
    `selectMenu.setItems('farmWarehouseInfo', ${JSON.stringify(items)});`,
    `selectMenu.menus['farmGrainsTake'].init(${JSON.stringify(rows.map((row) => Number(row.id)))});`,
    `selectMenu.showByName('farmWarehouse');`,
  ].join('\n'));
}

function showSoils(player: mint.Player, farm: DbRow): void {
  const items = [
    { text: 'Удобрение', values: [`${Number(farm.soils) || 0} из ${SOILS_MAX} ед. ($${Number(farm.soilPrice) || 0})`] },
    { text: 'Вернуться' },
  ];
  cef(player, `selectMenu.setItems('farmSoilsWarehouseInfo', ${JSON.stringify(items)}); selectMenu.showByName('farmSoilsWarehouse');`);
}

function marker(x: number, y: number, z: number): void {
  new mint.Marker(mint.MarkerType.MarkerCylinder, x, y, z, 0, 0, 0, 0, 0, 0, 3, 3, 3, 70, 187, 255, 0, 0);
}

export async function attachWarehouses(list: DbRow[], jobs: (player: mint.Player) => FarmJob | undefined): Promise<void> {
  jobOf = jobs;
  fields.clear();
  try {
    const rows = (await table('FarmField').findAll()) as DbRow[];
    for (const row of rows) {
      const id = Number(row.farmId);
      const bucket = fields.get(id) ?? [];
      bucket.push(row);
      fields.set(id, bucket);
    }
    for (const bucket of fields.values()) bucket.sort((a, b) => Number(a.id) - Number(b.id));
    sproutReady([...fields.values()].flat());
  } catch {
    fields.clear();
  }
  for (const farm of list) {
    const index = Math.max(0, Math.min(WAREHOUSE.length - 1, (Number(farm.id) || 1) - 1));
    const grain = WAREHOUSE[index];
    const soil = SOILS[index];
    marker(grain[0], grain[1], grain[2]);
    marker(soil[0], soil[1], soil[2]);
    const grainShape = new mint.ColshapeSphere(grain[0], grain[1], grain[2] + 2, 2, 0, true);
    const soilShape = new mint.ColshapeSphere(soil[0], soil[1], soil[2] + 2, 3, 0, true);
    setColshapeHandlers(grainShape, {
      onEnter: (player) => {
        dock.set(player, farm);
        showWarehouse(player, farm);
      },
      onExit: (player) => {
        if (dock.get(player)?.id === farm.id) dock.delete(player);
        cef(player, 'selectMenu.show = false;');
      },
    });
    setColshapeHandlers(soilShape, {
      onEnter: (player) => {
        soilsDock.set(player, farm);
        dock.set(player, farm);
        showSoils(player, farm);
      },
      onExit: (player) => {
        if (soilsDock.get(player)?.id === farm.id) soilsDock.delete(player);
        if (dock.get(player)?.id === farm.id) dock.delete(player);
        cef(player, 'selectMenu.show = false;');
      },
    });
  }
  bindCrop((vehicle, type) => {
    const load = pickup.get(vehicle.id);
    if (load && load.type !== type) return 'Неверный тип урожая';
    if (load && load.count >= 200) return 'Пикап заполнен';
    const next = (load?.count ?? 0) + 1;
    pickup.set(vehicle.id, { type, count: next });
    tag(vehicle, `${next} из 200 ед.`);
    return null;
  }, jobs);
  if (wired) return;
  wired = true;
  wire();
}

function wire(): void {
  mint.onClient('crp:farm:fill', async (player) => {
    const header = 'Выгрузка урожая';
    const vehicle = driving(player, 'farm');
    const farm = dock.get(player);
    const job = jobOf(player);
    if (!vehicle) return notifyError(player, 'Необходимо находиться в фермерском пикапе', header);
    if (!farm) return notifyError(player, 'Вы далеко', header);
    if (!job || Number(getSession(player).character?.job) !== 5) return notifyError(player, 'Вы не работаете на ферме', header);
    if (job.farm.id !== farm.id) return notifyError(player, 'Вы работаете на другой ферме', header);
    if (job.type !== 1) return notifyError(player, `Для должности ${NAMES[job.type] ?? NAMES[0]} недоступно`, header);
    const load = pickup.get(vehicle.id);
    if (!load?.count || load.type < 1 || load.type > 3) return notifyError(player, load ? 'Не подходящее содержимое пикапа' : 'Пикап пустой', header);
    const key = CROPS[load.type - 1];
    const room = Math.max(0, PRODUCTS_MAX - (Number(farm[key]) || 0));
    const count = Math.min(load.count, room);
    farm[key] = (Number(farm[key]) || 0) + count;
    await farm.save();
    load.count -= count;
    if (load.count > 0) {
      tag(vehicle, `${load.count} из 200 ед.`);
      notifyInfo(player, `Склад заполнен. ${load.count} ед. урожая осталось в пикапе`, header);
    } else {
      pickup.delete(vehicle.id);
      tag(vehicle, null);
    }
    const pay = Math.trunc((Number(farm.farmerPay) || 0) * (count / 200));
    job.pay += pay;
    notifySuccess(player, `Разгружено ${count} ед. урожая. Премия $${pay}`, header);
  });

  mint.onClient('crp:farm:products:buy', async (player, raw) => {
    const header = 'Покупка урожая';
    const vehicle = driving(player, 'job', 4);
    const farm = dock.get(player);
    const data = JSON.parse(String(raw ?? '{}')) as { count?: number; index?: number };
    const count = whole(data.count, 1, 1000000);
    const index = whole(data.index, 0, 2);
    if (!vehicle) return notifyError(player, 'Необходимо находиться в грузовике', header);
    if (!farm) return notifyError(player, 'Вы далеко', header);
    if (Number(getSession(player).character?.job) !== 4) return notifyError(player, 'Вы не грузоперевозчик', header);
    const current = vehicleCargo(vehicle);
    if (current?.count) return notifyError(player, 'Грузовик уже содержит товар', header);
    if (count == null || index == null) return notifyError(player, 'Некорректное количество', header);
    const max = carrierCap(player);
    if (count > max) return notifyError(player, `Ваш навык не позволяет загрузить более ${max} ед.`, header);
    const key = CROPS[index];
    if (key === 'productC' && factionKind(Number(getSession(player).character?.factionId) || 0) !== 'mafia') return notifyError(player, 'Доступно только членам мафии', header);
    if ((Number(farm[key]) || 0) < 100 || (Number(farm[key]) || 0) < count) return notifyError(player, 'На складе недостаточно урожая', header);
    const price = (Number(farm[`${key}Price`]) || 0) * count;
    if (!(await removeCash(player, price))) return notifyError(player, `Необходимо $${price}`, header);
    farm[key] = (Number(farm[key]) || 0) - count;
    farm.balance = (Number(farm.balance) || 0) + price;
    await farm.save();
    setVehicleCargo(vehicle, { type: key, name: `Урожай ${key}`, count }, max);
    notifySuccess(player, 'Урожай загружен', header);
  });

  mint.onClient('crp:farm:products:hand', async (player, raw) => {
    const header = 'Покупка на руки';
    const farm = dock.get(player);
    const data = JSON.parse(String(raw ?? '{}')) as { count?: number; index?: number };
    const count = whole(data.count, 1, 1000000);
    const index = whole(data.index, 0, 2);
    if (player.vehicle) return notifyError(player, 'Выйдите из авто', header);
    if (!farm) return notifyError(player, 'Вы далеко', header);
    if (count == null || index == null) return notifyError(player, 'Некорректное количество', header);
    const key = CROPS[index];
    if (key === 'productC') return notifyError(player, 'Недоступно', header);
    if ((Number(farm[key]) || 0) < 4 || (Number(farm[key]) || 0) < count) return notifyError(player, 'На складе недостаточно урожая', header);
    const price = (Number(farm[`${key}Price`]) || 0) * count;
    if (!(await removeCash(player, price))) return notifyError(player, `Необходимо $${price}`, header);
    const itemId = index === 0 ? 36 : 146;
    const ok = await giveItem(player, itemId, { count });
    if (!ok) {
      await addCash(player, price);
      return notifyError(player, 'Нет места в инвентаре', header);
    }
    farm[key] = (Number(farm[key]) || 0) - count;
    farm.balance = (Number(farm.balance) || 0) + price;
    await farm.save();
    notifySuccess(player, 'Урожай куплен', header);
  });

  mint.onClient('crp:farm:grains:sell', async (player) => {
    const header = 'Продажа зерна';
    const vehicle = driving(player, 'job', 4);
    const farm = dock.get(player);
    const cargo = vehicle ? vehicleCargo(vehicle) : undefined;
    if (!vehicle) return notifyError(player, 'Необходимо находиться в грузовике', header);
    if (!farm) return notifyError(player, 'Вы далеко', header);
    if (Number(getSession(player).character?.job) !== 4) return notifyError(player, 'Вы не грузоперевозчик', header);
    if (!cargo?.count || cargo.type !== 'grains') return notifyError(player, cargo?.count ? 'Неверный тип товара' : 'Грузовик пустой', header);
    const room = Math.max(0, GRAINS_MAX - (Number(farm.grains) || 0));
    const count = Math.min(cargo.count, room);
    const price = count * (Number(farm.grainPrice) || 0);
    if (farm.playerId && (Number(farm.balance) || 0) < price) return notifyWarning(player, 'Баланс фермы не позволяет вам выплатить заплату', header);
    farm.grains = (Number(farm.grains) || 0) + count;
    await farm.save();
    cargo.count -= count;
    const cap = carrierCap(player);
    if (cargo.count > 0) {
      setVehicleCargo(vehicle, cargo, cap);
      notifyInfo(player, `Склад заполнен. ${cargo.count} ед. зерна осталось в грузовике`, header);
    } else {
      setVehicleCargo(vehicle, null);
      notifySuccess(player, 'Зерно продано', header);
      void addJobExp(player, 0.05, 4);
    }
    if (farm.playerId) {
      farm.balance = (Number(farm.balance) || 0) - price;
      await farm.save();
    }
    if (!(await addCash(player, price)) && price > 0) notifyError(player, 'Ошибка начисления наличных', header);
  });

  mint.onClient('crp:farm:soils:sell', async (player) => {
    const header = 'Продажа удобрения';
    const vehicle = driving(player, 'job', 4);
    const farm = dock.get(player) ?? soilsDock.get(player);
    const cargo = vehicle ? vehicleCargo(vehicle) : undefined;
    if (!vehicle) return notifyError(player, 'Необходимо находиться в грузовике', header);
    if (!farm) return notifyError(player, 'Вы далеко', header);
    if (Number(getSession(player).character?.job) !== 4) return notifyError(player, 'Вы не грузоперевозчик', header);
    if (!cargo?.count || cargo.type !== 'soils') return notifyError(player, cargo?.count ? 'Неверный тип товара' : 'Грузовик пустой', header);
    const room = Math.max(0, SOILS_MAX - (Number(farm.soils) || 0));
    const count = Math.min(cargo.count, room);
    const price = count * (Number(farm.soilPrice) || 0);
    if ((Number(farm.balance) || 0) < price) return notifyWarning(player, 'Баланс фермы не позволяет вам выплатить заплату', header);
    farm.soils = (Number(farm.soils) || 0) + count;
    await farm.save();
    cargo.count -= count;
    const cap = carrierCap(player);
    if (cargo.count > 0) {
      setVehicleCargo(vehicle, cargo, cap);
      notifyInfo(player, `Склад заполнен. ${cargo.count} ед. удобрения осталось в грузовике`, header);
    } else {
      setVehicleCargo(vehicle, null);
      notifySuccess(player, 'Удобрение продано', header);
      void addJobExp(player, 0.05, 4);
    }
    cef(player, 'selectMenu.show = false;');
    if (farm.playerId) {
      farm.balance = (Number(farm.balance) || 0) - price;
      await farm.save();
    }
    if (!(await addCash(player, price)) && price > 0) notifyError(player, 'Ошибка начисления наличных', header);
  });

  mint.onClient('crp:farm:grains:take', (player, raw) => {
    const header = 'Загрузка зерна';
    const vehicle = driving(player, 'farm');
    const farm = dock.get(player);
    const job = jobOf(player);
    const data = JSON.parse(String(raw ?? '{}')) as { field?: number; grain?: number };
    if (!vehicle) return notifyError(player, 'Необходимо находиться в тракторе', header);
    if (!farm) return notifyError(player, 'Вы далеко', header);
    if (!job || Number(getSession(player).character?.job) !== 5) return notifyError(player, 'Вы не работаете на ферме', header);
    if (job.farm.id !== farm.id) return notifyError(player, 'Вы работаете на другой ферме', header);
    if (job.type !== 2) return notifyError(player, `Для должности ${NAMES[job.type] ?? NAMES[0]} недоступно`, header);
    if (pickup.get(vehicle.id)?.count) return notifyError(player, 'Трактор уже загружен', header);
    const rows = fields.get(Number(farm.id)) ?? [];
    const fieldIndex = whole(data.field, 0, Math.max(0, rows.length - 1));
    const grain = whole(data.grain, 0, 2);
    if (fieldIndex == null || grain == null || !rows[fieldIndex]) return notifyError(player, 'Поле не найдено', header);
    const field = rows[fieldIndex];
    if (Number(field.count)) return notifyError(player, `Поле #${field.id} уже засеяно`, header);
    if (grain === 2) return notifyError(player, 'Засев поля данным типом урожая временно не доступен', header);
    if ((Number(farm.grains) || 0) < 600) return notifyError(player, 'Недостаточно для загрузки', header);
    const points = sowPoints(field);
    if (!points.length) return notifyError(player, 'Поле не найдено', header);
    farm.grains = (Number(farm.grains) || 0) - 600;
    void farm.save();
    pickup.set(vehicle.id, { type: grain + 1, count: 600 });
    tag(vehicle, '600 из 600 ед.');
    dropRun(player.id);
    const run: Run = { index: 0, shape: null, kind: 'sow', farm, field, crop: grain + 1, points, vehicleId: vehicle.id };
    runs.set(player.id, run);
    placeRun(player, run);
    notifySuccess(player, 'Загружено 600 ед. урожая', header);
    notifyInfo(player, 'Отправляйтесь на посев поля', header);
  });

  mint.onClient('crp:farm:soils:take', (player) => {
    const header = 'Загрузка удобрения';
    const vehicle = driving(player, 'farm');
    const farm = soilsDock.get(player) ?? dock.get(player);
    const job = jobOf(player);
    if (!vehicle) return notifyError(player, 'Необходимо находиться в рабочем Т/С', header);
    if (!farm) return notifyError(player, 'Вы далеко', header);
    if (!job || Number(getSession(player).character?.job) !== 5) return notifyError(player, 'Вы не работаете на ферме', header);
    if (job.farm.id !== farm.id) return notifyError(player, 'Вы работаете на другой ферме', header);
    if (job.type !== 3) return notifyError(player, `Для должности ${NAMES[job.type] ?? NAMES[0]} недоступно`, header);
    if (soilsLoad.get(vehicle.id)) return notifyError(player, 'Рабочее Т/С уже загружен', header);
    if ((Number(farm.soils) || 0) < 200) return notifyError(player, 'Недостаточно для загрузки', header);
    const points = pilotPoints(Number(farm.id));
    if (!points.length) return notifyError(player, 'Маршрут не найден', header);
    farm.soils = (Number(farm.soils) || 0) - 200;
    void farm.save();
    soilsLoad.set(vehicle.id, 200);
    dropRun(player.id);
    const run: Run = { index: 0, shape: null, kind: 'pilot', farm, crop: 0, points, vehicleId: vehicle.id };
    runs.set(player.id, run);
    placeRun(player, run);
    notifySuccess(player, 'Загружено 200 ед. удобрения', header);
    notifyInfo(player, 'Отправляйтесь на орошение полей', header);
  });

  mint.onClient('crp:farm:crops:price', async (player, raw) => {
    const header = 'Цена на удобрение';
    const farm = dock.get(player);
    const data = JSON.parse(String(raw ?? '{}')) as { price?: number; field?: number };
    const price = whole(data.price, 0, PRICE_MAX);
    const index = whole(data.field, 0, 2);
    if (!farm) return notifyError(player, 'Вы не у фермы', header);
    if (Number(farm.playerId) !== (Number(getSession(player).character?.id) || 0)) return notifyError(player, 'Вы не хозяин фермы', header);
    if (price == null || index == null) return notifyError(player, `Не более $${PRICE_MAX}`, header);
    const key = `${CROPS[index]}Price`;
    farm[key] = price;
    await farm.save();
    notifySuccess(player, `Цена $${price} установлена`, header);
  });

  mint.onClient('crp:farm:balance', async (player, raw) => {
    const header = 'Баланс фермы';
    const fail = (text: string): void => {
      cef(player, 'selectMenu.loader = false;');
      notifyError(player, text, header);
    };
    const farm = dock.get(player);
    const data = JSON.parse(String(raw ?? '{}')) as { balance?: number; sum?: number };
    const slot = whole(data.balance, 0, 1);
    const sum = whole(data.sum, 0, 1000000000);
    if (!farm) return fail('Вы не у фермы');
    if (Number(farm.playerId) !== (Number(getSession(player).character?.id) || 0)) return fail('Вы не хозяин фермы');
    if (slot == null || sum == null) return fail('Некорректная сумма');
    if (slot === 1 && sum > TAX_MAX) return fail(`Баланс налога не более $${TAX_MAX}`);
    const key = slot === 0 ? 'balance' : 'taxBalance';
    const current = Number(farm[key]) || 0;
    if (current === sum) return fail(`Баланс уже $${sum}`);
    if (current < sum) {
      const delta = sum - current;
      if (!(await removeCash(player, delta))) return fail(`Необходимо $${delta}`);
      farm[key] = current + delta;
      await farm.save();
      notifySuccess(player, 'Баланс пополнен', header);
    } else {
      const delta = current - sum;
      if (!(await addCash(player, delta))) return fail('Ошибка зачисления наличных');
      farm[key] = current - delta;
      await farm.save();
      notifySuccess(player, 'Наличные сняты', header);
    }
    cef(player, 'selectMenu.loader = false; selectMenu.show = false;');
  });

  mint.onClient('crp:farm:pay', async (player, raw) => {
    const header = 'Зарплата на ферме';
    const farm = dock.get(player);
    const data = JSON.parse(String(raw ?? '{}')) as { job?: number; sum?: number };
    const index = whole(data.job, 0, 3);
    const sum = whole(data.sum, 0, PAY_MAX);
    if (!farm) return notifyError(player, 'Вы не у фермы', header);
    if (Number(farm.playerId) !== (Number(getSession(player).character?.id) || 0)) return notifyError(player, 'Вы не хозяин фермы', header);
    if (index == null || sum == null) return notifyError(player, `Не более $${PAY_MAX}`, header);
    const key = ['pay', 'farmerPay', 'tractorPay', 'pilotPay'][index];
    farm[key] = sum;
    await farm.save();
    notifySuccess(player, `Зарплата $${sum} установлена`, header);
    cef(player, 'selectMenu.show = false;');
  });

  mint.on('playerDisconnect', (player) => {
    dropRun(player.id);
    dock.delete(player);
    soilsDock.delete(player);
  });

}
