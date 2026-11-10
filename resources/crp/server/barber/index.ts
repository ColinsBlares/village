import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { applyWorn } from '../character/clothes.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { removeBank, removeCash } from '../world/money.js';
import { onBizPrice } from '../bizes/prices.js';

const PRODUCT_PRICE = 20;
const HAIR_UNITS = 10;
const BEARD_UNITS = 7;
const COLOR_UNITS = 5;

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

const shops = new Map<number, Shop>();
const here = new WeakMap<mint.Player, Shop>();
const inside = new WeakMap<mint.Player, Shop>();
const beardOf = new WeakMap<mint.Player, number>();

function note(player: mint.Player, text: string): void {
  cef(player, `selectMenu.loader = false; selectMenu.notification = ${JSON.stringify(text)};`);
}

function priceOf(shop: Shop, units: number): number {
  return Math.trunc(units * PRODUCT_PRICE * (Number(shop.priceMultiplier) || 1));
}

function afford(player: mint.Player, method: number, price: number): boolean {
  const character = getSession(player).character;
  if (!character) return false;
  const have = method === 1 ? Number(character.bank) || 0 : Number(character.cash) || 0;
  return have >= price;
}

async function stock(shop: Shop, units: number): Promise<(DbRow & { productsCount: number; cashBox: number }) | null | false> {
  if (!shop.bizId) return null;
  const need = Math.trunc(units * 0.8);
  const biz = (await table('Biz').findOne({ where: { id: shop.bizId } })) as (DbRow & { productsCount: number; cashBox: number }) | null;
  if (!biz || biz.productsCount < need) return false;
  return biz;
}

async function commit(biz: (DbRow & { productsCount: number; cashBox: number }) | null, units: number, price: number): Promise<void> {
  if (!biz) return;
  biz.productsCount -= Math.trunc(units * 0.8);
  biz.cashBox += price;
  await biz.save();
}

async function pay(player: mint.Player, method: number, price: number): Promise<boolean> {
  return method === 1 ? removeBank(player, price) : removeCash(player, price);
}

function syncLook(player: mint.Player, hair: number, color: number, highlight: number, beard: number, beardColor: number): void {
  player.setClothes(2, hair, 0, 2);
  player.setHairColor(color);
  player.setHeadOverlay(1, beard, 1);
  player.setHeadOverlayColor(1, 1, beardColor, beardColor);
  player.setStreamSyncedMeta('crp:look', [hair, color, highlight, beard, beardColor]);
  player.emit('crp:look', hair, color, highlight, beard, beardColor);
}

async function beardValue(characterId: number): Promise<number> {
  const row = (await table('Appearance').findOne({ where: { characterId, order: 1 } })) as (DbRow & { value: number }) | null;
  return row ? Number(row.value) : 255;
}

async function saveBeard(characterId: number, value: number): Promise<void> {
  const row = (await table('Appearance').findOne({ where: { characterId, order: 1 } })) as (DbRow & { value: number }) | null;
  if (row) {
    row.value = value;
    await row.save();
    return;
  }
  await table('Appearance').create({ characterId, value, opacity: 1, order: 1 });
}

async function open(player: mint.Player, shop: Shop): Promise<void> {
  const character = getSession(player).character;
  if (!character || player.vehicle) return;
  const beard = await beardValue(Number(character.id));
  beardOf.set(player, beard);
  inside.set(player, shop);
  player.dimension = player.id + 1;
  player.pos = new mint.Vector3(shop.placeX, shop.placeY, shop.placeZ);
  player.rot = new mint.Vector3(0, 0, (Number(shop.placeH) * Math.PI) / 180);
  player.frozen = true;
  const multiplier = Number(shop.priceMultiplier) || 1;
  player.emit('crp:barber', JSON.stringify({
    bType: Number(shop.bType) || 0,
    gender: character.gender ? 1 : 0,
    prices: {
      hairstylePrice: Math.trunc(HAIR_UNITS * PRODUCT_PRICE * multiplier),
      facialHairPrice: Math.trunc(BEARD_UNITS * PRODUCT_PRICE * multiplier),
      colorChangePrice: Math.trunc(COLOR_UNITS * PRODUCT_PRICE * multiplier),
    },
    appearance: {
      hairstyle: Number(character.hair) || 0,
      hairColor: Number(character.hairColor) || 0,
      hairHighlightColor: Number(character.hairHighlightColor) || 0,
      facialHair: beard,
      facialHairColor: Number(character.beardColor) || 0,
    },
    cam: {
      x: shop.cameraX,
      y: shop.cameraY,
      z: shop.cameraZ,
      lookX: shop.placeX,
      lookY: shop.placeY,
      lookZ: Number(shop.placeZ) + 0.6,
      fov: 40,
    },
  }));
}

async function close(player: mint.Player): Promise<void> {
  if (!inside.has(player)) return;
  inside.delete(player);
  const character = getSession(player).character;
  player.frozen = false;
  player.dimension = 0;
  if (character) await applyWorn(player, Number(character.id), Number(character.gender) || 0);
  player.emit('crp:fit:stop');
  cef(player, 'selectMenu.show = false;');
}

export async function loadBarbers(): Promise<number> {
  const rows = (await table('Barbershop').findAll()) as Shop[];
  for (const shop of rows) {
    shops.set(Number(shop.id), shop);
    const shape = new mint.ColshapeSphere(shop.x, shop.y, shop.z, 1, 0, true);
    setColshapeHandlers(shape, {
      onEnter: (player) => {
        here.set(player, shop);
        cef(player, `prompt.show(${JSON.stringify('Нажмите <span>E</span> для того, чтобы сменить прическу')});`);
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
  mint.log(`crp: парикмахерских ${rows.length}`);
  return rows.length;
}

export function installBarber(): void {
  mint.onClient('crp:shop:use', (player: mint.Player) => {
    const shop = here.get(player);
    if (shop && !inside.has(player)) void open(player, shop);
  });
  mint.onClient('barbershop.exit', (player: mint.Player) => {
    void close(player);
  });
  mint.onClient('barbershop.hairstyle.buy', async (player: mint.Player, ...args: unknown[]) => {
    const shop = inside.get(player);
    const character = getSession(player).character;
    const style = Number(args[0]);
    const method = Number(args[1]) || 0;
    if (!shop || !character || !Number.isFinite(style)) return note(player, 'Ошибка покупки');
    const price = priceOf(shop, HAIR_UNITS);
    if (!afford(player, method, price)) return note(player, 'Недостаточно денег');
    const biz = await stock(shop, HAIR_UNITS);
    if (biz === false) return note(player, 'В парикмахерской кончились ресурсы');
    if (!(await pay(player, method, price))) return note(player, 'Ошибка покупки');
    await commit(biz, HAIR_UNITS, price);
    character.hair = style;
    await character.save();
    syncLook(player, style, Number(character.hairColor) || 0, Number(character.hairHighlightColor) || 0, beardOf.get(player) ?? 255, Number(character.beardColor) || 0);
    note(player, 'Прическа сделана');
  });
  mint.onClient('barbershop.facialHair.buy', async (player: mint.Player, ...args: unknown[]) => {
    const shop = inside.get(player);
    const character = getSession(player).character;
    const style = Number(args[0]);
    const method = Number(args[1]) || 0;
    if (!shop || !character || !Number.isFinite(style)) return note(player, 'Ошибка покупки');
    const price = priceOf(shop, BEARD_UNITS);
    if (!afford(player, method, price)) return note(player, 'Недостаточно денег');
    const biz = await stock(shop, BEARD_UNITS);
    if (biz === false) return note(player, 'В парикмахерской кончились ресурсы');
    if (!(await pay(player, method, price))) return note(player, 'Ошибка покупки');
    await commit(biz, BEARD_UNITS, price);
    await saveBeard(Number(character.id), style);
    beardOf.set(player, style);
    syncLook(player, Number(character.hair) || 0, Number(character.hairColor) || 0, Number(character.hairHighlightColor) || 0, style, Number(character.beardColor) || 0);
    note(player, 'Борода заменена');
  });
  mint.onClient('barbershop.color.buy', async (player: mint.Player, ...args: unknown[]) => {
    const shop = inside.get(player);
    const character = getSession(player).character;
    const type = Number(args[0]);
    const color = Number(args[1]);
    const method = Number(args[2]) || 0;
    if (!shop || !character || !Number.isFinite(color)) return note(player, 'Ошибка покупки');
    const price = priceOf(shop, COLOR_UNITS);
    if (!afford(player, method, price)) return note(player, 'Недостаточно денег');
    const biz = await stock(shop, COLOR_UNITS);
    if (biz === false) return note(player, 'В парикмахерской кончились ресурсы');
    if (!(await pay(player, method, price))) return note(player, 'Ошибка покупки');
    await commit(biz, COLOR_UNITS, price);
    if (type === 0) character.hairColor = color;
    else if (type === 1) character.hairHighlightColor = color;
    else character.beardColor = color;
    await character.save();
    syncLook(
      player,
      Number(character.hair) || 0,
      Number(character.hairColor) || 0,
      Number(character.hairHighlightColor) || 0,
      beardOf.get(player) ?? 255,
      Number(character.beardColor) || 0,
    );
    note(player, 'Цвет изменен');
  });
  mint.on('playerDisconnect', (player: mint.Player) => {
    here.delete(player);
    inside.delete(player);
    beardOf.delete(player);
  });
}
