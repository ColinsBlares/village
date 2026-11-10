import * as mint from 'mint-client';
import * as native from 'natives';
import { focusUi, pushCef } from '../cef/view.js';

interface Cam {
  x: number;
  y: number;
  z: number;
  lookX: number;
  lookY: number;
  lookZ: number;
  fov: number;
}

interface PlaceApi {
  pay(event: string, args: unknown[]): void;
  startCam(cam: Cam): void;
  showMenu(name: string, items: unknown[], header?: string): void;
  fillMenu(name: string, items: unknown[], header?: string): void;
}

interface TattooRow {
  id: number;
  name: string;
  price: number;
  zoneId: number;
  collection: string;
  hash: string;
}

interface OwnedTattoo {
  id: number;
  name: string;
  collection: string;
  hashName: string;
  zoneId: number;
}

interface MaskRow {
  id: number;
  drawable: number;
  name: string;
  price: number;
}

const ZONES = ['Torso', 'Head', 'LeftArm', 'RightArm', 'LeftLeg', 'RightLeg'];
const TATTOO_HEADERS = ['blazing.png', 'bodyart.png', 'inkinc.png', 'lstattoos.png', 'thepit.png'];
const HIDE_HAIR = new Set([
  114, 159, 158, 157, 156, 155, 154, 153, 152, 151, 150, 149, 147, 146, 145, 144, 143, 142, 141, 140,
  139, 138, 137, 136, 135, 134, 132, 131, 130, 129, 126, 125, 123, 122, 119, 118, 117, 115, 113, 110,
  106, 104, 109, 112,
]);

let api: PlaceApi | null = null;
let tattoos: TattooRow[] = [];
let owned: OwnedTattoo[] = [];
let tattooHeader = 'blazing.png';
let deletePrice = 0;
let multiplier = 1;
let gender = 0;
let hair = { hairstyle: 0, hairColor: 0, hairHighlightColor: 0 };
let deleting = false;
let previewing = false;
let masks: MaskRow[] = [];
let ammoHook = false;

function ped(): number {
  return mint.Player.local.scriptID;
}

function label(name: string): string {
  const text = native.getFilenameForAudioConversation(name);
  if (!text || text === 'NULL') return name;
  return text;
}

function stamp(id: number, collection: string, hash: string): void {
  native.addPedDecorationFromHashes(id, native.getHashKey(collection), native.getHashKey(hash));
}

function drawOwned(extra?: { collection: string; hash: string }, skip?: number): void {
  const id = ped();
  native.clearPedDecorations(id);
  owned.forEach((row, index) => {
    if (index === skip) return;
    stamp(id, row.collection, row.hashName);
  });
  if (extra) stamp(id, extra.collection, extra.hash);
}

function drawFlat(id: number, value: unknown): void {
  if (!Array.isArray(value)) return;
  native.clearPedDecorations(id);
  for (let i = 0; i < value.length; i += 2) {
    const collection = value[i];
    const hash = value[i + 1];
    if (typeof collection === 'string' && typeof hash === 'string') stamp(id, collection, hash);
  }
}

function setHair(style: number): void {
  const id = ped();
  native.setPedComponentVariation(id, 2, style, 0, 2);
  native.setPedHairTint(id, hair.hairColor, hair.hairHighlightColor);
}

function stripTattoo(): void {
  const id = ped();
  const female = gender === 1;
  native.clearAllPedProps(id);
  native.setPedComponentVariation(id, 1, 0, 0, 0);
  native.setPedComponentVariation(id, 3, 15, 0, 0);
  native.setPedComponentVariation(id, 11, female ? 18 : 15, 0, 2);
  native.setPedComponentVariation(id, 8, female ? 3 : 15, 0, 2);
  native.setPedComponentVariation(id, 4, female ? 17 : 18, female ? 0 : 2, 2);
  native.setPedComponentVariation(id, 6, female ? 35 : 34, 0, 0);
  native.setPedComponentVariation(id, 7, 0, 0, 2);
  native.setPedComponentVariation(id, 9, 0, 0, 0);
  native.setPedComponentVariation(id, 5, 0, 0, 0);
  setHair(hair.hairstyle);
}

function showDelete(): void {
  if (!api) return;
  if (!owned.length) {
    pushCef(`selectMenu.notification = 'У вас нет татуировок';`);
    return;
  }
  deleting = true;
  const items = owned.map((row) => ({
    text: label(row.name),
    values: [`$${Math.trunc(deletePrice * multiplier)}`],
  }));
  items.push({ text: 'Назад', values: [] });
  drawOwned(undefined, 0);
  api.showMenu('tattooDelete', items, tattooHeader);
}

function openTattoo(raw: string): void {
  if (!api) return;
  const data = JSON.parse(raw) as {
    bType: number;
    gender: number;
    multiplier: number;
    deletePrice: number;
    list: TattooRow[];
    owned: OwnedTattoo[];
    hair: { hairstyle: number; hairColor: number; hairHighlightColor: number };
    cam: Cam;
  };
  tattoos = data.list;
  owned = data.owned;
  gender = data.gender;
  multiplier = data.multiplier;
  deletePrice = data.deletePrice;
  hair = data.hair;
  tattooHeader = TATTOO_HEADERS[data.bType] ?? TATTOO_HEADERS[0];
  deleting = false;
  previewing = true;
  stripTattoo();
  drawOwned();
  for (let zone = 0; zone < ZONES.length; zone += 1) {
    const items = tattoos
      .filter((row) => Number(row.zoneId) === zone)
      .map((row) => ({ text: label(row.name), values: [`$${Math.trunc(Number(row.price) * multiplier)}`] }));
    items.push({ text: 'Назад', values: [] });
    api.fillMenu(`tattoo${ZONES[zone]}`, items, tattooHeader);
  }
  api.showMenu('tattooMain', [
    { text: 'Торс' }, { text: 'Голова' }, { text: 'Левая рука' }, { text: 'Правая рука' },
    { text: 'Левая нога' }, { text: 'Правая нога' }, { text: 'Сведение татуировок' }, { text: 'Закрыть' },
  ], tattooHeader);
  api.startCam(data.cam);
}

function openMasks(raw: string): void {
  if (!api) return;
  const data = JSON.parse(raw) as { list: MaskRow[]; hair: typeof hair; cam: Cam };
  masks = data.list;
  hair = data.hair;
  previewing = true;
  const id = ped();
  native.clearAllPedProps(id);
  const items = masks.map((row) => {
    const count = native.getNumberOfPedTextureVariations(id, 1, row.drawable) || 1;
    const values = [];
    for (let i = 0; i < count; i += 1) values.push(`Вид №${i + 1}`);
    const title = row.name === 'Маска' ? `${row.name} ${row.id} [$${row.price}]` : `${row.name} [$${row.price}]`;
    return { text: title, values };
  });
  items.push({ text: 'Выйти', values: [] });
  if (masks[0]) {
    if (HIDE_HAIR.has(masks[0].id)) setHair(0);
    else setHair(hair.hairstyle);
    native.setPedComponentVariation(id, 1, masks[0].drawable, 0, 0);
  }
  api.showMenu('maskShop', items);
  api.startCam(data.cam);
}

function openAmmo(raw: string): void {
  if (!api) return;
  const data = JSON.parse(raw) as {
    priceMultiplier: number;
    productPrice: number;
    weapons: Record<string, { name: string; products: number }>;
    ammoProducts: number;
    armourProducts: number;
  };
  const unit = Math.trunc(data.productPrice * data.priceMultiplier);
  const guns = Object.keys(data.weapons).map((key) => {
    const weapon = data.weapons[key];
    return {
      text: weapon.name,
      values: [`$${Math.trunc(weapon.products * data.productPrice * data.priceMultiplier)}`],
      weaponId: Number(key),
    };
  });
  guns.push({ text: 'Назад', values: [], weaponId: 0 });
  api.fillMenu('ammunationFirearms', guns);
  const ammoPrice = (count: number) => count * data.ammoProducts * unit;
  api.fillMenu('ammunationAmmo', [
    { text: 'Патроны - 9mm', values: [`12 ед. - $${ammoPrice(12)}`, `24 ед. - $${ammoPrice(24)}`, `32 ед. - $${ammoPrice(32)}`] },
    { text: 'Патроны - 12mm', values: [`8 ед. - $${ammoPrice(8)}`, `16 ед. - $${ammoPrice(16)}`, `24 ед. - $${ammoPrice(24)}`] },
    { text: 'Патроны - 5.56mm', values: [`12 ед. - $${ammoPrice(12)}`, `24 ед. - $${ammoPrice(24)}`, `32 ед. - $${ammoPrice(32)}`] },
    { text: 'Патроны - 7.62mm', values: [`10 ед. - $${ammoPrice(10)}`, `20 ед. - $${ammoPrice(20)}`, `30 ед. - $${ammoPrice(30)}`] },
    { text: 'Назад' },
  ]);
  const armourPrice = Math.trunc(data.armourProducts * data.productPrice * data.priceMultiplier);
  api.fillMenu('ammunationArmour', [
    { text: 'Серый бронежилет', values: [`$${armourPrice}`] },
    { text: 'Черный бронежилет', values: [`$${armourPrice}`] },
    { text: 'Зеленый бронежилет', values: [`$${armourPrice}`] },
    { text: 'Камуфляжный бронежилет', values: [`$${armourPrice}`] },
    { text: 'Камуфляжный бронежилет №2', values: [`$${armourPrice}`] },
    { text: 'Назад' },
  ]);
  if (!ammoHook) {
    ammoHook = true;
    pushCef(`(function () {
      var menu = selectMenu.menus.ammunationMain;
      if (!menu || menu.__crp) return;
      var prev = menu.handler;
      menu.handler = function (eventName) {
        var item = this.items[this.i];
        if (eventName == 'onItemSelected' && item && item.text == 'Закрыть') mp.trigger('ammunation.exit');
        if ((eventName == 'onBackspacePressed' || eventName == 'onEscapePressed') && selectMenu.menu && selectMenu.menu.name == 'ammunationMain') mp.trigger('ammunation.exit');
        return prev.call(this, eventName);
      };
      menu.__crp = true;
    })();`);
  }
  pushCef(`selectMenu.menu = selectMenu.menus["ammunationMain"]; selectMenu.show = true;`);
  focusUi(true);
}

function zoneList(zoneId: number): TattooRow[] {
  return tattoos.filter((row) => Number(row.zoneId) === zoneId);
}

export function installBody(next: PlaceApi): void {
  api = next;
  mint.onServer('crp:tattoo', (raw) => {
    if (typeof raw === 'string') openTattoo(raw);
  });
  mint.onServer('crp:tattoo:add', (raw) => {
    if (typeof raw !== 'string') return;
    owned.push(JSON.parse(raw) as OwnedTattoo);
    drawOwned();
  });
  mint.onServer('crp:tattoo:list', (raw) => {
    if (typeof raw !== 'string') return;
    owned = JSON.parse(raw) as OwnedTattoo[];
    drawOwned();
    if (deleting && owned.length) showDelete();
    else if (api) api.showMenu('tattooMain', [
      { text: 'Торс' }, { text: 'Голова' }, { text: 'Левая рука' }, { text: 'Правая рука' },
      { text: 'Левая нога' }, { text: 'Правая нога' }, { text: 'Сведение татуировок' }, { text: 'Закрыть' },
    ], tattooHeader);
  });
  mint.onServer('crp:masks', (raw) => {
    if (typeof raw === 'string') openMasks(raw);
  });
  mint.onServer('crp:ammo', (raw) => {
    if (typeof raw === 'string') openAmmo(raw);
  });
  mint.onServer('crp:fit:stop', () => {
    previewing = false;
  });
  mint.onServer('crp:menu:close', () => focusUi(false));
  mint.on('streamSyncedMetaChange', (target, key, value) => {
    if (key !== 'crp:tattoos') return;
    const player = mint.Player.getByScriptID((target as { scriptID?: number }).scriptID ?? -1);
    if (!player) return;
    if (previewing && player.scriptID === mint.Player.local.scriptID) return;
    drawFlat(player.scriptID, value);
  });
  mint.on('worldObjectStreamIn', (object) => {
    const player = mint.Player.getByScriptID(object.scriptID);
    if (!player || (previewing && player.scriptID === mint.Player.local.scriptID)) return;
    drawFlat(player.scriptID, player.getStreamSyncedMeta('crp:tattoos'));
  });
}

export function handleBody(name: string, args: unknown[]): boolean {
  if (!api) return false;
  if (name === 'tattoo.exit') {
    deleting = false;
    previewing = false;
    mint.emitServer('tattoo.exit');
    return true;
  }
  if (name === 'tattoo.clear') {
    drawOwned();
    return true;
  }
  if (name === 'tattoo.clear.single') {
    drawOwned(undefined, Number(args[1]) || 0);
    return true;
  }
  if (name === 'tattoo.set') {
    const row = zoneList(Number(args[1]) || 0)[Number(args[2]) || 0];
    if (row) drawOwned({ collection: row.collection, hash: row.hash });
    return true;
  }
  if (name === 'tattoo.buy') {
    const row = zoneList(Number(args[1]) || 0)[Number(args[2]) || 0];
    if (!row) return true;
    if (owned.some((item) => item.name === row.name)) {
      pushCef(`selectMenu.loader = false; selectMenu.notification = 'У вас уже есть эта тату';`);
      return true;
    }
    api.pay('tattoo.buy', [row.id]);
    return true;
  }
  if (name === 'tattoo.delete.show') {
    showDelete();
    return true;
  }
  if (name === 'tattoo.delete') {
    const row = owned[Number(args[1]) || 0];
    if (row) api.pay('tattoo.delete', [row.id]);
    return true;
  }
  if (name === 'masks.shop.exit') {
    previewing = false;
    mint.emitServer('masks.shop.exit');
    return true;
  }
  if (name === 'masks.set') {
    const row = masks[Number(args[1]) || 0];
    if (!row) return true;
    setHair(HIDE_HAIR.has(row.id) ? 0 : hair.hairstyle);
    native.setPedComponentVariation(ped(), 1, row.drawable, Number(args[2]) || 0, 0);
    return true;
  }
  if (name === 'masks.buy') {
    const row = masks[Number(args[1]) || 0];
    if (row) api.pay('masks.buy', [row.id, Number(args[2]) || 0]);
    return true;
  }
  if (name === 'ammunation.exit') {
    focusUi(false);
    pushCef('selectMenu.show = false;');
    return true;
  }
  if (name === 'callRemote' && args[1] === 'ammunation.weapon.buy') {
    mint.emitServer('ammunation.weapon.buy', Number(args[2]) || 0);
    return true;
  }
  if (name === 'callRemote' && args[1] === 'ammunation.ammo.buy') {
    mint.emitServer('ammunation.ammo.buy', String(args[2] ?? ''));
    return true;
  }
  if (name === 'callRemote' && args[1] === 'ammunation.armour.buy') {
    mint.emitServer('ammunation.armour.buy', Number(args[2]) || 0);
    return true;
  }
  return false;
}
