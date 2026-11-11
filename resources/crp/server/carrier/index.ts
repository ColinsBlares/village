import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { signalQuest } from '../quests/index.js';
import { addJobExp, jobExp, syncJobMenu } from '../jobs/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess } from '../ui/notify.js';
import { addCash, removeCash } from '../world/money.js';
import { releaseBizOrder, takeBizOrder } from '../bizes/index.js';
import { vehicleState } from '../vehicles/index.js';

const LOAD = { x: 916.11, y: -1560.74, z: 17.75 };
const CROP = { x: 85.55, y: 6331.13, z: 30.23 };
const JOB = { x: 904.47, y: -1575.12, z: 29.83 };
const PRICE = 4;
const SELL = 0.8;
const TRUCK = 100;
const CROP_PRICE = 11;
const MAX = 500;

interface Cargo {
  type: string;
  name: string;
  count: number;
  bizId?: number;
  pay?: number;
  x?: number;
  y?: number;
  z?: number;
}

interface Order {
  bizId: number;
  bizName: string;
  prodCount: number;
  prodPrice: number;
  orderPrice: number;
  x: number;
  y: number;
  z: number;
}

const cargo = new Map<number, Cargo>();
const rented = new Map<number, number>();
const atLoad = new WeakSet<mint.Player>();
const atCrop = new WeakSet<mint.Player>();
let orders: Order[] = [];

function job(player: mint.Player): boolean {
  return Number(getSession(player).character?.job) === 4;
}

function truck(player: mint.Player): mint.Vehicle | null {
  const vehicle = player.vehicle;
  const state = vehicle ? vehicleState(vehicle) : undefined;
  if (!vehicle || !state || state.key !== 'job' || state.owner !== 4) return null;
  if (player.seat !== 1 && player.seat !== 0) return null;
  return vehicle;
}

function label(vehicle: mint.Vehicle, text: string | null): void {
  if (text) vehicle.setStreamSyncedMeta('crp:cargo', text);
  else vehicle.deleteStreamSyncedMeta('crp:cargo');
}

export function carrierCap(player: mint.Player): number {
  return MAX + Math.trunc(jobExp(player, 4) * 15);
}

export function vehicleCargo(vehicle: mint.Vehicle): Cargo | undefined {
  return cargo.get(vehicle.id);
}

export function setVehicleCargo(vehicle: mint.Vehicle, next: Cargo | null, cap = MAX): void {
  if (!next || next.count <= 0) {
    cargo.delete(vehicle.id);
    label(vehicle, null);
    return;
  }
  cargo.set(vehicle.id, next);
  label(vehicle, `${next.count} из ${cap} ед.`);
}

export async function loadCarrierOrders(): Promise<number> {
  await refreshOrders();
  return orders.length;
}

async function refreshOrders(): Promise<void> {
  const rows = (await table('Biz').findAll()) as DbRow[];
  orders = rows
    .filter((row) => Number(row.productsOrder) > 0 && Number(row.productsOrderPrice) > 0)
    .map((row) => ({
      bizId: Number(row.id),
      bizName: String(row.name ?? `Бизнес ${row.id}`),
      prodCount: Number(row.productsOrder) || 0,
      prodPrice: Math.max(1, Math.trunc((Number(row.productsOrderPrice) || 0) / Math.max(1, Number(row.productsOrder) || 1))),
      orderPrice: Number(row.productsOrderPrice) || 0,
      x: Number(row.x) || 0,
      y: Number(row.y) || 0,
      z: Number(row.z) || 0,
    }));
}

function showLoad(player: mint.Player): void {
  cef(player, [
    `selectMenu.setItemValues('carrierLoadProducts', 'Купить', ${JSON.stringify([`$${PRICE}`])});`,
    `selectMenu.setItemValues('carrierLoadProducts', 'Списать', ${JSON.stringify([`-${Math.ceil((1 - SELL) * 100)}%`])});`,
    `selectMenu.setItems('carrierLoadBizOrders', ${JSON.stringify([
      ...orders.map((order) => ({ text: order.bizName, values: [`${order.prodCount} ед.`] })),
      { text: 'Вернуться' },
    ])});`,
    `selectMenu.setProp('carrierLoadBizOrders', 'bizOrders', ${JSON.stringify(orders)});`,
    `selectMenu.showByName('carrierLoad');`,
  ].join('\n'));
}

export function installCarrier(): void {
  const load = new mint.ColshapeSphere(LOAD.x, LOAD.y, LOAD.z + 9, 10, 0, true);
  setColshapeHandlers(load, {
    onEnter: (player) => {
      if (!job(player)) return notifyError(player, 'Отказано в доступе', 'Склад');
      atLoad.add(player);
      showLoad(player);
    },
    onExit: (player) => {
      atLoad.delete(player);
      cef(player, 'selectMenu.show = false;');
    },
  });
  const crop = new mint.ColshapeSphere(CROP.x, CROP.y, CROP.z + 2, 3, 0, true);
  setColshapeHandlers(crop, {
    onEnter: (player) => {
      if (!job(player)) return notifyError(player, 'Отказано в доступе', 'Склад');
      atCrop.add(player);
      cef(player, `selectMenu.setItemValues('carrierCropUnload', 'Цена за 1 ед.', ${JSON.stringify([`$${CROP_PRICE}`])}); selectMenu.showByName('carrierCropUnload');`);
    },
    onExit: (player) => {
      atCrop.delete(player);
      cef(player, 'selectMenu.show = false;');
    },
  });
  const desk = new mint.ColshapeSphere(JOB.x, JOB.y, JOB.z, 1.5, 0, true);
  setColshapeHandlers(desk, {
    onEnter: (player) => {
      if (player.vehicle) return;
      cef(player, `selectMenu.showByName('carrierJob');`);
    },
    onExit: (player) => cef(player, 'selectMenu.show = false;'),
  });
  const loadBlip = new mint.PointBlip(318, LOAD.x, LOAD.y, LOAD.z, 71, 0.9, true, 0, 'Грузоперевозка');
  const cropBlip = new mint.PointBlip(514, CROP.x, CROP.y, CROP.z, 1, 0.8, true, 0, 'Урожай');
  void loadBlip;
  void cropBlip;

  mint.onClient('crp:carrier:job', (player, stop) => {
    const character = getSession(player).character;
    if (!character) return;
    if (stop === true || stop === 1) {
      character.job = null;
      void character.save();
      notifySuccess(player, 'Вы уволились', 'Грузоперевозчик');
      syncJobMenu(player);
      void signalQuest(player, 'job.changed');
      return;
    }
    if (!character.truckLicense) return notifyError(player, 'Необходима лицензия на фуры', 'Грузоперевозчик');
    if (character.factionId) return notifyError(player, 'Вы состоите в организации', 'Грузоперевозчик');
    character.job = 4;
    void character.save();
    notifySuccess(player, 'Вы устроились дальнобойщиком', 'Грузоперевозчик');
    syncJobMenu(player);
    void signalQuest(player, 'job.changed');
  });

  mint.on('playerEnteredVehicle', (player, vehicle, seat) => {
    const state = vehicleState(vehicle);
    if (!state || state.key !== 'job' || state.owner !== 4 || (seat !== 1 && seat !== 0) || !job(player)) return;
    const owner = rented.get(vehicle.id);
    const mine = Number(getSession(player).character?.id) || 0;
    if (owner && owner !== mine) {
      notifyError(player, 'Грузовик арендован другим игроком', 'Аренда грузовика');
      mint.emitClient(player, 'crp:veh:leave');
      return;
    }
    if (!owner) cef(player, `offerDialog.show('carrier_job', ${JSON.stringify({ price: TRUCK })});`);
    const loadout = cargo.get(vehicle.id);
    if (loadout) notifyInfo(player, `Загружено: ${loadout.name} ${loadout.count} ед.`, 'Товар');
  });

  mint.onClient('crp:carrier:rent', async (player) => {
    const vehicle = truck(player);
    if (!vehicle || !job(player)) return notifyError(player, 'Не в грузовике', 'Аренда грузовика');
    if (rented.has(vehicle.id)) return notifyError(player, 'Уже арендован', 'Аренда грузовика');
    if (!(await removeCash(player, TRUCK))) return notifyError(player, `Необходимо $${TRUCK}`, 'Аренда грузовика');
    rented.set(vehicle.id, Number(getSession(player).character?.id) || 0);
    notifySuccess(player, 'Удачной работы!', 'Аренда грузовика');
  });

  mint.onClient('crp:carrier:buy', async (player, raw) => {
    const header = 'Покупка товара';
    const vehicle = truck(player);
    const data = JSON.parse(String(raw ?? '{}')) as { count?: number; product?: number };
    const count = Math.trunc(Number(data.count));
    const product = Math.trunc(Number(data.product));
    if (!atLoad.has(player)) return notifyError(player, 'Далеко от склада', header);
    if (!vehicle || !job(player)) return notifyError(player, 'Не в грузовике', header);
    if (!Number.isInteger(count) || count <= 0 || (product !== 0 && product !== 1)) return notifyError(player, 'Некорректное количество', header);
    const current = cargo.get(vehicle.id);
    if (current?.bizId) return notifyError(player, 'Вы уже взяли заказ для бизнеса', header);
    const cap = carrierCap(player);
    if (count > cap || (current && current.count + count > cap)) return notifyError(player, `Нельзя загрузить более ${cap} ед.`, header);
    const type = product === 0 ? 'grains' : 'soils';
    const name = product === 0 ? 'Зерно' : 'Удобрение';
    if (current && current.type !== type) return notifyError(player, `Нельзя смешивать товары, у вас ${current.name}`, header);
    const price = count * PRICE;
    if (!(await removeCash(player, price))) return notifyError(player, `Необходимо $${price}`, header);
    const next = (current?.count ?? 0) + count;
    cargo.set(vehicle.id, { type, name, count: next });
    label(vehicle, `${next} из ${cap} ед.`);
    notifySuccess(player, `Товар куплен за $${price}`, header);
    cef(player, 'selectMenu.loader = false;');
  });

  mint.onClient('crp:carrier:sell', async (player) => {
    const header = 'Списание товара';
    const vehicle = truck(player);
    const current = vehicle ? cargo.get(vehicle.id) : undefined;
    if (!atLoad.has(player)) return notifyError(player, 'Далеко от склада', header);
    if (!vehicle || !job(player)) return notifyError(player, 'Не в грузовике', header);
    if (current?.bizId) return notifyError(player, 'Отмените заказ для бизнеса', header);
    if (!current?.count) return notifyError(player, 'Грузовик пустой', header);
    const price = Math.trunc(current.count * PRICE * SELL);
    cargo.delete(vehicle.id);
    label(vehicle, null);
    await addCash(player, price);
    notifySuccess(player, `Товар списан за $${price}`, header);
    cef(player, 'selectMenu.loader = false;');
  });

  mint.onClient('crp:carrier:order', async (player, rawId) => {
    const header = 'Принятие заказа';
    const vehicle = truck(player);
    if (!atLoad.has(player) || !vehicle || !job(player)) return notifyError(player, 'Не в грузовике у склада', header);
    if (cargo.has(vehicle.id)) return notifyError(player, 'У вас уже есть загруженные товары', header);
    const order = orders.find((item) => item.bizId === Number(rawId));
    if (!order) return notifyError(player, 'Заказ просрочен', header);
    const count = Math.min(carrierCap(player), order.prodCount);
    const price = count * order.prodPrice;
    if (!(await removeCash(player, price))) return notifyError(player, `Необходимо $${price}`, header);
    const pay = Math.trunc(order.orderPrice * (count / order.prodCount));
    order.prodCount -= count;
    order.orderPrice -= pay;
    if (order.prodCount <= 0) orders = orders.filter((item) => item.bizId !== order.bizId);
    cargo.set(vehicle.id, { type: 'order', name: order.bizName, count, bizId: order.bizId, pay, x: order.x, y: order.y, z: order.z });
    takeBizOrder(order.bizId);
    label(vehicle, `${order.bizName}: ${count} ед.`);
    mint.emitClient(player, 'crp:waypoint', order.x, order.y);
    notifySuccess(player, `Заказ ${order.bizName} принят`, header);
  });

  mint.onClient('crp:carrier:crop', async (player) => {
    const header = 'Продажа урожая';
    const vehicle = truck(player);
    const current = vehicle ? cargo.get(vehicle.id) : undefined;
    if (!atCrop.has(player) || !vehicle || !job(player)) return notifyError(player, 'Вы не у склада в грузовике', header);
    if (current?.bizId) return notifyError(player, 'Отмените заказ для бизнеса', header);
    if (!current || !['productA', 'productB', 'productC', 'grains', 'soils'].includes(current.type)) return notifyError(player, 'Грузовик пустой', header);
    const price = CROP_PRICE * current.count;
    cargo.delete(vehicle.id);
    label(vehicle, null);
    await addCash(player, price);
    notifySuccess(player, 'Урожай продан', header);
  });

  mint.setInterval(() => {
    for (const player of mint.Player.all) {
      const vehicle = truck(player);
      const current = vehicle ? cargo.get(vehicle.id) : undefined;
      if (!player.valid || !vehicle || !current?.bizId || current.x == null || current.y == null || current.z == null) continue;
      if (player.pos.distanceTo(new mint.Vector3(current.x, current.y, current.z)) > 12) continue;
      void deliver(player, vehicle, current);
    }
  }, 1000);

  mint.on('playerDisconnect', (player) => {
    const id = Number(getSession(player).character?.id) || 0;
    for (const [vehicleId, owner] of rented) if (owner === id) rented.delete(vehicleId);
  });
}

async function deliver(player: mint.Player, vehicle: mint.Vehicle, current: Cargo): Promise<void> {
  cargo.delete(vehicle.id);
  label(vehicle, null);
  const row = (await table('Biz').findOne({ where: { id: current.bizId } })) as DbRow | null;
  if (row) {
    row.productsCount = (Number(row.productsCount) || 0) + current.count;
    row.productsOrder = Math.max(0, (Number(row.productsOrder) || 0) - current.count);
    if (row.productsOrder <= 0) releaseBizOrder(Number(row.id));
    await row.save();
  }
  await addCash(player, current.pay ?? 0);
  void addJobExp(player, 0.05);
  mint.emitClient(player, 'crp:waypoint', 0, 0);
  notifySuccess(player, `Заказ доставлен. +$${current.pay ?? 0}`, 'Грузоперевозчик');
}
