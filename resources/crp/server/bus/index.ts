import * as mint from 'mint-server';
import { allowMove } from '../anticheat/index.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { table } from '../core/db.js';
import { addJobExp, assignJob, clearJob, jobExp } from '../jobs/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess, notifyWarning } from '../ui/notify.js';
import { parkStored, vehicleState } from '../vehicles/index.js';
import { addCash, removeCash } from '../world/money.js';

const RENT = 50;
const STOP_MS = 15000;
const RESPAWN_MS = 120000;

interface Point {
  x: number;
  y: number;
  z: number;
  stop: boolean;
}

interface Route {
  id: number;
  name: string;
  level: number;
  salary: number;
  points: Point[];
}

interface Run {
  route: Route;
  index: number;
  saved: number;
  passengers: number;
  readyAt: number;
  price: number;
  ended: boolean;
}

const routes = new Map<number, Route>();
const rented = new Map<number, number>();
const runs = new WeakMap<mint.Vehicle, Run>();
const offered = new WeakMap<mint.Player, Route[]>();
const respawn = new WeakMap<mint.Vehicle, ReturnType<typeof setTimeout>>();

function driverSeat(player: mint.Player): boolean {
  return player.seat === 0 || player.seat === 1;
}

function busOf(vehicle: mint.Vehicle | null): boolean {
  const state = vehicle ? vehicleState(vehicle) : undefined;
  return !!state && state.key === 'job' && state.owner === 3;
}

function levelOf(vehicle: mint.Vehicle): number | null {
  const name = String(vehicleState(vehicle)?.row?.modelName ?? '').toLowerCase();
  if (name === 'rentalbus' || name === 'coach') return 0;
  return null;
}

function eject(player: mint.Player): void {
  const vehicle = player.vehicle;
  if (!vehicle) return;
  allowMove(player);
  player.pos = new mint.Vector3(vehicle.pos.x + 2, vehicle.pos.y, vehicle.pos.z);
}

function near(player: mint.Player, point: Point, range: number): boolean {
  const dx = player.pos.x - point.x;
  const dy = player.pos.y - point.y;
  const dz = player.pos.z - point.z;
  return dx * dx + dy * dy + dz * dz <= range * range;
}

function sayNear(player: mint.Player, text: string): void {
  for (const other of mint.Player.all) {
    if (!other.valid || other.dimension !== player.dimension || !getSession(other).character) continue;
    if (!near(other, { x: player.pos.x, y: player.pos.y, z: player.pos.z, stop: false }, 10)) continue;
    mint.emitClient(other, 'crp:chat', text);
  }
}

function showMenu(player: mint.Player, vehicle: mint.Vehicle): void {
  const level = levelOf(vehicle);
  const list = [...routes.values()].filter((route) => route.level === level && route.points.length > 0);
  offered.set(player, list);
  if (!list.length) notifyWarning(player, 'Нет доступных маршрутов', 'Автобус');
  const names = list.map((route) => route.name);
  cef(player, `selectMenu.menu = cloneObj(selectMenu.menus["busMenu"]); selectMenu.menu.items[0].values = ${JSON.stringify(names)}; selectMenu.show = true;`);
}

function sendPoint(player: mint.Player, run: Run, delay: number): void {
  const point = run.route.points[run.index];
  if (!point) return;
  run.readyAt = Date.now() + Math.max(delay - 1000, 0);
  mint.emitClient(player, 'crp:bus:point', point.x, point.y, point.z, point.stop ? 1 : 0, delay);
}

function clearTimer(vehicle: mint.Vehicle): void {
  const timer = respawn.get(vehicle);
  if (timer) clearTimeout(timer);
  respawn.delete(vehicle);
}

function release(vehicle: mint.Vehicle, driver: mint.Player | null, tell: boolean): void {
  const run = runs.get(vehicle);
  if (run) run.ended = true;
  clearTimer(vehicle);
  runs.delete(vehicle);
  const driverId = rented.get(vehicle.id);
  rented.delete(vehicle.id);
  vehicle.deleteStreamSyncedMeta('crp:busLabel');
  if (driver?.valid) {
    mint.emitClient(driver, 'crp:bus:clear');
    cef(driver, 'selectMenu.show = false; loader.show = false;');
    if (tell) {
      notifyInfo(driver, 'Рабочий день окончен');
      if (run) {
        const earned = run.saved * run.route.salary;
        mint.emitClient(driver, 'crp:chat', '!{#f3c800}Рабочий день окончен. Деньги придут на счет во время зарплаты');
        mint.emitClient(driver, 'crp:chat', `!{#f3c800}Заработано: !{#80c102}$${earned}`);
        mint.emitClient(driver, 'crp:chat', `!{#f3c800}Перевезено пассажиров: !{#009eec}${run.passengers}`);
        const character = getSession(driver).character;
        if (character) void character.save();
      }
    }
  }
  if (driverId && driverId !== driver?.id) {
    try {
      const current = mint.Player.getByID(driverId);
      if (current?.valid) mint.emitClient(current, 'crp:bus:clear');
    } catch {
      /* водитель уже вышел */
    }
  }
}

function parkBus(vehicle: mint.Vehicle, driver: mint.Player | null): void {
  const run = runs.get(vehicle);
  if (run) run.ended = true;
  for (const player of mint.Player.all) {
    if (player.valid && player.vehicle === vehicle) eject(player);
  }
  release(vehicle, driver, true);
  if (vehicle.valid) parkStored(vehicle);
}

export async function loadBusRoutes(): Promise<number> {
  const rows = (await table('BusRoute').findAll()) as DbRow[];
  const points = (await table('BusRoutePoint').findAll()) as DbRow[];
  const stops = (await table('BusStop').findAll()) as DbRow[];
  routes.clear();
  for (const row of rows) {
    routes.set(Number(row.id), {
      id: Number(row.id),
      name: String(row.name ?? 'Маршрут'),
      level: Number(row.level) || 0,
      salary: Number(row.salary) || 0,
      points: [],
    });
  }
  const ordered = [...points].sort((a, b) => Number(a.id) - Number(b.id));
  for (const row of ordered) {
    const route = routes.get(Number(row.routeId));
    if (!route) continue;
    route.points.push({
      x: Number(row.x),
      y: Number(row.y),
      z: Number(row.z),
      stop: Number(row.isStop) === 1,
    });
  }
  for (const stop of stops) {
    try {
      new mint.TextLabel(
        `Автобусная остановка \n ${String(stop.name ?? '')}`,
        'arial',
        0.35,
        0.35,
        new mint.Vector3(Number(stop.x), Number(stop.y), Number(stop.z)),
        new mint.Vector3(0, 0, 0),
        new mint.RGBA(255, 214, 64, 255),
        0,
        new mint.RGBA(0, 0, 0, 180),
        0,
        15,
      );
    } catch {
      /* подпись остановки не создалась */
    }
  }
  return routes.size;
}

export function installBus(): void {
  new mint.PointBlip(513, 435.45, -646.33, 28.74, 4, 0.8, true, 0, 'Автобусная станция');
  const shape = new mint.ColshapeSphere(435.91, -646.0, 28.55, 1.2, 0, true);
  setColshapeHandlers(shape, {
    onEnter: (player) => {
      const hired = Number(getSession(player).character?.job) === 3;
      const text = hired ? 'Уволиться с работы' : 'Устроиться на работу';
      cef(player, `selectMenu.menu = selectMenu.menus["busJobMenu"]; selectMenu.menu.items[0].text = ${JSON.stringify(text)}; selectMenu.show = true;`);
    },
    onExit: (player) => cef(player, 'selectMenu.show = false;'),
  });

  mint.onClient('crp:bus:job', (player) => {
    const character = getSession(player).character;
    if (!character) return;
    if (Number(character.job) === 3) {
      clearJob(player, 'Автобусная станция');
      return;
    }
    if (!character.passengerLicense) {
      notifyError(player, 'У вас нет прав на пассажирский транспорт', 'Автобусная станция');
      return;
    }
    assignJob(player, 3, 'Автобусная станция');
  });

  mint.on('playerEnteredVehicle', (player, vehicle) => {
    if (!busOf(vehicle)) return;
    const holder = rented.get(vehicle.id);
    if (!driverSeat(player)) {
      const run = runs.get(vehicle);
      if (!holder || !run || player.id === holder) return;
      let driver: mint.Player | null = null;
      try {
        driver = mint.Player.getByID(holder);
      } catch {
        driver = null;
      }
      if (!driver?.valid) {
        notifyError(player, 'Нет водителя');
        eject(player);
        return;
      }
      if (!run.price) {
        run.passengers += 1;
        return;
      }
      if ((Number(getSession(player).character?.cash) || 0) < run.price) {
        notifyError(player, 'Недостаточно денег');
        eject(player);
        return;
      }
      const price = run.price;
      void removeCash(player, price).then(async (paid) => {
        if (!paid || !player.valid) return;
        if (player.vehicle !== vehicle) {
          await addCash(player, price);
          return;
        }
        if (!(await addCash(driver, price))) {
          await addCash(player, price);
          notifyError(player, 'Ошибка оплаты');
          eject(player);
          return;
        }
        run.passengers += 1;
        notifySuccess(driver, `+$${price} за пассажира`, 'Автобус');
      });
      return;
    }
    if (holder === player.id) {
      clearTimer(vehicle);
      if (!runs.has(vehicle)) showMenu(player, vehicle);
      return;
    }
    if (holder) {
      notifyError(player, 'Транспорт уже арендован', 'Автобус');
      eject(player);
      return;
    }
    for (const [vehicleId, driverId] of rented) {
      if (driverId === player.id && vehicleId !== vehicle.id) {
        notifyError(player, 'Вы уже арендуете автобус', 'Автобус');
        eject(player);
        return;
      }
    }
    cef(player, `acceptWindow.header = 'Вы хотите арендовать автобус за $${RENT}?'; acceptWindow.name = 'bus_rent'; acceptWindow.show = true;`);
  });

  mint.on('playerLeftVehicle', (player, vehicle) => {
    if (!busOf(vehicle) || rented.get(vehicle.id) !== player.id) return;
    const run = runs.get(vehicle);
    if (run && !run.ended) cef(player, 'selectMenu.show = false;');
    if (!runs.has(vehicle)) cef(player, 'selectMenu.show = false;');
    if (run?.ended) return;
    notifyWarning(player, `У вас есть ${RESPAWN_MS / 1000} секунд, чтобы вернуться в транспорт`, 'Автобус');
    clearTimer(vehicle);
    respawn.set(vehicle, setTimeout(() => {
      respawn.delete(vehicle);
      if (!vehicle.valid || rented.get(vehicle.id) !== player.id) return;
      parkBus(vehicle, player.valid ? player : null);
    }, RESPAWN_MS));
  });

  mint.on('playerDisconnect', (player) => {
    for (const [vehicleId, driverId] of rented) {
      if (driverId !== player.id) continue;
      const vehicle = mint.Vehicle.all.find((entry) => entry.id === vehicleId);
      if (vehicle?.valid) parkBus(vehicle, null);
      else rented.delete(vehicleId);
    }
  });

  mint.onClient('crp:bus:rent', async (player, accept) => {
    const vehicle = player.vehicle;
    cef(player, 'acceptWindow.show = false; loader.show = false;');
    if (!accept || !vehicle || !busOf(vehicle) || !driverSeat(player)) {
      if (!accept) notifyWarning(player, 'Вы отказались от аренды', 'Автобус');
      if (player.vehicle) eject(player);
      return;
    }
    if (rented.get(vehicle.id) && rented.get(vehicle.id) !== player.id) {
      notifyError(player, 'Транспорт уже арендован', 'Автобус');
      eject(player);
      return;
    }
    if ((Number(getSession(player).character?.cash) || 0) < RENT) {
      notifyError(player, 'Недостаточно денег', 'Автобус');
      eject(player);
      return;
    }
    const paid = await removeCash(player, RENT);
    if (!paid) {
      notifyError(player, 'Ошибка аренды', 'Автобус');
      eject(player);
      return;
    }
    rented.set(vehicle.id, player.id);
    notifySuccess(player, 'Вы арендовали транспорт', 'Автобус');
    showMenu(player, vehicle);
  });

  mint.onClient('crp:bus:cancel', (player) => {
    if (player.vehicle && rented.get(player.vehicle.id) === player.id) eject(player);
  });

  mint.onClient('crp:bus:start', (player, rawIndex, rawPrice) => {
    const vehicle = player.vehicle;
    cef(player, 'loader.show = false;');
    const price = Math.trunc(Number(rawPrice));
    const list = offered.get(player) ?? [];
    const route = list[Math.trunc(Number(rawIndex) || 0)];
    if (!vehicle || !busOf(vehicle) || rented.get(vehicle.id) !== player.id || !driverSeat(player) || !route || !Number.isInteger(price) || price < 0 || price > 10) {
      notifyError(player, 'Это не рабочий транспорт', 'Автобус');
      return;
    }
    const run: Run = { route, index: 0, saved: 0, passengers: 0, readyAt: 0, price, ended: false };
    runs.set(vehicle, run);
    const label = price === 0 ? `~y~${route.name} \n~g~Проезд бесплатный` : `~y~${route.name} \n ~w~Стоимость проезда: ~g~$${price}`;
    vehicle.setStreamSyncedMeta('crp:busLabel', label);
    notifySuccess(player, 'Маршрут построен', 'Автобус');
    notifyInfo(player, 'Чтобы окончить рабочий день, нажмите F6', 'Автобус');
    sendPoint(player, run, 0);
  });

  mint.onClient('crp:bus:point', async (player) => {
    const vehicle = player.vehicle;
    const run = vehicle ? runs.get(vehicle) : undefined;
    if (!vehicle || !run || run.ended || rented.get(vehicle.id) !== player.id) return;
    const point = run.route.points[run.index];
    if (!point || Date.now() < run.readyAt || !near(player, point, 20)) return;
    const character = getSession(player).character;
    if (!character) return;
    const salary = Math.trunc(run.route.salary * (1 + jobExp(player, 3) / 100));
    character.pay = (Number(character.pay) || 0) + salary;
    run.saved += 1;
    if (run.saved % 10 === 0) {
      await character.save();
      void addJobExp(player, 0.05);
    }
    let delay = 0;
    if (point.stop) {
      notifyInfo(player, 'Ожидайте пассажиров', 'Остановка');
      delay = STOP_MS;
      sayNear(player, `!{#fff589}Автобус по маршруту !{#8ef0ff}${run.route.name} !{#fff589}отправляется через ${STOP_MS / 1000} секунд`);
    } else {
      notifySuccess(player, 'Продолжайте движение', 'Маршрут');
    }
    run.index += 1;
    if (run.index >= run.route.points.length) run.index = 0;
    sendPoint(player, run, delay);
  });

  mint.onClient('crp:bus:finish', (player) => {
    const vehicle = player.vehicle;
    if (!vehicle || rented.get(vehicle.id) !== player.id) {
      notifyWarning(player, 'Вы не в автобусе!');
      return;
    }
    const run = runs.get(vehicle);
    if (run) run.ended = true;
    parkBus(vehicle, player);
  });
}
