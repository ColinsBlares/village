import * as mint from 'mint-client';
import * as native from 'natives';
import { focusUi, pushCef } from '../cef/view.js';

let electric = false;
let privateCar = false;
let driving = false;
let buyer = 0;
let price = 0;
let ejects: { id: number; name: string }[] = [];

function note(kind: 'error' | 'warning' | 'success' | 'info', text: string, header = 'Транспорт'): void {
  pushCef(`notifications.${kind}(${JSON.stringify(text)}, ${JSON.stringify(header)});`);
}

function showEject(raw: string): void {
  ejects = JSON.parse(raw) as { id: number; name: string }[];
  pushCef('interactionMenu.left = 60; interactionMenu.menu = cloneObj(interactionMenu.menus["vehicle_ejectlist"]);');
  for (const person of ejects) {
    pushCef(`interactionMenu.menu.items.push({ text: ${JSON.stringify(`ID: ${person.id}`)}, icon: "person.png" });`);
  }
  focusUi(true);
  pushCef('interactionMenu.show = true;');
}

function toggleAutopilot(): void {
  const local = mint.Player.local;
  const vehicle = local?.vehicle;
  if (!local?.valid || !vehicle) return note('error', 'Вы не в авто');
  if (driving) {
    driving = false;
    native.clearPedTasks(local.scriptID);
    note('info', 'Автопилот деактивирован');
    return;
  }
  if (!electric) return note('warning', 'На этот транспорт не установлен автопилот');
  const blip = native.getFirstBlipInfoId(8);
  if (!blip) return note('warning', 'Укажите точку на карте', 'Автопилот');
  const pos = native.getBlipInfoIdCoord(blip);
  if (pos.x === 0 && pos.y === 0) return note('warning', 'Укажите точку на карте', 'Автопилот');
  driving = true;
  native.taskVehicleDriveToCoordLongrange(local.scriptID, vehicle.scriptID, pos.x, pos.y, pos.z + 2, 25, 1074528293, 50);
  note('success', 'Автопилот активирован', 'Автопилот');
}

function openSell(): void {
  if (!mint.Player.local?.vehicle) return note('error', 'Вы не в авто', 'Ошибка');
  if (!privateCar) return note('error', 'Это не ваш транспорт', 'Ошибка');
  focusUi(true);
  pushCef(`inputWindow.name = 'carsell_id';
inputWindow.header = "Продажа транспорта";
inputWindow.hint = "Введите ID покупателя";
inputWindow.inputHint = "ID покупателя...";
inputWindow.value = "";
inputWindow.show = true;`);
}

export function handleVehicleCabin(name: string, args: unknown[]): boolean {
  if (name === 'vehicles.autopilot') {
    toggleAutopilot();
    return true;
  }
  if (name === 'vehicles.siren.sound') {
    const vehicle = mint.Player.local?.vehicle;
    if (vehicle) mint.emitServer('crp:veh:siren', vehicle.remoteID);
    return true;
  }
  if (name === 'vehicles.sell.show') {
    openSell();
    return true;
  }
  if (name === 'vehicles.sell.close') {
    buyer = 0;
    price = 0;
    pushCef('inputWindow.show = false;');
    return true;
  }
  if (name === 'vehicles.sell.id') {
    const id = Number(args[1]);
    const local = mint.Player.local;
    if (!local?.vehicle || !Number.isFinite(id) || id < 0) return note('error', 'Некорректный ID', 'Ошибка'), true;
    if (id === local.id) return note('error', 'Нельзя продать транспорт себе', 'Ошибка'), true;
    const near = mint.Player.streamedIn.some((entry) => entry.id === id && local.pos.distanceTo(entry.pos) <= 10);
    if (!near) return note('error', 'Игрока нет рядом', 'Ошибка'), true;
    buyer = id;
    pushCef(`inputWindow.name = 'carsell_price';
inputWindow.header = "Продажа транспорта";
inputWindow.hint = "Введите цену Т/С";
inputWindow.inputHint = "Цена...";
inputWindow.value = "";`);
    return true;
  }
  if (name === 'vehicles.sell.price') {
    price = Number(args[1]);
    if (!mint.Player.local?.vehicle || !Number.isFinite(price) || price < 1) return note('error', 'Некорректная цена', 'Ошибка'), true;
    mint.emitServer('crp:veh:sell', JSON.stringify({ id: buyer, price }));
    pushCef('inputWindow.show = false; loader.show = true;');
    return true;
  }
  if (name === 'interaction.ejectlist.get') {
    const vehicle = mint.Player.local?.vehicle;
    if (vehicle) mint.emitServer('crp:veh:eject:list', vehicle.remoteID);
    return true;
  }
  if (name === 'interaction.eject') {
    const person = ejects[Number(args[1]) || 0];
    if (person) mint.emitServer('crp:veh:eject', JSON.stringify(person));
    return true;
  }
  return false;
}

export function installVehicleCabin(): void {
  mint.onServer('crp:veh:flags', (auto, priv) => {
    electric = auto === true;
    privateCar = priv === true;
    driving = false;
  });
  mint.onServer('crp:eject:list', (raw) => {
    if (typeof raw === 'string') showEject(raw);
  });
  mint.onServer('crp:veh:leave', () => {
    const local = mint.Player.local;
    const vehicle = local?.vehicle;
    if (!local?.valid || !vehicle) return;
    native.taskLeaveVehicle(local.scriptID, vehicle.scriptID, 16);
  });
}
