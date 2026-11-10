import * as mint from 'mint-server';
import { allowMove } from '../anticheat/index.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { addJobExp, assignJob, clearJob, jobExp } from '../jobs/index.js';
import { phoneOf } from '../phone/index.js';
import { getSession } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess, notifyWarning } from '../ui/notify.js';
import { parkStored, vehicleState } from '../vehicles/index.js';
import { addCash, removeCash } from '../world/money.js';

const RENT = 50;
const PRICE = 100;
const RESPAWN = 120000;
const HEADER = 'Такси';

interface Spot {
  x: number;
  y: number;
  z: number;
}

interface Order {
  orderId: number;
  clientId: number;
  position: Spot;
}

interface Pickup {
  driverId: number;
  clientId: number;
  plate: string;
  name: string;
  model: string;
  order: Order;
}

interface Trip {
  driverId: number;
  clientId: number;
  price: number;
  destination: Spot;
  start: Spot;
}

let nextOrder = 1;
const orders = new Map<number, Order>();
const pickupByDriver = new Map<number, Pickup>();
const pickupByClient = new Map<number, Pickup>();
const tripByDriver = new Map<number, Trip>();
const tripByClient = new Map<number, Trip>();
const rentDriver = new WeakMap<mint.Vehicle, number>();
const rentTimer = new WeakMap<mint.Vehicle, ReturnType<typeof setTimeout>>();
const rentedByPlayer = new Map<number, mint.Vehicle>();

function drivers(): mint.Player[] {
  return mint.Player.all.filter((player) => player.valid && Number(getSession(player).character?.job) === 2);
}

function playerById(id: number): mint.Player | null {
  try {
    const player = mint.Player.getByID(id);
    return player?.valid ? player : null;
  } catch {
    return null;
  }
}

function driving(player: mint.Player): boolean {
  return !!player.vehicle && (player.seat === 1 || player.seat === 0);
}

function flat(a: Spot, b: Spot): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function spotOf(player: mint.Player): Spot {
  return { x: player.pos.x, y: player.pos.y, z: player.pos.z };
}

function tripPrice(from: Spot, to: Spot): number {
  const meters = Math.hypot(from.x - to.x, from.y - to.y, from.z - to.z);
  return Math.max(PRICE, Math.round((meters / 1000) * PRICE));
}

function ordersPayload(): Order[] {
  return [...orders.values()];
}

function pushOrder(order: Order): void {
  for (const driver of drivers()) mint.emitClient(driver, 'crp:taxi:driver:add', JSON.stringify(order));
}

function dropOrder(orderId: number): void {
  if (!orders.delete(orderId)) return;
  for (const driver of drivers()) mint.emitClient(driver, 'crp:taxi:driver:del', orderId);
}

function clearPickup(pickup: Pickup): void {
  pickupByDriver.delete(pickup.driverId);
  pickupByClient.delete(pickup.clientId);
}

function clearTrip(trip: Trip): void {
  tripByDriver.delete(trip.driverId);
  tripByClient.delete(trip.clientId);
}

function eject(player: mint.Player): void {
  const vehicle = player.vehicle;
  if (!vehicle) return;
  allowMove(player);
  player.pos = new mint.Vector3(vehicle.pos.x + 2, vehicle.pos.y, vehicle.pos.z);
}

function workVehicle(player: mint.Player): boolean {
  const vehicle = player.vehicle;
  const state = vehicle ? vehicleState(vehicle) : undefined;
  const character = getSession(player).character;
  if (!vehicle || !state || !character) return false;
  if (rentDriver.get(vehicle) === player.id) return true;
  return state.key === 'private' && state.owner === Number(character.id);
}

function releaseRent(vehicle: mint.Vehicle): void {
  const timer = rentTimer.get(vehicle);
  if (timer) clearTimeout(timer);
  rentTimer.delete(vehicle);
  const driverId = rentDriver.get(vehicle);
  rentDriver.delete(vehicle);
  if (driverId) rentedByPlayer.delete(driverId);
  if (vehicle.valid) parkStored(vehicle);
}

function cancelClient(player: mint.Player, reason: string): void {
  const order = [...orders.values()].find((row) => row.clientId === player.id);
  if (order) dropOrder(order.orderId);
  const pickup = pickupByClient.get(player.id);
  if (pickup) {
    clearPickup(pickup);
    const driver = playerById(pickup.driverId);
    if (driver) mint.emitClient(driver, 'crp:taxi:driver:canceled');
  }
  const trip = tripByClient.get(player.id);
  if (trip) {
    clearTrip(trip);
    const driver = playerById(trip.driverId);
    if (driver) mint.emitClient(driver, 'crp:taxi:driver:canceled');
  }
  if (player.valid) mint.emitClient(player, 'crp:taxi:client:cancel', reason);
}

function compensate(client: mint.Player, trip: Trip): void {
  const entire = flat(trip.start, trip.destination);
  const left = flat(spotOf(client), trip.destination);
  if (entire <= 0 || (entire - left) / entire <= 0.5) return;
  const sum = Math.round((entire / 1000) * 0.5 * PRICE);
  if (sum <= 0) return;
  const driver = playerById(trip.driverId);
  void removeCash(client, sum).then((paid) => {
    if (!paid || !driver?.valid) return;
    void addCash(driver, sum);
    notifyWarning(client, 'Вы покинули такси, с вас списана часть суммы поездки');
    notifyWarning(driver, 'Клиент покинул такси, вам начислена компенсация');
  });
}

export function installTaxi(): void {
  const pedPos = new mint.Vector3(894.924560546875, -179.1186065673828, 74.70025634765625);
  new mint.Ped('a_m_m_hasjew_01', pedPos, new mint.Vector3(0, 0, (238.2574462890625 * Math.PI) / 180), 200, true, 0, true);
  new mint.Marker(
    mint.MarkerType.MarkerCylinder,
    895.3949584960938,
    -179.32843017578125,
    73.50028686523438,
    0, 0, 0, 0, 0, 0,
    0.4, 0.4, 0.4,
    200, 255, 255, 125,
    0,
  );
  new mint.PointBlip(198, 894.9740600585938, -179.16798400878906, 74.70034790039062, 70, 0.8, true, 0, 'Таксопарк "Cuber"');
  const shape = new mint.ColshapeSphere(895.3949584960938, -179.32843017578125, 74.50028686523438, 1.2, 0, true);
  setColshapeHandlers(shape, {
    onEnter: (player) => {
      const hired = Number(getSession(player).character?.job) === 2;
      const text = hired ? 'Уволиться с работы' : 'Устроиться на работу';
      cef(player, `selectMenu.menu = selectMenu.menus["taxiJobMenu"]; selectMenu.menu.items[0].text = ${JSON.stringify(text)}; selectMenu.show = true;`);
    },
    onExit: (player) => cef(player, 'selectMenu.show = false;'),
  });

  mint.onClient('crp:taxi:job', (player) => {
    const character = getSession(player).character;
    if (!character) return;
    if (Number(character.job) === 2) {
      clearJob(player, 'Такси');
      return;
    }
    if (!character.carLicense) {
      notifyError(player, 'У вас нет прав на легковой транспорт', HEADER);
      return;
    }
    if (!phoneOf(player)) {
      notifyError(player, 'Вам нужно иметь мобильный телефон', HEADER);
      return;
    }
    assignJob(player, 2, 'Такси');
  });

  mint.onClient('crp:taxi:order', (player) => {
    const character = getSession(player).character;
    if (!character) return;
    if (player.vehicle) {
      mint.emitClient(player, 'crp:taxi:client:code', 0);
      return;
    }
    if (player.dimension !== 0) {
      mint.emitClient(player, 'crp:taxi:client:code', 1);
      return;
    }
    if ((Number(character.cash) || 0) < PRICE) {
      mint.emitClient(player, 'crp:taxi:client:code', 2);
      return;
    }
    if ([...orders.values()].some((order) => order.clientId === player.id) || pickupByClient.has(player.id)) {
      mint.emitClient(player, 'crp:taxi:client:code', 3);
      return;
    }
    const order: Order = { orderId: nextOrder, clientId: player.id, position: spotOf(player) };
    nextOrder += 1;
    orders.set(order.orderId, order);
    pushOrder(order);
    mint.emitClient(player, 'crp:taxi:client:code', 4);
  });

  mint.onClient('crp:taxi:orders', (player) => {
    if (Number(getSession(player).character?.job) !== 2) return;
    mint.emitClient(player, 'crp:taxi:driver:load', JSON.stringify(ordersPayload()));
  });

  mint.onClient('crp:taxi:take', (player, orderId) => {
    const character = getSession(player).character;
    if (!character || Number(character.job) !== 2) {
      mint.emitClient(player, 'crp:taxi:driver:ans', 3);
      return;
    }
    if (!player.vehicle) {
      mint.emitClient(player, 'crp:taxi:driver:ans', 2);
      return;
    }
    const state = vehicleState(player.vehicle);
    if (state && state.props.vehType !== 0 && state.props.vehType !== 3) {
      mint.emitClient(player, 'crp:taxi:driver:ans', 6);
      return;
    }
    if (!character.carLicense) {
      mint.emitClient(player, 'crp:taxi:driver:ans', 4);
      return;
    }
    if (!workVehicle(player)) {
      mint.emitClient(player, 'crp:taxi:driver:ans', 2);
      return;
    }
    if (pickupByDriver.has(player.id) || tripByDriver.has(player.id)) {
      mint.emitClient(player, 'crp:taxi:driver:ans', 5);
      return;
    }
    const order = orders.get(Number(orderId));
    if (!order) {
      mint.emitClient(player, 'crp:taxi:driver:ans', 1);
      return;
    }
    const client = playerById(order.clientId);
    if (!client) {
      dropOrder(order.orderId);
      mint.emitClient(player, 'crp:taxi:driver:ans', 1);
      return;
    }
    dropOrder(order.orderId);
    const pickup: Pickup = {
      driverId: player.id,
      clientId: client.id,
      plate: player.vehicle.numberPlateText,
      name: player.name,
      model: state?.props.name ?? '',
      order,
    };
    pickupByDriver.set(player.id, pickup);
    pickupByClient.set(client.id, pickup);
    mint.emitClient(client, 'crp:taxi:client:taken', JSON.stringify({ name: pickup.name, model: pickup.model, number: pickup.plate }));
    mint.emitClient(player, 'crp:taxi:driver:ans', 0, JSON.stringify(order));
  });

  mint.onClient('crp:taxi:arrive', (player) => {
    const pickup = pickupByDriver.get(player.id);
    if (!pickup) return;
    const client = playerById(pickup.clientId);
    if (!client?.valid || !player.vehicle || player.vehicle.numberPlateText !== pickup.plate) {
      clearPickup(pickup);
      mint.emitClient(player, 'crp:taxi:driver:clear');
      notifyError(player, 'Заказ был принят из другого т/с, заказ отменен', HEADER);
      if (client?.valid) mint.emitClient(client, 'crp:taxi:client:cancel', 'Заказ отменен водителем');
      return;
    }
    mint.emitClient(client, 'crp:taxi:client:ready');
  });

  mint.onClient('crp:taxi:confirm', (player, raw) => {
    const pickup = pickupByClient.get(player.id);
    const character = getSession(player).character;
    if (!pickup || !character) return;
    let destination: Spot | null = null;
    try {
      const parsed = JSON.parse(String(raw ?? '')) as Spot;
      if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) destination = { x: parsed.x, y: parsed.y, z: Number(parsed.z) || 0 };
    } catch {
      destination = null;
    }
    if (!destination) return;
    const price = tripPrice(spotOf(player), destination);
    if ((Number(character.cash) || 0) < price) {
      mint.emitClient(player, 'crp:taxi:client:confirm', 1);
      return;
    }
    const driver = playerById(pickup.driverId);
    if (!driver) return;
    clearPickup(pickup);
    const trip: Trip = { driverId: driver.id, clientId: player.id, price, destination, start: spotOf(player) };
    tripByDriver.set(driver.id, trip);
    tripByClient.set(player.id, trip);
    mint.emitClient(player, 'crp:taxi:client:confirm', 0);
    mint.emitClient(driver, 'crp:taxi:driver:dest', destination.x, destination.y, destination.z, price);
  });

  mint.onClient('crp:taxi:reach', async (player) => {
    const trip = tripByDriver.get(player.id);
    const client = trip ? playerById(trip.clientId) : null;
    if (!trip || !client || !driving(player) || client.vehicle !== player.vehicle) return;
    if (flat(spotOf(player), trip.destination) > 80) return;
    clearTrip(trip);
    mint.emitClient(client, 'crp:taxi:client:done');
    mint.emitClient(player, 'crp:taxi:driver:done');
    const paid = await removeCash(client, trip.price);
    if (!paid) {
      notifyError(client, 'Вы не смогли оплатить поездку', HEADER);
      notifyError(player, 'Клиент не смог оплатить поездку', HEADER);
      return;
    }
    notifySuccess(client, 'Вы оплатили поездку', HEADER);
    const commission = Number((0.3 - 0.25 * (jobExp(player, 2) / 100)).toFixed(2));
    const share = Math.trunc((1 - commission) * trip.price);
    const credited = await addCash(player, share);
    void addJobExp(player, 0.05, 2);
    if (!credited) {
      notifyError(player, 'Ошибка зачисления денег', HEADER);
      return;
    }
    notifySuccess(player, 'Деньги зачислены на счет', HEADER);
    notifyInfo(player, `Комиссия Cuber составила ${Math.round(100 * commission)}%`, HEADER);
    notifyInfo(player, 'Комиссия уменьшается с увеличением навыка таксиста', HEADER);
  });

  mint.onClient('crp:taxi:client:stop', (player, reason) => {
    const quiet = reason === 'timeout' || reason === 'zone';
    cancelClient(player, quiet ? '' : 'Вы отменили заказ');
  });

  mint.onClient('crp:taxi:driver:stop', (player) => {
    const pickup = pickupByDriver.get(player.id);
    const trip = tripByDriver.get(player.id);
    const clientId = pickup?.clientId ?? trip?.clientId ?? 0;
    if (pickup) clearPickup(pickup);
    if (trip) clearTrip(trip);
    mint.emitClient(player, 'crp:taxi:driver:clear', 'Вы отменили заказ');
    const client = clientId ? playerById(clientId) : null;
    if (client) mint.emitClient(client, 'crp:taxi:client:cancel', 'Заказ отменен водителем');
  });

  mint.onClient('crp:taxi:rent', async (player, accept) => {
    if (!accept || !player.vehicle) {
      notifyWarning(player, 'Вы отказались от аренды', HEADER);
      eject(player);
      return;
    }
    const vehicle = player.vehicle;
    const state = vehicleState(vehicle);
    if (!state || state.key !== 'job' || state.owner !== 2) {
      notifyWarning(player, 'Аренда невозможна', HEADER);
      return;
    }
    const character = getSession(player).character;
    if (!character || (Number(character.cash) || 0) < RENT) {
      notifyError(player, 'Недостаточно денег', HEADER);
      eject(player);
      return;
    }
    const paid = await removeCash(player, RENT);
    if (!player.valid) return;
    if (!paid) {
      notifyError(player, 'Ошибка аренды', HEADER);
      eject(player);
      return;
    }
    rentDriver.set(vehicle, player.id);
    rentedByPlayer.set(player.id, vehicle);
    notifySuccess(player, 'Вы арендовали транспорт', HEADER);
  });

  mint.on('playerEnteredVehicle', (player, vehicle, seat) => {
    const pickup = pickupByClient.get(player.id);
    if (pickup && seat !== 1 && seat !== 0 && vehicle.numberPlateText === pickup.plate) {
      mint.emitClient(player, 'crp:taxi:client:in');
      const driver = playerById(pickup.driverId);
      if (driver) mint.emitClient(driver, 'crp:taxi:driver:wait');
    }
    if (seat !== 1 && seat !== 0) return;
    if (rentDriver.get(vehicle) === player.id) {
      const timer = rentTimer.get(vehicle);
      if (timer) clearTimeout(timer);
      rentTimer.delete(vehicle);
    }
    const state = vehicleState(vehicle);
    if (!state || state.key !== 'job' || state.owner !== 2) return;
    const holder = rentDriver.get(vehicle);
    if (holder && holder !== player.id) {
      notifyError(player, 'Транспорт уже арендован', HEADER);
      eject(player);
      return;
    }
    if (!holder) mint.emitClient(player, 'crp:taxi:rent', RENT);
  });

  mint.on('playerLeftVehicle', (player, vehicle) => {
    if (rentDriver.get(vehicle) === player.id) {
      notifyWarning(player, `У вас есть ${RESPAWN / 1000} секунд, чтобы вернуться в транспорт`, HEADER);
      const prev = rentTimer.get(vehicle);
      if (prev) clearTimeout(prev);
      rentTimer.set(vehicle, setTimeout(() => releaseRent(vehicle), RESPAWN));
    }
    const trip = tripByClient.get(player.id);
    if (!trip) return;
    clearTrip(trip);
    compensate(player, trip);
    mint.emitClient(player, 'crp:taxi:client:leave');
    const driver = playerById(trip.driverId);
    if (driver) mint.emitClient(driver, 'crp:taxi:driver:canceled');
  });

  mint.on('playerDisconnect', (player) => {
    cancelClient(player, '');
    const pickup = pickupByDriver.get(player.id);
    if (pickup) {
      clearPickup(pickup);
      const client = playerById(pickup.clientId);
      if (client) mint.emitClient(client, 'crp:taxi:client:cancel', 'Заказ отменен водителем');
    }
    const trip = tripByDriver.get(player.id);
    if (trip) {
      clearTrip(trip);
      const client = playerById(trip.clientId);
      if (client) mint.emitClient(client, 'crp:taxi:client:cancel', 'Заказ отменен водителем');
    }
    const vehicle = rentedByPlayer.get(player.id);
    if (vehicle) releaseRent(vehicle);
  });
}
