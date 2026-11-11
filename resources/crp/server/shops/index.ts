import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { giveItem } from '../inventory/index.js';
import type { DbRow } from '../player/session.js';
import { getSession } from '../player/session.js';
import { changePhoneNumber, sendPhone } from '../phone/index.js';
import { cef } from '../ui/send.js';
import { notifyError, notifySuccess } from '../ui/notify.js';
import { addFuel, vehicleState } from '../vehicles/index.js';
import { addBank, addCash, removeBank, removeCash } from '../world/money.js';
import { onBizPrice } from '../bizes/prices.js';

type ShopKind = 'market' | 'eatery' | 'fuel';

const standing = new WeakMap<mint.Player, { kind: ShopKind; id: number }>();

const MARKET = { phone: 15, numberChange: 12, water: 2, chocolate: 1, cigarettes: 2, canister: 10, rope: 5, bag: 7, duffleBag: 30, healthPack: 30, matches: 8 };
const MARKET_ITEMS: Record<number, { name: string; itemId: number; params: Record<string, unknown> }> = {
  0: { name: 'water', itemId: 34, params: { thirst: 100 } },
  1: { name: 'chocolate', itemId: 35, params: { satiety: 20, thirst: -5 } },
  2: { name: 'cigarettes', itemId: 16, params: { count: 20, name: 'Redwood' } },
  3: { name: 'rope', itemId: 54, params: {} },
  4: { name: 'bag', itemId: 55, params: {} },
  5: { name: 'canister', itemId: 56, params: { litres: 0, max: 20 } },
  6: { name: 'duffleBag', itemId: 13, params: {} },
  7: { name: 'duffleBag', itemId: 13, params: {} },
  8: { name: 'healthPack', itemId: 24, params: {} },
  9: { name: 'matches', itemId: 139, params: {} },
};
const EATERY = { hamburger: 4, hotdog: 3, pizza: 3, chips: 2, cola: 2 };
const EATERY_ITEMS: Record<number, { name: keyof typeof EATERY; itemId: number; params: Record<string, unknown> }> = {
  0: { name: 'hamburger', itemId: 126, params: { satiety: 60, thirst: -10 } },
  1: { name: 'hotdog', itemId: 127, params: { satiety: 55, thirst: -10 } },
  2: { name: 'pizza', itemId: 128, params: { satiety: 50, thirst: -5 } },
  3: { name: 'chips', itemId: 129, params: { satiety: 30, thirst: -5 } },
  4: { name: 'cola', itemId: 130, params: { thirst: 50 } },
};
const EATERY_IMG = ['bishop', 'burger', 'chihua', 'cluckin', 'hornys', 'taco', 'upnatom'];

const markets = new Map<number, DbRow>();
const eateries = new Map<number, DbRow>();
const fuels = new Map<number, DbRow>();

async function pay(player: mint.Player, amount: number, method: number): Promise<boolean> {
  return method === 1 ? removeBank(player, amount) : removeCash(player, amount);
}

function marketPrice(shop: DbRow, key: keyof typeof MARKET): number {
  return Math.round(MARKET[key] * 10 * (Number(shop.priceMultiplier) || 1));
}

async function hasStock(shop: DbRow, units: number): Promise<boolean> {
  const bizId = Number(shop.bizId) || 0;
  if (!bizId) return true;
  const biz = (await table('Biz').findOne({ where: { id: bizId } })) as DbRow | null;
  return !!biz && (Number(biz.productsCount) || 0) >= units;
}

async function takeStock(shop: DbRow, units: number, income: number): Promise<void> {
  const bizId = Number(shop.bizId) || 0;
  if (!bizId) return;
  const biz = (await table('Biz').findOne({ where: { id: bizId } })) as DbRow | null;
  if (!biz) return;
  biz.productsCount = Math.max(0, (Number(biz.productsCount) || 0) - units);
  biz.cashBox = (Number(biz.cashBox) || 0) + income;
  await biz.save();
}

function openMarket(player: mint.Player, shop: DbRow): void {
  const multiplier = Number(shop.priceMultiplier) || 1;
  const prices: Record<string, number> = {};
  for (const key of Object.keys(MARKET) as (keyof typeof MARKET)[]) prices[key] = Math.round(MARKET[key] * 10 * multiplier);
  const bType = Number(shop.bType) || 0;
  const payload = {
    title: bType === 1 ? 'LTD' : bType === 2 ? "Rob's Liquor" : 'Супермаркет',
    headerImg: bType === 1 ? 'ltd.png' : bType === 2 ? 'robsliquor.png' : 'supermarket.png',
    prices,
  };
  cef(player, `supermarket.open(${JSON.stringify(payload)});`);
}

function openEatery(player: mint.Player, shop: DbRow): void {
  const multiplier = Number(shop.priceMultiplier) || 1;
  const prices = {
    hamburger: Math.trunc(EATERY.hamburger * 5 * multiplier),
    hotdog: Math.trunc(EATERY.hotdog * 5 * multiplier),
    pizza: Math.trunc(EATERY.pizza * 5 * multiplier),
    chips: Math.trunc(EATERY.chips * 5 * multiplier),
    cola: Math.trunc(EATERY.cola * 5 * multiplier),
  };
  const img = EATERY_IMG[Number(shop.bType)] ?? 'burger';
  cef(player, [
    `selectMenu.menus["eateryMain"].items[0].values[0] = '$${prices.hamburger}';`,
    `selectMenu.menus["eateryMain"].items[1].values[0] = '$${prices.hotdog}';`,
    `selectMenu.menus["eateryMain"].items[2].values[0] = '$${prices.pizza}';`,
    `selectMenu.menus["eateryMain"].items[3].values[0] = '$${prices.chips}';`,
    `selectMenu.menus["eateryMain"].items[4].values[0] = '$${prices.cola}';`,
    `selectMenu.menus["eateryMain"].headerImg = '${img}.png';`,
    `selectMenu.menu = selectMenu.menus["eateryMain"];`,
    `selectMenu.show = true;`,
  ].join('\n'));
}

function openFuel(player: mint.Player): void {
  cef(player, `selectMenu.menu = selectMenu.menus["fuelStationMenu"]; selectMenu.show = true;`);
}

export async function loadShops(): Promise<number> {
  const marketRows = (await table('Supermarket').findAll()) as DbRow[];
  const eateryRows = (await table('Eatery').findAll()) as DbRow[];
  const fuelRows = (await table('FuelStation').findAll()) as DbRow[];
  for (const shop of marketRows) {
    markets.set(Number(shop.id), shop);
    const shape = new mint.ColshapeSphere(Number(shop.x), Number(shop.y), Number(shop.z), 1.5, 0, true);
    new mint.PointBlip(52, Number(shop.x), Number(shop.y), Number(shop.z), 2, 0.8, true, 0, 'Супермаркет');
    setColshapeHandlers(shape, {
      onEnter: (player) => standing.set(player, { kind: 'market', id: Number(shop.id) }),
      onExit: (player) => {
        standing.delete(player);
        cef(player, 'supermarket.close(false);');
      },
    });
  }
  for (const shop of eateryRows) {
    eateries.set(Number(shop.id), shop);
    const shape = new mint.ColshapeSphere(Number(shop.x), Number(shop.y), Number(shop.z), 1.5, 0, true);
    new mint.PointBlip(93, Number(shop.x), Number(shop.y), Number(shop.z), 5, 0.8, true, 0, 'Закусочная');
    setColshapeHandlers(shape, {
      onEnter: (player) => standing.set(player, { kind: 'eatery', id: Number(shop.id) }),
      onExit: (player) => {
        standing.delete(player);
        cef(player, 'selectMenu.show = false;');
      },
    });
  }
  for (const shop of fuelRows) {
    fuels.set(Number(shop.id), shop);
    const shape = new mint.ColshapeSphere(Number(shop.x), Number(shop.y), Number(shop.z), 10, 0, true);
    new mint.PointBlip(361, Number(shop.x), Number(shop.y), Number(shop.z), 1, 0.8, true, 0, String(shop.name ?? 'АЗС'));
    setColshapeHandlers(shape, {
      onEnter: (player) => standing.set(player, { kind: 'fuel', id: Number(shop.id) }),
      onExit: (player) => {
        standing.delete(player);
        cef(player, 'selectMenu.show = false;');
      },
    });
  }
  onBizPrice((bizId, key, value) => {
    for (const shop of [...markets.values(), ...eateries.values(), ...fuels.values()]) {
      if (Number(shop.bizId) === bizId) shop[key] = value;
    }
  });
  return marketRows.length + eateryRows.length + fuelRows.length;
}

async function buyGoods(player: mint.Player, price: number, method: number, itemId: number, params: Record<string, unknown>): Promise<boolean> {
  const paid = await pay(player, price, method);
  if (!paid) return false;
  const given = await giveItem(player, itemId, params);
  if (!given) {
    if (method === 1) await addBank(player, price);
    else await addCash(player, price);
    return false;
  }
  return true;
}

export function fuelHere(player: mint.Player): DbRow | null {
  const spot = standing.get(player);
  if (spot?.kind !== 'fuel') return null;
  return fuels.get(spot.id) ?? null;
}

export function installShops(): void {
  mint.onClient('crp:shop:use', (player) => {
    const spot = standing.get(player);
    if (!spot) return;
    if (spot.kind === 'market') {
      const shop = markets.get(spot.id);
      if (shop) openMarket(player, shop);
    } else if (spot.kind === 'eatery') {
      const shop = eateries.get(spot.id);
      if (shop) openEatery(player, shop);
    } else if (player.vehicle) openFuel(player);
  });

  mint.onClient('crp:market:buy', async (player, productId, method) => {
    const spot = standing.get(player);
    const shop = spot?.kind === 'market' ? markets.get(spot.id) : undefined;
    const goods = MARKET_ITEMS[Number(productId)];
    if (!shop || !goods) return;
    const price = marketPrice(shop, goods.name as keyof typeof MARKET);
    const ok = await buyGoods(player, price, Number(method) || 0, goods.itemId, goods.params);
    cef(player, `supermarket.notify(${JSON.stringify(ok ? 'Вы приобрели товар' : 'Недостаточно денег')});`);
  });

  mint.onClient('crp:market:phone', async (player, method) => {
    const character = getSession(player).character;
    const spot = standing.get(player);
    const shop = spot?.kind === 'market' ? markets.get(spot.id) : undefined;
    if (!character || !shop) return;
    const existing = await table('Phone').findOne({ where: { characterId: character.id } });
    if (existing) {
      cef(player, `supermarket.notify("У вас уже есть телефон");`);
      return;
    }
    const price = marketPrice(shop, 'phone');
    const units = Math.trunc(MARKET.phone * 0.7);
    if (!(await hasStock(shop, units))) {
      cef(player, `supermarket.notify("В магазине недостаточно товара");`);
      return;
    }
    const paid = await pay(player, price, Number(method) || 0);
    if (!paid) {
      cef(player, `supermarket.notify("Недостаточно денег");`);
      return;
    }
    let number = '';
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const next = String(1000000 + Math.floor(Math.random() * 9000000));
      const taken = await table('Phone').findOne({ where: { number: next } });
      if (!taken) {
        number = next;
        break;
      }
    }
    if (!number) {
      if (Number(method) === 1) await addBank(player, price);
      else await addCash(player, price);
      cef(player, `supermarket.notify("Не удалось выдать номер");`);
      return;
    }
    await table('Phone').create({ characterId: character.id, number, money: 0 });
    await takeStock(shop, units, price);
    await sendPhone(player, true);
    cef(player, `supermarket.notify("Вы купили телефон");`);
    notifySuccess(player, 'Чтобы достать телефон, нажмите стрелку вверх', 'Телефон');
  });

  mint.onClient('crp:market:number', async (player, rawNumber, method) => {
    const character = getSession(player).character;
    const spot = standing.get(player);
    const shop = spot?.kind === 'market' ? markets.get(spot.id) : undefined;
    const number = String(rawNumber ?? '').trim();
    if (!character || !shop) return;
    if (number.length !== 6 || /\D/.test(number) || number.startsWith('0')) {
      cef(player, `supermarket.notify("Номер: 6 цифр, не с нуля");`);
      return;
    }
    const phone = await table('Phone').findOne({ where: { characterId: character.id } });
    if (!phone) {
      cef(player, `supermarket.notify("Сначала купите телефон");`);
      return;
    }
    const price = marketPrice(shop, 'numberChange');
    const units = Math.trunc(MARKET.numberChange * 0.7);
    if (!(await hasStock(shop, units))) {
      cef(player, `supermarket.notify("В магазине недостаточно товара");`);
      return;
    }
    const paid = await pay(player, price, Number(method) || 0);
    if (!paid) {
      cef(player, `supermarket.notify("Недостаточно денег");`);
      return;
    }
    const changed = await changePhoneNumber(player, number);
    if (!changed) {
      if (Number(method) === 1) await addBank(player, price);
      else await addCash(player, price);
      cef(player, `supermarket.notify("Такой номер уже занят");`);
      return;
    }
    await takeStock(shop, units, price);
    cef(player, `supermarket.notify("Номер изменён");`);
  });

  mint.onClient('crp:eatery:buy', async (player, productId, method) => {
    const spot = standing.get(player);
    const shop = spot?.kind === 'eatery' ? eateries.get(spot.id) : undefined;
    const goods = EATERY_ITEMS[Number(productId)];
    if (!shop || !goods) return;
    const price = Math.trunc(EATERY[goods.name] * 5 * (Number(shop.priceMultiplier) || 1));
    const ok = await buyGoods(player, price, Number(method) || 0, goods.itemId, goods.params);
    cef(player, `selectMenu.loader = false; selectMenu.notification = ${JSON.stringify(ok ? 'Вы приобрели товар' : 'Недостаточно денег')};`);
  });

  mint.onClient('crp:fuel:litres', async (player, litres, method) => {
    const spot = standing.get(player);
    const station = spot?.kind === 'fuel' ? fuels.get(spot.id) : undefined;
    const vehicle = player.vehicle;
    const state = vehicle ? vehicleState(vehicle) : undefined;
    if (!station || !vehicle || !state) {
      notifyError(player, 'Нужно быть в транспорте', 'АЗС');
      return;
    }
    if (state.props.isElectric) {
      notifyError(player, 'Электромобиль здесь не заправить', 'АЗС');
      return;
    }
    const room = Math.floor(state.props.maxFuel - state.fuel);
    const asked = Math.trunc(Number(litres) || 0);
    const amount = asked < 0 ? room : asked;
    if (amount < 1 || amount > room) {
      notifyError(player, 'Некорректный объём', 'АЗС');
      return;
    }
    const total = amount * (Number(station.fuelPrice) || 3);
    const paid = await pay(player, total, Number(method) || 0);
    if (!paid) {
      notifyError(player, 'Недостаточно денег', 'АЗС');
      return;
    }
    addFuel(vehicle, amount);
    notifySuccess(player, `${amount} л. за $${total}`, String(station.name ?? 'АЗС'));
    cef(player, 'selectMenu.show = false; loader.show = false;');
  });
}

