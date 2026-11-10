import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { applyWorn } from '../character/clothes.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { removeBank, removeCash } from '../world/money.js';
import { onBizPrice } from '../bizes/prices.js';

const PRODUCT_PRICE = 20;
const DELETE_UNITS = 20;

interface Shop extends DbRow {
  id: number;
  bizId: number | null;
  bType: number;
  priceMultiplier: number;
  x: number;
  y: number;
  z: number;
  placeX: number;
  placeY: number;
  placeZ: number;
  placeH: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
}

interface Design extends DbRow {
  id: number;
  name: string;
  price: number;
  zoneId: number;
  collection: string;
  hashNameMale: string;
  hashNameFemale: string;
}

interface Ink extends DbRow {
  id: number;
  characterId: number;
  name: string;
  collection: string;
  hashName: string;
  zoneId: number;
}

const designs: Design[] = [];
const shops = new Map<number, Shop>();
const here = new WeakMap<mint.Player, Shop>();
const inside = new WeakMap<mint.Player, Shop>();
const worn = new WeakMap<mint.Player, Ink[]>();

function note(player: mint.Player, text: string): void {
  cef(player, `selectMenu.loader = false; selectMenu.notification = ${JSON.stringify(text)};`);
}

function afford(player: mint.Player, method: number, price: number): boolean {
  const character = getSession(player).character;
  if (!character) return false;
  const have = method === 1 ? Number(character.bank) || 0 : Number(character.cash) || 0;
  return have >= price;
}

async function pay(player: mint.Player, method: number, price: number): Promise<boolean> {
  return method === 1 ? removeBank(player, price) : removeCash(player, price);
}

async function stock(shop: Shop, need: number): Promise<(DbRow & { productsCount: number; cashBox: number }) | null | false> {
  if (!shop.bizId) return null;
  const biz = (await table('Biz').findOne({ where: { id: shop.bizId } })) as (DbRow & { productsCount: number; cashBox: number }) | null;
  if (!biz || biz.productsCount < need) return false;
  return biz;
}

async function commit(biz: (DbRow & { productsCount: number; cashBox: number }) | null, need: number, price: number): Promise<void> {
  if (!biz) return;
  biz.productsCount -= need;
  biz.cashBox += price;
  await biz.save();
}

function paint(player: mint.Player, rows: Ink[]): void {
  player.clearDecorations();
  const flat: string[] = [];
  for (const row of rows) {
    player.addDecoration(String(row.collection), String(row.hashName));
    flat.push(String(row.collection), String(row.hashName));
  }
  player.setStreamSyncedMeta('crp:tattoos', flat);
}

export async function applyTattoos(player: mint.Player, characterId: number): Promise<void> {
  const rows = (await table('CharacterTattoo').findAll({ where: { characterId } })) as Ink[];
  worn.set(player, rows);
  paint(player, rows);
}

async function open(player: mint.Player, shop: Shop): Promise<void> {
  const character = getSession(player).character;
  if (!character || player.vehicle || player.getSyncedMeta('crp:cuffs')) return;
  const rows = (await table('CharacterTattoo').findAll({ where: { characterId: character.id } })) as Ink[];
  worn.set(player, rows);
  inside.set(player, shop);
  const female = Boolean(character.gender);
  const list = designs.flatMap((row) => {
    const hash = female ? row.hashNameFemale : row.hashNameMale;
    if (!hash) return [];
    return [{
      id: row.id,
      name: row.name,
      price: row.price,
      zoneId: row.zoneId,
      collection: row.collection,
      hash,
    }];
  });
  player.dimension = player.id + 1;
  player.pos = new mint.Vector3(shop.placeX, shop.placeY, shop.placeZ);
  player.rot = new mint.Vector3(0, 0, (Number(shop.placeH) * Math.PI) / 180);
  player.frozen = true;
  player.emit('crp:tattoo', JSON.stringify({
    bType: Number(shop.bType) || 0,
    gender: female ? 1 : 0,
    multiplier: Number(shop.priceMultiplier) || 1,
    deletePrice: DELETE_UNITS * PRODUCT_PRICE,
    list,
    owned: rows.map((row) => ({
      id: row.id,
      name: row.name,
      collection: row.collection,
      hashName: row.hashName,
      zoneId: row.zoneId,
    })),
    hair: {
      hairstyle: Number(character.hair) || 0,
      hairColor: Number(character.hairColor) || 0,
      hairHighlightColor: Number(character.hairHighlightColor) || 0,
    },
    cam: {
      x: shop.cameraX,
      y: shop.cameraY,
      z: shop.cameraZ,
      lookX: shop.placeX,
      lookY: shop.placeY,
      lookZ: shop.placeZ,
      fov: 50,
    },
  }));
}

async function close(player: mint.Player): Promise<void> {
  if (!inside.has(player)) return;
  inside.delete(player);
  const character = getSession(player).character;
  player.frozen = false;
  player.dimension = 0;
  if (character) {
    await applyWorn(player, Number(character.id), Number(character.gender) || 0);
    await applyTattoos(player, Number(character.id));
  }
  player.emit('crp:fit:stop');
  cef(player, 'selectMenu.show = false;');
}

export async function loadTattoos(): Promise<number> {
  const rows = (await table('Tattoo').findAll()) as Design[];
  designs.splice(0, designs.length, ...rows);
  const parlors = (await table('TattooParlor').findAll()) as Shop[];
  for (const shop of parlors) {
    shops.set(Number(shop.id), shop);
    const shape = new mint.ColshapeSphere(shop.x, shop.y, shop.z, 1, 0, true);
    setColshapeHandlers(shape, {
      onEnter: (player) => {
        here.set(player, shop);
        cef(player, `prompt.show(${JSON.stringify('Нажмите <span>E</span> для того, чтобы посмотреть татуировки')});`);
      },
      onExit: (player) => {
        here.delete(player);
        cef(player, 'prompt.hide();');
      },
    });
  }
  onBizPrice((bizId, key, value) => {
    for (const shop of shops.values()) if (Number(shop.bizId) === bizId) shop[key] = value;
  });
  mint.log(`crp: тату ${rows.length}, салонов ${parlors.length}`);
  return parlors.length;
}

export function installTattoo(): void {
  mint.onClient('crp:shop:use', (player: mint.Player) => {
    const shop = here.get(player);
    if (shop && !inside.has(player)) void open(player, shop);
  });
  mint.onClient('tattoo.exit', (player: mint.Player) => {
    void close(player);
  });
  mint.onClient('tattoo.buy', async (player: mint.Player, ...args: unknown[]) => {
    const shop = inside.get(player);
    const character = getSession(player).character;
    const design = designs.find((row) => row.id === Number(args[0]));
    const method = Number(args[1]) || 0;
    if (!shop || !character || !design) return note(player, 'Татуировка не найдена');
    const hash = character.gender ? design.hashNameFemale : design.hashNameMale;
    if (!hash) return note(player, 'Татуировка не подходит для вас');
    const owned = worn.get(player) ?? [];
    if (owned.some((row) => row.name === design.name)) return note(player, 'У вас уже есть эта тату');
    const price = Math.trunc(Number(design.price) * (Number(shop.priceMultiplier) || 1));
    if (!afford(player, method, price)) return note(player, 'Недостаточно денег');
    const need = Math.trunc((Number(design.price) * 0.8) / PRODUCT_PRICE);
    const biz = await stock(shop, need);
    if (biz === false) return note(player, 'В салоне кончились материалы');
    if (!(await pay(player, method, price))) return note(player, 'Ошибка финансовой операции');
    await commit(biz, need, price);
    const created = (await table('CharacterTattoo').create({
      characterId: character.id,
      name: design.name,
      collection: design.collection,
      hashName: hash,
      zoneId: design.zoneId,
    })) as Ink;
    owned.push(created);
    worn.set(player, owned);
    paint(player, owned);
    player.emit('crp:tattoo:add', JSON.stringify({
      id: created.id,
      name: created.name,
      collection: created.collection,
      hashName: created.hashName,
      zoneId: created.zoneId,
    }));
    note(player, 'Татуировка набита');
  });
  mint.onClient('tattoo.delete', async (player: mint.Player, ...args: unknown[]) => {
    const shop = inside.get(player);
    const character = getSession(player).character;
    const owned = worn.get(player) ?? [];
    const row = owned.find((item) => item.id === Number(args[0]));
    const method = Number(args[1]) || 0;
    if (!shop || !character || !row) return note(player, 'Татуировка не найдена');
    const price = Math.trunc(DELETE_UNITS * PRODUCT_PRICE * (Number(shop.priceMultiplier) || 1));
    if (!afford(player, method, price)) return note(player, 'Недостаточно денег');
    const need = Math.trunc(DELETE_UNITS / 2);
    const biz = await stock(shop, need);
    if (biz === false) return note(player, 'В салоне кончились материалы');
    if (!(await pay(player, method, price))) return note(player, 'Ошибка финансовой операции');
    await commit(biz, need, price);
    await row.destroy();
    const left = owned.filter((item) => item.id !== row.id);
    worn.set(player, left);
    paint(player, left);
    player.emit('crp:tattoo:list', JSON.stringify(left.map((item) => ({
      id: item.id,
      name: item.name,
      collection: item.collection,
      hashName: item.hashName,
      zoneId: item.zoneId,
    }))));
    note(player, 'Татуировка сведена');
  });
  mint.on('playerDisconnect', (player: mint.Player) => {
    here.delete(player);
    inside.delete(player);
    worn.delete(player);
  });
}
