import * as mint from 'mint-client';
import { pay } from '../places/index.js';
import { pushCef } from '../cef/view.js';
import { busyAdd, busyHas, busyRemove } from '../ui/busy.js';

export function handleFuel(name: string, args: unknown[]): boolean {
  if (name === 'fuelstations.menu.close') {
    pushCef('selectMenu.show = false;');
    return true;
  }
  if (name === 'fuelstations.fill.litres.show') {
    pushCef('selectMenu.show = false;');
    busyAdd('fuelstations.litres', true);
    pushCef(`inputWindow.name = 'fuelstations_litres';
inputWindow.header = "Заправка";
inputWindow.hint = "Введите количество литров";
inputWindow.inputHint = "Количество...";
inputWindow.value = "";
inputWindow.show = true;`);
    return true;
  }
  if (name === 'fuelstations.fill.litres.close') {
    pushCef('inputWindow.show = false;');
    busyRemove('fuelstations.litres');
    return true;
  }
  if (name === 'fuelstations.fill.litres.send') {
    const litres = Number.parseInt(String(args[1] ?? ''), 10);
    if (!Number.isInteger(litres) || litres < 1) {
      pushCef(`notifications.error(${JSON.stringify('Некорректное значение')}, ${JSON.stringify('Ошибка')});`);
      return true;
    }
    pushCef('inputWindow.show = false; loader.show = true;');
    busyRemove('fuelstations.litres');
    pay('crp:fuel:litres', [litres]);
    return true;
  }
  if (name === 'fuelstations.fill.fulltank') {
    pushCef('selectMenu.show = false;');
    pay('crp:fuel:litres', [-1]);
    return true;
  }
  return false;
}

export function installShopKeys(): void {
  mint.on('keyup', (key) => {
    if (key !== 69 || busyHas()) return;
    mint.emitServer('crp:shop:use');
  });
}
