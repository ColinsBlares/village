import * as mint from 'mint-client';
import * as native from 'natives';
import { focusUi, pushCef } from '../cef/view.js';
import { colorIds, colorValues } from '../carshow/colors.js';

interface TuneInfo {
  id: number;
  price: number;
  multiplier: number;
  repair: number;
  color: number;
}

interface Category {
  key: string;
  type: number;
  name: string;
  ignore: boolean;
  names?: string[];
}

const CATEGORIES: Category[] = [
  { key: 'engineType', type: 11, name: 'Двигатель', ignore: false, names: ['Стандарт', 'Улучшение СУД, уровень 1', 'Улучшение СУД, уровень 2', 'Улучшение СУД, уровень 3', 'Улучшение СУД, уровень 4'] },
  { key: 'brakeType', type: 12, name: 'Тормоза', ignore: false, names: ['Стандартные тормоза', 'Уличные тормоза', 'Спортивные тормоза', 'Гоночные тормоза'] },
  { key: 'transmissionType', type: 13, name: 'Трансмиссия', ignore: false, names: ['Стандартная трансмиссия', 'Уличная трансмиссия', 'Спортивная трансмиссия', 'Гоночная трансмиссия'] },
  { key: 'suspensionType', type: 15, name: 'Подвеска', ignore: false, names: ['Стандартная подвеска', 'Заниженная подвеска', 'Уличная подвеска', 'Спортивная подвеска', 'Гоночная подвеска'] },
  { key: 'armourType', type: 16, name: 'Броня', ignore: false, names: ['Нет', 'Усиление брони 20%', 'Усиление брони 40%', 'Усиление брони 60%', 'Усиление брони 80%', 'Усиление брони 100%'] },
  { key: 'spoiler', type: 0, name: 'Спойлер', ignore: false },
  { key: 'frontBumper', type: 1, name: 'Передний бампер', ignore: false },
  { key: 'rearBumper', type: 2, name: 'Задний бампер', ignore: false },
  { key: 'sideSkirt', type: 3, name: 'Пороги', ignore: false },
  { key: 'exhaust', type: 4, name: 'Глушитель', ignore: false },
  { key: 'frame', type: 5, name: 'Рама', ignore: false },
  { key: 'grille', type: 6, name: 'Решетка радиатора', ignore: false },
  { key: 'hood', type: 7, name: 'Капот', ignore: false },
  { key: 'fender', type: 8, name: 'Крыло', ignore: false },
  { key: 'rightFender', type: 9, name: 'Правое крыло', ignore: false },
  { key: 'roof', type: 10, name: 'Крыша', ignore: false },
  { key: 'frontWheels', type: 23, name: 'Колеса', ignore: false },
  { key: 'livery', type: 48, name: 'Покрасочные работы', ignore: false },
  { key: 'windowTint', type: 55, name: 'Тонировка', ignore: true, names: ['Нет', 'Слабое затемнение', 'Среднее затемнение', 'Лимузин'] },
  { key: 'xenon', type: 22, name: 'Фары', ignore: true, names: ['Обычные', 'Ксеноновые'] },
];

const RATES: Record<number, number> = { 11: 0.02, 12: 0.02, 13: 0.01, 15: 0.01, 16: 0.03 };

let info: TuneInfo | null = null;
let current: Category | null = null;
let primary = 0;
let secondary = 0;
let pending: { kind: 'repair' | 'color' | 'mod'; type?: number; index?: number } | null = null;

function vehicleId(): number {
  return mint.Player.local.vehicle?.scriptID ?? 0;
}

function priceOf(type: number, index: number): number {
  if (!info || index < 0) return 0;
  return Math.trunc((RATES[type] ?? 0.005) * info.price * (index + 1) * info.multiplier);
}

function modName(id: number, type: number, index: number, category: Category): string {
  if (category.names) return category.names[index + 1] ?? `${category.name} ${index + 1}`;
  if (index < 0) return 'Нет';
  const gxt = native.getModTextLabel(id, type, index);
  if (!gxt || gxt === 'NULL' || !native.doesTextLabelExist(gxt)) return `${category.name} ${index + 1}`;
  const text = native.getFilenameForAudioConversation(gxt);
  return text && text !== 'NULL' ? text : `${category.name} ${index + 1}`;
}

function showMain(): void {
  if (!info) return;
  const id = vehicleId();
  const lines = [
    `selectMenu.menu = cloneObj(selectMenu.menus["tuningMain"]);`,
    `selectMenu.menu.items[0].values = ${JSON.stringify([`$${info.repair}`])};`,
  ];
  for (const category of CATEGORIES) {
    const count = category.ignore ? (category.names?.length ?? 1) - 1 : (id ? native.getNumVehicleMods(id, category.type) : 0);
    if (count <= 0) continue;
    lines.push(`selectMenu.menu.items.push({ text: ${JSON.stringify(category.name)} });`);
  }
  lines.push(`selectMenu.menu.items.push({ text: 'Закрыть' });`, 'selectMenu.show = true;');
  pushCef(lines.join('\n'));
  focusUi(true);
}

function showCategory(key: string): void {
  const category = CATEGORIES.find((item) => item.key === key);
  const id = vehicleId();
  if (!category || !info || !id) return;
  current = category;
  const count = category.ignore ? (category.names?.length ?? 1) - 1 : native.getNumVehicleMods(id, category.type);
  const items: { text: string; values: string[] }[] = [];
  for (let index = -1; index < count; index += 1) {
    const text = modName(id, category.type, index, category);
    if (!text) continue;
    items.push({ text, values: index < 0 ? ['$0'] : [`$${priceOf(category.type, index)}`] });
  }
  items.push({ text: 'Назад', values: [] });
  const installed = (category.ignore ? -1 : native.getVehicleMod(id, category.type)) + 1;
  if (items[installed]) items[installed].values = ['уст.'];
  pushCef([
    `selectMenu.setItems('tuningDefault', ${JSON.stringify(items)});`,
    `selectMenu.menu = cloneObj(selectMenu.menus["tuningDefault"]);`,
    `selectMenu.menu.header = ${JSON.stringify(category.name)};`,
    'selectMenu.show = true;',
  ].join('\n'));
}

function preview(type: number, index: number): void {
  const id = vehicleId();
  if (!id) return;
  if (type === 55) native.setVehicleWindowTint(id, index < 0 ? 0 : index);
  else if (type === 22) native.toggleVehicleMod(id, 22, index >= 0);
  else native.setVehicleMod(id, type, index, false);
}

function closeTuning(): void {
  const id = vehicleId();
  if (id) native.freezeEntityPosition(id, false);
  info = null;
  current = null;
  pending = null;
  pushCef('selectMenu.show = false;');
  focusUi(false);
  mint.emitServer('crp:tuning:end');
}

export function handleTuning(name: string, args: unknown[]): boolean {
  if (!info && name !== 'pay.choose.ans') return false;
  if (name === 'tuning.end') {
    closeTuning();
    return true;
  }
  if (name === 'tuning.menu.show') {
    showMain();
    return true;
  }
  if (name === 'tuning.repair') {
    pending = { kind: 'repair' };
    pushCef(`mp.event.call('pay.choose', []);`);
    return true;
  }
  if (name === 'tuning.colorMenu.show' && info) {
    pushCef([
      `selectMenu.menu = cloneObj(selectMenu.menus["tuningColors"]);`,
      `selectMenu.menu.items[0].values = ${JSON.stringify(colorValues)};`,
      `selectMenu.menu.items[1].values = ${JSON.stringify(colorValues)};`,
      `selectMenu.menu.items[2].values = ${JSON.stringify([`$${info.color}`])};`,
      'selectMenu.show = true;',
    ].join('\n'));
    return true;
  }
  if (name === 'tuning.colors') {
    const first = Number(args[1]);
    const second = Number(args[2]);
    if (first !== -1) primary = first;
    if (second !== -1) secondary = second;
    const id = vehicleId();
    if (id) native.setVehicleColours(id, colorIds[primary] ?? primary, colorIds[secondary] ?? secondary);
    return true;
  }
  if (name === 'tuning.colors.confirm') {
    pending = { kind: 'color' };
    pushCef(`mp.event.call('pay.choose', []);`);
    return true;
  }
  if (name === 'tuning.defaultMenu.show' && typeof args[1] === 'string') {
    showCategory(args[1]);
    return true;
  }
  if (name === 'tuning.mod.set' && current) {
    preview(current.type, Number(args[2]));
    return true;
  }
  if (name === 'tuning.buy' && current) {
    pending = { kind: 'mod', type: current.type, index: Number(args[2]) };
    pushCef(`mp.event.call('pay.choose', []);`);
    return true;
  }
  if (name === 'tuning.params.set') return true;
  if (name === 'tuning.lastIndex.set') return true;
  if (name === 'pay.choose.ans' && pending && info) {
    const method = Number(args[1]);
    const request = pending;
    pending = null;
    if (method !== 0 && method !== 1) {
      pushCef('selectMenu.loader = false;');
      return true;
    }
    if (request.kind === 'repair') mint.emitServer('crp:tuning:repair', method);
    else if (request.kind === 'color') mint.emitServer('crp:tuning:color', colorIds[primary] ?? primary, colorIds[secondary] ?? secondary, method);
    else mint.emitServer('crp:tuning:buy', request.type ?? 0, request.index ?? -1, method);
    return true;
  }
  return false;
}

export function installTuning(): void {
  mint.onServer('crp:tuning', (raw) => {
    if (typeof raw !== 'string') return;
    info = JSON.parse(raw) as TuneInfo;
    primary = 0;
    secondary = 0;
    const id = vehicleId();
    if (id) native.freezeEntityPosition(id, true);
    native.doScreenFadeOut(80);
    mint.setTimeout(() => native.doScreenFadeIn(500), 500);
    showMain();
  });
}
