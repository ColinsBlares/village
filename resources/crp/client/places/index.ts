import * as mint from 'mint-client';
import * as native from 'natives';
import { focusUi, pushCef } from '../cef/view.js';
import { facialHairList, hairColorList, hairList } from './hair.js';
import { handleBody, installBody } from './body.js';

interface Cam {
  x: number;
  y: number;
  z: number;
  lookX: number;
  lookY: number;
  lookZ: number;
  fov: number;
}

interface Piece {
  id: number;
  name: string;
  price: number;
  variation: number;
  textures: number[];
  dlc?: number;
  torso?: number;
  undershirt?: number;
  pockets?: unknown;
  clime?: unknown;
}

interface BarberState {
  bType: number;
  gender: number;
  prices: { hairstylePrice: number; facialHairPrice: number; colorChangePrice: number };
  appearance: { hairstyle: number; hairColor: number; hairHighlightColor: number; facialHair: number; facialHairColor: number };
}

const CLOTHES: Record<string, { name: string; menu: string; component?: number; prop?: number }> = {
  bracelets: { name: 'Браслеты', menu: 'Bracelets', prop: 7 },
  ears: { name: 'Серьги', menu: 'Ears', prop: 2 },
  glasses: { name: 'Очки', menu: 'Glasses', prop: 1 },
  hats: { name: 'Головные уборы', menu: 'Hats', prop: 0 },
  pants: { name: 'Ноги', menu: 'Pants', component: 4 },
  shoes: { name: 'Обувь', menu: 'Shoes', component: 6 },
  ties: { name: 'Галстуки', menu: 'Ties', component: 7 },
  tops: { name: 'Тело', menu: 'Tops', component: 11 },
  watches: { name: 'Часы', menu: 'Watches', prop: 6 },
};

const BARBER_HEADERS = ['', 'beachcombover.png', 'herrkutz.png', 'haironhawick.png', 'osheas.png', 'bobmullet.png'];
const CLOTH_COMPONENTS = [3, 4, 6, 7, 8, 11];
const CLOTH_PROPS = [0, 1, 2, 6, 7];

let cam = 0;
let fitting = false;
let turnLeft = false;
let turnRight = false;
let tick: number | null = null;
let clothes: Record<string, Piece[]> = {};
let multiplier = 1;
let clothHeader = 'binco.png';
let barber: BarberState | null = null;
let colorType = 0;
let pending: { event: string; args: unknown[] } | null = null;
let transferAccount = 0;
let transferSum = 0;
const wornClothes = new Map<number, { drawable: number; texture: number }>();
const wornProps = new Map<number, { drawable: number; texture: number }>();

function ped(): number {
  return mint.Player.local.scriptID;
}

export function fillMenu(name: string, items: unknown[], header?: string): void {
  const lines = [`selectMenu.setItems(${JSON.stringify(name)}, ${JSON.stringify(items)});`];
  if (header) lines.push(`selectMenu.menus[${JSON.stringify(name)}].headerImg = ${JSON.stringify(header)};`);
  pushCef(lines.join('\n'));
}

export function showMenu(name: string, items: unknown[], header?: string): void {
  fillMenu(name, items, header);
  pushCef(`selectMenu.menu = selectMenu.menus[${JSON.stringify(name)}]; selectMenu.show = true;`);
}

export function pay(event: string, args: unknown[]): void {
  pending = { event, args };
  pushCef(`mp.event.call('pay.choose', []);`);
}

export function startCam(data: Cam): void {
  stopCam();
  fitting = true;
  cam = native.createCamWithParams('DEFAULT_SCRIPTED_CAMERA', data.x, data.y, data.z, 0, 0, 0, data.fov, true, 2);
  native.pointCamAtCoord(cam, data.lookX, data.lookY, data.lookZ);
  native.setCamActive(cam, true);
  native.renderScriptCams(true, true, 300, true, false, 0);
  focusUi(true);
}

function stopCam(): void {
  fitting = false;
  turnLeft = false;
  turnRight = false;
  pending = null;
  if (cam) {
    native.setCamActive(cam, false);
    native.destroyCam(cam, false);
    native.renderScriptCams(false, true, 300, true, false, 0);
    cam = 0;
  }
  focusUi(false);
}

function snapshot(): void {
  const id = ped();
  wornClothes.clear();
  wornProps.clear();
  for (const component of CLOTH_COMPONENTS) {
    wornClothes.set(component, {
      drawable: native.getPedDrawableVariation(id, component),
      texture: native.getPedTextureVariation(id, component),
    });
  }
  for (const prop of CLOTH_PROPS) {
    wornProps.set(prop, {
      drawable: native.getPedPropIndex(id, prop),
      texture: native.getPedPropTextureIndex(id, prop),
    });
  }
}

function restore(): void {
  const id = ped();
  for (const [component, item] of wornClothes) native.setPedComponentVariation(id, component, item.drawable, item.texture, 0);
  for (const [prop, item] of wornProps) {
    if (item.drawable < 0) native.clearPedProp(id, prop);
    else native.setPedPropIndex(id, prop, item.drawable, item.texture, true);
  }
}

function listOf(value: unknown): number[] {
  if (Array.isArray(value)) return value.map((item) => Number(item) || 0);
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map((item) => Number(item) || 0) : [];
  } catch {
    return [];
  }
}

function preview(group: string, index: number, textureIndex: number): void {
  const item = clothes[group]?.[index];
  const info = CLOTHES[group];
  if (!item || !info) return;
  const id = ped();
  const texture = item.textures[textureIndex] ?? 0;
  if (group === 'tops') {
    native.setPedComponentVariation(id, 3, item.torso ?? 0, 0, 0);
    native.setPedComponentVariation(id, 8, item.undershirt ?? 0, 0, 0);
  }
  if (info.component != null) {
    if (item.dlc) mint.setPedDlcClothes(id, item.dlc, info.component, item.variation, texture, 0);
    else native.setPedComponentVariation(id, info.component, item.variation, texture, 0);
  } else if (info.prop != null) native.setPedPropIndex(id, info.prop, item.variation, texture, true);
  const clime = listOf(item.clime);
  const pockets = listOf(item.pockets);
  const parts: string[] = [];
  if (clime.length >= 2) parts.push(`Климат: от ${clime[0]} до ${clime[1]} °C`);
  if (pockets.length >= 2) {
    let capacity = 0;
    for (let i = 0; i < pockets.length; i += 2) capacity += pockets[i] * pockets[i + 1];
    parts.push(`Вместимость: ${capacity} ед.`);
  }
  if (parts.length) pushCef(`selectMenu.notification = ${JSON.stringify(parts.join(' | '))};`);
}

function openClothing(raw: string): void {
  const data = JSON.parse(raw) as {
    header: string;
    multiplier: number;
    lists: Record<string, Piece[]>;
    hair: { hairstyle: number; hairColor: number; hairHighlightColor: number };
    cam: Cam;
  };
  clothes = data.lists;
  multiplier = data.multiplier;
  clothHeader = data.header;
  snapshot();
  const id = ped();
  native.setPedComponentVariation(id, 1, 0, 0, 0);
  native.setPedComponentVariation(id, 2, data.hair.hairstyle, 0, 2);
  native.setPedHairTint(id, data.hair.hairColor, data.hair.hairHighlightColor);
  const main: { text: string }[] = [];
  for (const group of Object.keys(CLOTHES)) {
    const rows = clothes[group];
    if (!rows?.length) continue;
    main.push({ text: CLOTHES[group].name });
    const items = rows.map((row) => ({
      text: `${row.name} [$${Math.trunc(row.price * multiplier)}]`,
      values: (row.textures.length ? row.textures : [0]).map((_, index) => `№${index + 1}`),
    }));
    items.push({ text: 'Назад', values: [] });
    fillMenu(`clothing${CLOTHES[group].menu}`, items, clothHeader);
  }
  main.push({ text: 'Закрыть' });
  showMenu('clothingMain', main, clothHeader);
  startCam(data.cam);
}

function openBarber(raw: string): void {
  const data = JSON.parse(raw) as BarberState & { cam: Cam };
  barber = data;
  const id = ped();
  native.setPedComponentVariation(id, 1, 0, 0, 0);
  native.clearAllPedProps(id);
  showBarberMain();
  startCam(data.cam);
}

function showBarberMain(): void {
  if (!barber) return;
  const items = [{ text: 'Прически' }, { text: 'Цвет волос' }, { text: 'Доп. цвет волос' }];
  if (barber.gender === 0) items.push({ text: 'Растительность на лице' }, { text: 'Цвет растительности на лице' });
  items.push({ text: 'Выйти' });
  showMenu('barbershopMain', items, BARBER_HEADERS[barber.bType] || undefined);
}

function applyLook(id: number, look: number[]): void {
  const [hair, color, highlight, beard, beardColor] = look;
  native.setPedComponentVariation(id, 2, hair, 0, 2);
  native.setPedHairTint(id, color, highlight);
  native.setPedHeadOverlay(id, 1, beard, 1);
  native.setPedHeadOverlayTint(id, 1, 1, beardColor, 0);
}

function numbersOf(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const look = value.filter((item): item is number => typeof item === 'number');
  return look.length >= 5 ? look : null;
}

export function handleShop(name: string, args: unknown[]): boolean {
  if (handleBody(name, args)) return true;
  if (name === 'pay.choose.ans') {
    const method = Number(args[1]);
    const current = pending;
    pending = null;
    if (!current || (method !== 0 && method !== 1)) {
      pushCef(`mp.event.call('pay.choose.cancel', []); selectMenu.loader = false;`);
      return true;
    }
    (mint.emitServer as (event: string, ...payload: unknown[]) => void)(current.event, ...current.args, method);
    return true;
  }
  if (name === 'clothingShop.exit') {
    mint.emitServer('clothingShop.exit');
    return true;
  }
  if (name === 'clothingShop.inputClothes.set') {
    restore();
    return true;
  }
  if (name === 'clothingShop.item.set') {
    preview(String(args[1] ?? ''), Number(args[2]) || 0, Number(args[3]) || 0);
    return true;
  }
  if (name === 'clothingShop.item.buy') {
    const group = String(args[1] ?? '');
    const item = clothes[group]?.[Number(args[2]) || 0];
    if (!item) {
      pushCef(`selectMenu.loader = false; selectMenu.notification = 'Предмет не найден';`);
      return true;
    }
    pay('clothingShop.item.buy', [group, item.id, Number(args[3]) || 0]);
    return true;
  }
  if (name === 'barbershop.exit') {
    mint.emitServer('barbershop.exit');
    return true;
  }
  if (name === 'barbershop.mainMenu.show') {
    showBarberMain();
    return true;
  }
  if (name === 'barbershop.hairstylesMenu.show' && barber) {
    const rows = hairList[barber.gender] ?? hairList[0];
    const items = rows.map((row) => ({ text: row.name, values: [`$${barber?.prices.hairstylePrice ?? 0}`] }));
    items.push({ text: 'Назад', values: [] });
    native.setPedComponentVariation(ped(), 2, 0, 0, 2);
    showMenu('barbershopHairstyles', items, BARBER_HEADERS[barber.bType] || undefined);
    return true;
  }
  if (name === 'barbershop.hairstyle.set' && barber) {
    const row = (hairList[barber.gender] ?? hairList[0])[Number(args[1]) || 0];
    if (row) native.setPedComponentVariation(ped(), 2, row.id, 0, 2);
    return true;
  }
  if (name === 'barbershop.hairstyle.buy' && barber) {
    const row = (hairList[barber.gender] ?? hairList[0])[Number(args[1]) || 0];
    if (!row) return true;
    pay('barbershop.hairstyle.buy', [row.id]);
    return true;
  }
  if (name === 'barbershop.facialHairMenu.show' && barber) {
    const items = facialHairList.map((text) => ({ text, values: [`$${barber?.prices.facialHairPrice ?? 0}`] }));
    items.push({ text: 'Назад', values: [] });
    native.setPedHeadOverlay(ped(), 1, 255, 1);
    showMenu('barbershopFacialHair', items, BARBER_HEADERS[barber.bType] || undefined);
    return true;
  }
  if (name === 'barbershop.facialHair.set' && barber) {
    const index = Number(args[1]) || 0;
    native.setPedHeadOverlay(ped(), 1, index === 0 ? 255 : index - 1, 1);
    native.setPedHeadOverlayTint(ped(), 1, 1, barber.appearance.facialHairColor, 0);
    return true;
  }
  if (name === 'barbershop.facialHair.buy') {
    const index = Number(args[1]) || 0;
    pay('barbershop.facialHair.buy', [index === 0 ? 255 : index - 1]);
    return true;
  }
  if (name === 'barbershop.colorMenu.show' && barber) {
    colorType = Number(args[1]) || 0;
    const id = ped();
    if (colorType === 0) native.setPedHairTint(id, 0, barber.appearance.hairHighlightColor);
    else if (colorType === 1) native.setPedHairTint(id, barber.appearance.hairColor, 0);
    else native.setPedHeadOverlayTint(id, 1, 1, 0, 0);
    showMenu('barbershopColor', [
      { text: 'Цвета', values: hairColorList },
      { text: 'Применить', values: [`$${barber.prices.colorChangePrice}`] },
      { text: 'Назад' },
    ], BARBER_HEADERS[barber.bType] || undefined);
    return true;
  }
  if (name === 'barbershop.color.set' && barber) {
    const color = Number(args[1]) || 0;
    const id = ped();
    if (colorType === 0) native.setPedHairTint(id, color, barber.appearance.hairHighlightColor);
    else if (colorType === 1) native.setPedHairTint(id, barber.appearance.hairColor, color);
    else native.setPedHeadOverlayTint(id, 1, 1, color, 0);
    return true;
  }
  if (name === 'barbershop.color.buy') {
    pay('barbershop.color.buy', [colorType, Number(args[1]) || 0]);
    return true;
  }
  if (name === 'bank.close') {
    mint.emitServer('bank.close');
    return true;
  }
  if (name === 'bank.push') {
    mint.emitServer('bank.push', Math.floor(Number(args[1]) || 0));
    return true;
  }
  if (name === 'bank.pop') {
    mint.emitServer('bank.pop', Math.floor(Number(args[1]) || 0));
    return true;
  }
  if (name === 'bank.phone.push') {
    mint.emitServer('bank.phone.push', Math.floor(Number(args[1]) || 0));
    return true;
  }
  if (name === 'bank.house.push') {
    mint.emitServer('bank.house.push', Math.floor(Number(args[1]) || 0), Math.floor(Number(args[2]) || 0));
    return true;
  }
  if (name === 'bank.biz.push') {
    mint.emitServer('bank.biz.push', Math.floor(Number(args[1]) || 0), Math.floor(Number(args[2]) || 0));
    return true;
  }
  if (name === 'bank.biz.cashbox.push' || name === 'bank.biz.cashbox.pop') {
    mint.emitServer(name, Math.floor(Number(args[1]) || 0), Math.floor(Number(args[2]) || 0));
    return true;
  }
  if (name === 'bank.transfer.ask') {
    transferAccount = Math.floor(Number(args[1]) || 0);
    transferSum = Math.floor(Number(args[2]) || 0);
    mint.emitServer('bank.transfer.ask', transferAccount);
    return true;
  }
  if (name === 'bank.transfer') {
    mint.emitServer('bank.transfer', transferSum, transferAccount);
    return true;
  }
  if (name === 'bank.card.open' && typeof args[1] === 'string') {
    mint.emitServer('bank.card.open', args[1]);
    return true;
  }
  if (name === 'bank.card.activate') {
    mint.emitServer('bank.card.activate', Math.floor(Number(args[1]) || 0));
    return true;
  }
  if (name === 'bank.card.reissue') {
    mint.emitServer('bank.card.reissue', Math.floor(Number(args[1]) || 0));
    return true;
  }
  if (name === 'bank.deposit.open' && typeof args[1] === 'string') {
    mint.emitServer('bank.deposit.open', args[1], Math.floor(Number(args[2]) || 0));
    return true;
  }
  if (name === 'bank.deposit.topup') {
    mint.emitServer('bank.deposit.topup', Math.floor(Number(args[1]) || 0));
    return true;
  }
  if (name === 'bank.deposit.withdraw') {
    mint.emitServer('bank.deposit.withdraw', Math.floor(Number(args[1]) || 0));
    return true;
  }
  if (name === 'bank.deposit.close') {
    mint.emitServer('bank.deposit.close');
    return true;
  }
  return false;
}

export function installPlaces(): void {
  installBody({ pay, startCam, showMenu, fillMenu });
  mint.onServer('crp:clothing', (raw) => {
    if (typeof raw === 'string') openClothing(raw);
  });
  mint.onServer('crp:barber', (raw) => {
    if (typeof raw === 'string') openBarber(raw);
  });
  mint.onServer('crp:fit:stop', () => stopCam());
  mint.onServer('crp:bank:open', () => focusUi(true));
  mint.onServer('crp:bank:close', () => focusUi(false));
  mint.onServer('crp:look', (...look: unknown[]) => {
    const values = look.filter((item): item is number => typeof item === 'number');
    if (values.length >= 5) applyLook(ped(), values);
  });
  mint.on('streamSyncedMetaChange', (target, key, value) => {
    if (key !== 'crp:look') return;
    const look = numbersOf(value);
    const player = mint.Player.getByScriptID((target as { scriptID?: number }).scriptID ?? -1);
    if (look && player) applyLook(player.scriptID, look);
  });
  mint.on('worldObjectStreamIn', (object) => {
    const player = mint.Player.getByScriptID(object.scriptID);
    const look = player ? numbersOf(player.getStreamSyncedMeta('crp:look')) : null;
    if (player && look) applyLook(player.scriptID, look);
  });
  mint.on('keydown', (key: number) => {
    if (!fitting) return;
    if (key === 65) turnLeft = true;
    if (key === 68) turnRight = true;
  });
  mint.on('keyup', (key: number) => {
    if (key === 65) turnLeft = false;
    if (key === 68) turnRight = false;
  });
  if (tick === null) {
    tick = mint.everyTick(() => {
      if (!fitting || (!turnLeft && !turnRight)) return;
      const id = ped();
      const heading = native.getEntityHeading(id);
      if (turnLeft) native.setEntityHeading(id, heading - 2);
      if (turnRight) native.setEntityHeading(id, heading + 2);
    });
  }
}
