import * as mint from 'mint-client';
import * as native from 'natives';
import { focusUi, pushCef } from '../cef/view.js';
import { colorIds, colorValues } from './colors.js';

interface ShowCar {
  sqlId: number;
  vehiclePropertyModel: string;
  count: number;
  properties: { name: string; price: number; maxFuel: number; isElectric?: boolean };
}

interface ShowInfo {
  id: number;
  name: string;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  toX: number;
  toY: number;
  toZ: number;
  toH: number;
}

let list: ShowCar[] = [];
let info: ShowInfo | null = null;
let index = 0;
let primary = 0;
let secondary = 0;
let preview: mint.LocalVehicle | null = null;
let cam = 0;
let pending: { sqlId: number; primary: number; secondary: number } | null = null;

const CLASSES = ['Компакт', 'Седан', 'SUV', 'Купе', 'Маслкар', 'Спорт. классика', 'Спорткар', 'Суперкар', 'Мотоцикл', 'Внедорожник'];

function specs(i: number): void {
  const car = list[i];
  const id = preview?.scriptID ?? 0;
  const vehicleClass = id ? native.getVehicleClass(id) : -1;
  const className = vehicleClass === 13 ? 'Велосипед' : CLASSES[vehicleClass] ?? 'Транспорт';
  const speed = preview ? Math.round(native.getVehicleModelEstimatedMaxSpeed(preview.model) * 3.6 * 1.05) : 0;
  const fuel = car.properties.isElectric || className === 'Велосипед' ? '—' : String(car.properties.maxFuel);
  pushCef([
    `carSpecifications.body.name.value = ${JSON.stringify(car.properties.name)};`,
    `carSpecifications.body.class.value = ${JSON.stringify(className)};`,
    `carSpecifications.body.volume.value = ${JSON.stringify(fuel)};`,
    `carSpecifications.body.maxSpeed.value = ${JSON.stringify(String(speed))};`,
    `carSpecifications.body.count.value = ${JSON.stringify(String(Math.max(0, car.count)))};`,
    `carSpecifications.price = ${JSON.stringify(String(car.properties.price))};`,
    'carSpecifications.show = true;',
  ].join('\n'));
}

function showCar(i: number): void {
  if (!info) return;
  preview?.destroy();
  const car = list[i];
  preview = new mint.LocalVehicle(
    car.vehiclePropertyModel,
    mint.Player.local.dimension,
    new mint.Vector3(info.toX, info.toY, info.toZ),
    new mint.Vector3(0, 0, (info.toH * Math.PI) / 180),
  );
  native.setVehicleColours(preview.scriptID, colorIds[primary] ?? primary, colorIds[secondary] ?? secondary);
  specs(i);
}

function closeLocal(): void {
  preview?.destroy();
  preview = null;
  if (cam) {
    native.setCamActive(cam, false);
    native.destroyCam(cam, false);
    native.renderScriptCams(false, false, 0, true, false, 0);
    cam = 0;
  }
  pushCef('selectMenu.show = false; carSpecifications.show = false; prompt.hide();');
  focusUi(false);
}

export function handleCarshow(name: string, args: unknown[]): boolean {
  if (name === 'carshow.list.close') {
    closeLocal();
    mint.emitServer('crp:carshow:close');
    list = [];
    info = null;
    index = 0;
    primary = 0;
    secondary = 0;
    return true;
  }
  if (name === 'carshow.vehicle.show' && info) {
    index = Number(args[1]) || 0;
    showCar(index);
    return true;
  }
  if (name === 'carshow.vehicle.color' && preview) {
    const first = Number(args[1]);
    const second = Number(args[2]);
    if (first !== -1) primary = first;
    if (second !== -1) secondary = second;
    native.setVehicleColours(preview.scriptID, colorIds[primary] ?? primary, colorIds[secondary] ?? secondary);
    return true;
  }
  if (name === 'carshow.car.buy' && list[index]) {
    pending = { sqlId: list[index].sqlId, primary: colorIds[primary] ?? primary, secondary: colorIds[secondary] ?? secondary };
    pushCef(`mp.event.call('pay.choose', []);`);
    return true;
  }
  if (name === 'pay.choose.ans' && pending) {
    const method = Number(args[1]);
    const current = pending;
    pending = null;
    if (method !== 0 && method !== 1) {
      pushCef('selectMenu.loader = false;');
      return true;
    }
    mint.emitServer('crp:carshow:buy', current.sqlId, current.primary, current.secondary, method);
    return true;
  }
  return false;
}

export function installCarshow(): void {
  mint.onServer('crp:carshow', (raw) => {
    if (typeof raw !== 'string') return;
    const data = JSON.parse(raw) as { show: ShowInfo; list: ShowCar[] };
    if (!data.list.length) return;
    list = data.list;
    info = data.show;
    index = 0;
    primary = 0;
    secondary = 0;
    cam = native.createCamWithParams('DEFAULT_SCRIPTED_CAMERA', info.cameraX, info.cameraY, info.cameraZ, 0, 0, 0, 70, true, 2);
    native.pointCamAtCoord(cam, info.toX, info.toY, info.toZ);
    native.setCamActive(cam, true);
    native.renderScriptCams(true, false, 0, true, false, 0);
    focusUi(true);
    const names = list.map((car) => car.properties.name);
    pushCef([
      `selectMenu.menu = selectMenu.menus["carShowMenu"];`,
      `selectMenu.menu.header = ${JSON.stringify(info.name.split(' ')[0])};`,
      `selectMenu.menu.items[0].values = ${JSON.stringify(names)};`,
      `selectMenu.menu.items[1].values = ${JSON.stringify(colorValues)};`,
      `selectMenu.menu.items[2].values = ${JSON.stringify(colorValues)};`,
      'selectMenu.show = true;',
      `prompt.showByName('carshow_control');`,
    ].join('\n'));
    showCar(0);
  });
  mint.onServer('crp:carshow:ans', (code, carName, parkingRaw) => {
    const ans = Number(code);
    const name = String(carName ?? '');
    pushCef('selectMenu.loader = false;');
    if (ans === 0) pushCef(`notifications.error('Т/с нет в наличии', 'Ошибка');`);
    else if (ans === 2) pushCef(`notifications.error('Недостаточно денег', 'Ошибка');`);
    else if (ans === 3) pushCef(`notifications.error('Операция не прошла', 'Ошибка');`);
    else if (ans === 5) pushCef(`notifications.error('Достигнут лимит на т/с', 'Ошибка');`);
    else if (ans === 7) pushCef(`notifications.error(${JSON.stringify(name || 'Нет места')}, 'Инвентарь');`);
    else if (ans === 1 || ans === 6) {
      pushCef(`notifications.success('Вы приобрели транспорт', 'Успех');`);
      if (ans === 1) {
        const parking = JSON.parse(String(parkingRaw || '{}')) as { x?: number; y?: number };
        if (typeof parking.x === 'number' && typeof parking.y === 'number') native.setNewWaypoint(parking.x, parking.y);
      }
      closeLocal();
      mint.emitServer('crp:carshow:close');
    }
  });
}
