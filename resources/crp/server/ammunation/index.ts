import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { giveItem } from '../inventory/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { removeCash } from '../world/money.js';
import { onBizPrice } from '../bizes/prices.js';

const PRODUCT_PRICE = 10;
const AMMO_UNITS = 1;
const ARMOUR_UNITS = 100;
const AMMO_ITEMS = [37, 38, 40, 39];
const WEAPONS: Record<number, { name: string; itemId: number; gameId: string; products: number }> = {
  1: { name: 'Combat Pistol', itemId: 20, gameId: 'weapon_combatpistol', products: 95 },
  2: { name: 'SMG', itemId: 48, gameId: 'weapon_smg', products: 260 },
  3: { name: 'Pump Shotgun', itemId: 21, gameId: 'weapon_pumpshotgun', products: 270 },
  4: { name: 'Carbine Rifle', itemId: 22, gameId: 'weapon_carbinerifle', products: 320 },
  5: { name: 'Micro SMG', itemId: 47, gameId: 'weapon_microsmg', products: 235 },
  6: { name: 'Machine Pistol', itemId: 89, gameId: 'weapon_machinepistol', products: 245 },
  7: { name: 'Compact Rifle', itemId: 52, gameId: 'weapon_compactrifle', products: 305 },
  9: { name: 'Carbine Rifle Mk II', itemId: 99, gameId: 'weapon_carbinerifle_mk2', products: 355 },
  10: { name: 'Combat PDW', itemId: 88, gameId: 'weapon_combatpdw', products: 355 },
  11: { name: 'Pump Shotgun Mk II', itemId: 91, gameId: 'weapon_pumpshotgun_mk2', products: 290 },
  12: { name: 'Heavy Pistol', itemId: 80, gameId: 'weapon_heavypistol', products: 175 },
  13: { name: 'Advanced Rifle', itemId: 100, gameId: 'weapon_advancedrifle', products: 390 },
  14: { name: 'Assault SMG', itemId: 87, gameId: 'weapon_assaultsmg', products: 375 },
};

interface Shop extends DbRow {
  id: number;
  bizId: number | null;
  priceMultiplier: number;
  x: number;
  y: number;
  z: number;
}

const shops = new Map<number, Shop>();
const here = new WeakMap<mint.Player, Shop>();

function note(player: mint.Player, text: string): void {
  cef(player, `selectMenu.loader = false; selectMenu.notification = ${JSON.stringify(text)};`);
}

function joaat(key: string): number {
  let hash = 0;
  const text = key.toLowerCase();
  for (let i = 0; i < text.length; i += 1) {
    hash += text.charCodeAt(i);
    hash = (hash + (hash << 10)) >>> 0;
    hash ^= hash >>> 6;
  }
  hash = (hash + (hash << 3)) >>> 0;
  hash ^= hash >>> 11;
  hash = (hash + (hash << 15)) >>> 0;
  return hash;
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

function open(player: mint.Player, shop: Shop): void {
  if (!getSession(player).character) return;
  here.set(player, shop);
  player.emit('crp:ammo', JSON.stringify({
    priceMultiplier: Number(shop.priceMultiplier) || 1,
    productPrice: PRODUCT_PRICE,
    weapons: WEAPONS,
    ammoProducts: AMMO_UNITS,
    armourProducts: ARMOUR_UNITS,
  }));
}

export async function loadAmmunations(): Promise<number> {
  const rows = (await table('Ammunation').findAll()) as Shop[];
  for (const shop of rows) {
    shops.set(Number(shop.id), shop);
    const shape = new mint.ColshapeSphere(shop.x, shop.y, shop.z, 1, 0, true);
    setColshapeHandlers(shape, {
      onEnter: (player) => {
        here.set(player, shop);
        cef(player, `prompt.show(${JSON.stringify('Используйте <span>E</span> для того, чтобы посмотреть ассортимент')});`);
      },
      onExit: (player) => {
        here.delete(player);
        cef(player, 'prompt.hide(); selectMenu.show = false;');
        player.emit('crp:menu:close');
      },
    });
  }
  onBizPrice((bizId, key, value) => {
    for (const shop of shops.values()) if (Number(shop.bizId) === bizId) shop[key] = value;
  });
  mint.log(`crp: оружейных ${rows.length}`);
  return rows.length;
}

export function installAmmunation(): void {
  mint.onClient('crp:shop:use', (player: mint.Player) => {
    const shop = here.get(player);
    if (shop) open(player, shop);
  });
  mint.onClient('ammunation.weapon.buy', async (player: mint.Player, ...args: unknown[]) => {
    const shop = here.get(player);
    const character = getSession(player).character;
    const weapon = WEAPONS[Number(args[0])];
    if (!shop || !character || !weapon) return;
    if (!character.gunLicenseDate) return note(player, 'У вас нет лицензии на оружие');
    const price = Math.trunc(weapon.products * PRODUCT_PRICE * (Number(shop.priceMultiplier) || 1));
    const cash = Number(character.cash) || 0;
    if (cash < price) return note(player, 'Недостаточно денег');
    const need = Math.trunc(weapon.products * 0.8);
    const biz = await stock(shop, need);
    if (biz === false) return note(player, 'В магазине кончились ресурсы');
    const added = await giveItem(player, weapon.itemId, {
      weaponHash: joaat(weapon.gameId),
      ammo: 0,
      owner: character.id,
    });
    if (!added) return note(player, 'Нет места в инвентаре');
    if (!(await removeCash(player, price))) return note(player, 'У вас нет лицензии на оружие');
    await commit(biz, need, price);
    note(player, `Вы приобрели ${weapon.name}`);
  });
  mint.onClient('ammunation.ammo.buy', async (player: mint.Player, ...args: unknown[]) => {
    const shop = here.get(player);
    const character = getSession(player).character;
    if (!shop || !character) return;
    if (!character.gunLicenseDate) return note(player, 'У вас нет лицензии на оружие');
    let values: unknown[] = [];
    try {
      values = JSON.parse(String(args[0] ?? '')) as unknown[];
    } catch {
      return;
    }
    const index = Number(values[0]);
    const count = Math.floor(Number(values[1]));
    const itemId = AMMO_ITEMS[index];
    if (!itemId || count <= 0) return;
    const price = Math.trunc(AMMO_UNITS * count * PRODUCT_PRICE * (Number(shop.priceMultiplier) || 1));
    if ((Number(character.cash) || 0) < price) return note(player, 'Недостаточно денег');
    const need = Math.trunc(AMMO_UNITS * count * 0.8);
    const biz = await stock(shop, need);
    if (biz === false) return note(player, 'В магазине кончились ресурсы');
    const added = await giveItem(player, itemId, { count, owner: character.id });
    if (!added) return note(player, 'Нет места в инвентаре');
    if (!(await removeCash(player, price))) return note(player, 'У вас нет лицензии на оружие');
    await commit(biz, need, price);
    note(player, 'Вы приобрели боеприпасы');
  });
  mint.onClient('ammunation.armour.buy', async (player: mint.Player, ...args: unknown[]) => {
    const shop = here.get(player);
    const character = getSession(player).character;
    const texture = Number(args[0]);
    if (!shop || !character || !Number.isFinite(texture)) return;
    const price = Math.trunc(ARMOUR_UNITS * PRODUCT_PRICE * (Number(shop.priceMultiplier) || 1));
    if ((Number(character.cash) || 0) < price) return note(player, 'Недостаточно денег');
    const need = Math.trunc(ARMOUR_UNITS * 0.8);
    const biz = await stock(shop, need);
    if (biz === false) return note(player, 'В магазине кончились ресурсы');
    const added = await giveItem(player, 3, {
      variation: 12,
      texture,
      health: 100,
      pockets: '[3,3,3,3,3,3,3,3,10,5,3,5,10,3,3,3]',
      sex: character.gender ? 0 : 1,
    });
    if (!added) return note(player, 'Нет места в инвентаре');
    if (!(await removeCash(player, price))) {
      cef(player, 'selectMenu.loader = false;');
      return;
    }
    await commit(biz, need, price);
    note(player, 'Вы купили бронежилет');
  });
  mint.on('playerDisconnect', (player: mint.Player) => here.delete(player));
}
