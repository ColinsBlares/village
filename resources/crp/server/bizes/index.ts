import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { factionInfo, rankNumber } from '../factions/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess } from '../ui/notify.js';
import { addBank, addCash, removeBank, removeCash } from '../world/money.js';
import { installBizFinance } from './finance.js';
import { pushBiz } from '../player/menu.js';

const TYPES = ['Заправка', 'Магазин', 'Одежда', 'Барбершоп', 'Тату', 'Маски', 'Оружие', 'Закусочная', 'Автосалон', 'СТО', 'Клуб', 'Банк'];
const FACTION_TYPES = new Set([10]);
const at = new WeakMap<mint.Player, number>();

function typeName(type: number): string {
  return TYPES[type] ?? `Бизнес ${type}`;
}

function factionOwned(row: DbRow): boolean {
  return FACTION_TYPES.has(Number(row.type));
}

function roof(row: DbRow): string {
  return factionInfo(Number(row.factionId))?.name ?? '';
}

function daysLeft(date: unknown): number {
  const time = date ? new Date(String(date)).getTime() : 0;
  if (!Number.isFinite(time) || time <= Date.now()) return 0;
  return Math.ceil((time - Date.now()) / 86400000);
}

export function bizApp(row: DbRow): Record<string, unknown> {
  const order = Number(row.productsOrder) || 0;
  return {
    id: row.id,
    name: row.name,
    type: typeName(Number(row.type)),
    cashBox: Number(row.cashBox) || 0,
    pos: [Number(row.x), Number(row.y), Number(row.z)],
    days: daysLeft(row.date),
    rent: Math.trunc(Number(row.price) * 0.01),
    resourcesMax: Number(row.productsMaxCount) || 0,
    resources: Number(row.productsCount) || 0,
    price: Number(row.price) || 0,
    order: order ? { productsCount: order, productsPrice: Number(row.productsOrderPrice) || 0 } : null,
    resourcePriceMin: 12,
    resourcePriceMax: 20,
    improvements: [],
  };
}

async function pay(player: mint.Player, sum: number, method: number): Promise<boolean> {
  if (method === 1) return removeBank(player, sum);
  return removeCash(player, sum);
}

export async function loadBizes(): Promise<number> {
  const rows = (await table('Biz').findAll()) as DbRow[];
  for (const biz of rows) {
    const shape = new mint.ColshapeSphere(Number(biz.x), Number(biz.y), Number(biz.z), 2, 0, true);
    setColshapeHandlers(shape, {
      onEnter: (player) => {
        if (player.vehicle) return;
        at.set(player, Number(biz.id));
        cef(player, `prompt.showByName('biz_info_ask');`);
      },
      onExit: (player) => {
        if (at.get(player) === Number(biz.id)) at.delete(player);
        cef(player, `prompt.hide(); mp.event.call('biz.menu.close', true);`);
      },
    });
  }
  return rows.length;
}

export function installBizes(): void {
  installBizFinance(at);
  mint.onClient('crp:biz:open', async (player) => {
    const id = at.get(player);
    const biz = id ? (await table('Biz').findOne({ where: { id } })) as DbRow | null : null;
    const character = getSession(player).character;
    if (!biz || !character || player.pos.distanceTo(new mint.Vector3(Number(biz.x), Number(biz.y), Number(biz.z))) > 10) return;
    const actions: string[] = [];
    const owned = factionOwned(biz);
    if (!owned && Number(biz.characterId) === Number(character.id)) actions.push('finance');
    const mine = factionInfo(Number(character.factionId));
    const top = mine?.ranks.length ? Math.max(...mine.ranks.map((rank) => rank.rank)) : 0;
    if (owned && mine && mine.id === Number(biz.factionId) && rankNumber(player) >= top) actions.push('finance');
    const info = {
      id: biz.id,
      name: biz.name,
      owner: owned ? roof(biz) || 'Нет' : biz.characterNick,
      faction: roof(biz),
      type: typeName(Number(biz.type)),
      rent: Math.trunc(Number(biz.price) * 0.01),
      price: Number(biz.price) || 0,
      actions,
      pos: [Number(biz.x), Number(biz.y), Number(biz.z)],
      cashBox: Number(biz.cashBox) || 0,
      productsCount: Number(biz.productsCount) || 0,
      productsOrder: Number(biz.productsOrder) || 0,
    };
    cef(player, `mp.event.call('biz.load', ${JSON.stringify(info)}); mp.event.call('biz.menu');`);
  });

  mint.onClient('crp:biz:buy', async (player, method) => {
    const id = at.get(player);
    const biz = id ? (await table('Biz').findOne({ where: { id } })) as DbRow | null : null;
    const character = getSession(player).character;
    if (!biz || !character || factionOwned(biz) || biz.characterId != null) return cef(player, `mp.event.call('biz.buy.ans', 0, '');`);
    const owned = (await table('Biz').findOne({ where: { characterId: character.id } })) as DbRow | null;
    if (owned) return cef(player, `mp.event.call('biz.buy.ans', 2, '');`);
    const price = Number(biz.price) || 0;
    if (!(await pay(player, price, Number(method) || 0))) return cef(player, `mp.event.call('biz.buy.ans', 0, '');`);
    biz.characterId = character.id;
    biz.characterNick = character.name;
    biz.date = new Date(Date.now() + 24 * 60 * 60 * 1000);
    biz.cashBox = 0;
    biz.productsOrder = 0;
    biz.productsOrderPrice = 0;
    await biz.save();
    cef(player, `mp.event.call('biz.buy.ans', 1, ${JSON.stringify(character.name)}); phone.app.add('biz', ${JSON.stringify({ id: biz.id, name: biz.name })});`);
    notifyInfo(player, 'Оплатите имущество в банке в течение 24 часов, иначе оно будет продано', 'Внимание');
    void pushBiz(player);
  });

  mint.onClient('crp:biz:gov', async (player, rawId) => {
    const character = getSession(player).character;
    const biz = (await table('Biz').findOne({ where: { id: Number(rawId) || at.get(player) } })) as DbRow | null;
    if (!biz || !character || factionOwned(biz) || Number(biz.characterId) !== Number(character.id)) return cef(player, `mp.event.call('biz.sell.toGov.ans', 0);`);
    if (player.pos.distanceTo(new mint.Vector3(Number(biz.x), Number(biz.y), Number(biz.z))) > 10) return cef(player, `mp.event.call('biz.sell.toGov.ans', 3);`);
    const payback = Math.trunc(Number(biz.price) * 0.6);
    biz.characterId = null;
    biz.characterNick = null;
    biz.date = null;
    biz.cashBox = 0;
    await biz.save();
    await addBank(player, payback);
    cef(player, `mp.event.call('biz.sell.toGov.ans', 1); phone.app.remove('biz');`);
    notifySuccess(player, `Бизнес продан штату за $${payback}`, 'Бизнес');
    void pushBiz(player);
  });

  mint.onClient('crp:biz:order', async (player, raw) => {
    const data = JSON.parse(String(raw ?? '{}')) as { id?: number; count?: number; price?: number };
    const count = Math.trunc(Number(data.count));
    const price = Math.trunc(Number(data.price));
    const biz = (await table('Biz').findOne({ where: { id: Number(data.id) || at.get(player) } })) as DbRow | null;
    const character = getSession(player).character;
    if (!biz || !character || count < 1 || price < 1) return cef(player, `mp.event.call('biz.order.ans', 0, false);`);
    if (Number(biz.characterId) !== Number(character.id)) return cef(player, `mp.event.call('biz.order.ans', 0, false);`);
    const sum = count * price;
    if ((Number(biz.cashBox) || 0) < sum) return cef(player, `mp.event.call('biz.order.ans', 2, false);`);
    if ((Number(biz.productsCount) || 0) + count > (Number(biz.productsMaxCount) || 1000)) return cef(player, `mp.event.call('biz.order.ans', 3, false);`);
    biz.cashBox = Number(biz.cashBox) - sum;
    biz.productsOrder = count;
    biz.productsOrderPrice = sum;
    await biz.save();
    cef(player, `mp.event.call('biz.order.ans', 1, false);`);
    notifySuccess(player, `Заказ ${count} ед. за $${sum} отправлен на склад`, String(biz.name));
  });

  mint.onClient('crp:biz:order:cancel', async (player, rawId) => {
    const biz = (await table('Biz').findOne({ where: { id: Number(rawId) } })) as DbRow | null;
    const character = getSession(player).character;
    if (!biz || !character || Number(biz.characterId) !== Number(character.id)) return;
    biz.productsOrder = 0;
    biz.productsOrderPrice = 0;
    await biz.save();
    notifyInfo(player, 'Заказ отменён', String(biz.name));
  });

  const bizBuyers = new WeakMap<mint.Player, number>();
  const bizSales = new WeakMap<mint.Player, { buyerId: number; bizId: number; cost: number }>();
  mint.onClient('crp:biz:check', (player, raw) => {
    const text = String(raw ?? '').trim();
    const id = Number(text);
    const buyer = Number.isInteger(id) && text !== ''
      ? mint.Player.getByID(id)
      : mint.Player.all.find((entry) => entry.valid && getSession(entry).character?.name === text);
    if (!buyer?.valid || buyer.id === player.id) return cef(player, `mp.event.call('biz.sell.check.ans', null);`);
    bizBuyers.set(player, buyer.id);
    cef(player, `mp.event.call('biz.sell.check.ans', ${JSON.stringify(getSession(buyer).character?.name ?? buyer.name)});`);
  });
  mint.onClient('crp:biz:player', async (player, raw) => {
    const data = typeof raw === 'string' && raw.startsWith('{')
      ? JSON.parse(raw) as { id?: number; cost?: number }
      : { id: Number(raw), cost: 0 };
    const buyer = mint.Player.getByID(bizBuyers.get(player) ?? 0);
    const biz = (await table('Biz').findOne({ where: { id: Number(data.id) } })) as DbRow | null;
    const cost = Math.trunc(Number(data.cost));
    const character = getSession(player).character;
    if (!buyer?.valid || !biz || !character || factionOwned(biz)) return cef(player, `mp.event.call('biz.sell.ans', 0);`);
    if ((Number(getSession(buyer).character?.cash) || 0) < cost) return cef(player, `mp.event.call('biz.sell.ans', 5);`);
    const owned = (await table('Biz').findOne({ where: { characterId: getSession(buyer).character?.id } })) as DbRow | null;
    if (owned) return cef(player, `mp.event.call('biz.sell.ans', 6);`);
    const spot = new mint.Vector3(Number(biz.x), Number(biz.y), Number(biz.z));
    if (player.pos.distanceTo(spot) > 10 || buyer.pos.distanceTo(spot) > 10) return cef(player, `mp.event.call('biz.sell.ans', 3);`);
    if (cost < Number(biz.price) || cost > 1000000000) return cef(player, `mp.event.call('biz.sell.ans', 4);`);
    bizSales.set(player, { buyerId: buyer.id, bizId: Number(biz.id), cost });
    cef(buyer, `offerDialog.show('biz_sell', ${JSON.stringify({ name: character.name, price: cost })});`);
  });
  mint.onClient('crp:biz:player:ans', async (player, result) => {
    const seller = mint.Player.all.find((entry) => bizSales.get(entry)?.buyerId === player.id);
    const sale = seller ? bizSales.get(seller) : undefined;
    if (!seller?.valid || !sale) return;
    bizSales.delete(seller);
    bizBuyers.delete(seller);
    const finish = (code: number) => cef(seller, `mp.event.call('biz.sell.ans', ${code});`);
    if (Number(result) !== 1) return finish(2);
    const biz = (await table('Biz').findOne({ where: { id: sale.bizId } })) as DbRow | null;
    if (!biz || Number(biz.characterId) !== Number(getSession(seller).character?.id)) return finish(0);
    if ((Number(getSession(player).character?.cash) || 0) < sale.cost) return finish(5);
    const owned = (await table('Biz').findOne({ where: { characterId: getSession(player).character?.id } })) as DbRow | null;
    if (owned) return finish(6);
    if (!(await removeCash(player, sale.cost))) return finish(5);
    if (!(await addCash(seller, sale.cost))) {
      await addCash(player, sale.cost);
      return finish(0);
    }
    biz.characterId = getSession(player).character?.id;
    biz.characterNick = getSession(player).character?.name;
    biz.date = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await biz.save();
    finish(1);
    notifyInfo(player, 'Оплатите имущество в банке в течение 24 часов, иначе оно будет продано', 'Внимание');
    void pushBiz(player);
    void pushBiz(seller);
  });
  mint.onClient('crp:biz:stop', (player) => {
    const buyerId = bizSales.get(player)?.buyerId ?? bizBuyers.get(player);
    bizSales.delete(player);
    bizBuyers.delete(player);
    const buyer = buyerId ? mint.Player.getByID(buyerId) : null;
    if (buyer?.valid) cef(buyer, 'offerDialog.hide();');
  });
}
