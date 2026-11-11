import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { writeCrash } from '../core/log.js';
import type { DbRow } from '../player/session.js';
import { getSession } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyInfo, notifySuccess } from '../ui/notify.js';
import { addBank, addCash, removeBank, removeCash } from '../world/money.js';

interface HouseSpot {
  id: number;
  place: number;
}

export interface HouseRecord {
  info: DbRow;
  interior: DbRow;
  garage: DbRow | null;
  blip: mint.PointBlip | null;
}

const houses = new Map<number, HouseRecord>();
const spots = new WeakMap<mint.Colshape, HouseSpot>();
const standing = new WeakMap<mint.Player, HouseSpot>();

function paintHouse(house: HouseRecord): void {
  const blip = house.blip;
  if (!blip?.valid) return;
  const owned = house.info.characterId != null;
  blip.color = owned ? 1 : 2;
  blip.name = owned ? 'Дом' : 'Продажа собственности';
  blip.shortRange = true;
}

function rentOf(house: HouseRecord): number {
  return Math.trunc(Number(house.info.price) * (Number(house.interior.rent) || 0));
}

function daysLeft(date: unknown): number {
  const time = date ? new Date(String(date)).getTime() : 0;
  if (!Number.isFinite(time) || time <= Date.now()) return 0;
  return Math.ceil((time - Date.now()) / 86400000);
}

export function houseApp(house: HouseRecord): Record<string, unknown> {
  const info = house.info;
  return {
    ...menuOf(house),
    isOpened: info.isOpened,
    improvements: [{ name: 'Шкаф', type: 'holder', price: Math.trunc(Number(info.price) * HOLDER_MULT), isBuyed: Boolean(Number(info.holder)) }],
    days: daysLeft(info.date),
  };
}

function menuOf(house: HouseRecord): Record<string, unknown> {
  const info = house.info;
  const interior = house.interior;
  const body: Record<string, unknown> = {
    name: info.id,
    class: interior.class,
    numRooms: interior.numRooms,
    garage: house.garage != null,
    carPlaces: house.garage ? Number(house.garage.carPlaces) || 1 : 1,
    rent: rentOf(house),
    price: info.price,
    pos: [info.pickupX, info.pickupY, info.pickupZ],
  };
  if (info.characterId != null) body.owner = info.characterNick;
  return body;
}

function openMenu(player: mint.Player, spot: HouseSpot): void {
  const house = houses.get(spot.id);
  if (!house) return;
  standing.set(player, spot);
  if (spot.place === 0) {
    cef(player, `mp.event.call('house.menu'); mp.event.call('house.load', ${JSON.stringify(menuOf(house))});`);
    return;
  }
  if (house.garage) cef(player, `mp.event.call('house.menu.enter', ${spot.place});`);
  else void enterHouse(player, spot.place === 1 ? 0 : 1);
}

export async function loadHouses(): Promise<number> {
  const interiors = (await table('Interior').findAll({ include: [table('Garage')] })) as DbRow[];
  const interiorById = new Map<number, DbRow>();
  for (const interior of interiors) interiorById.set(Number(interior.id), interior);
  const rows = (await table('House').findAll()) as DbRow[];
  for (const info of rows) {
    const interior = interiorById.get(Number(info.interiorId));
    if (!interior) continue;
    const garage = (interior.Garage ?? interior.garage ?? null) as DbRow | null;
    const record: HouseRecord = { info, interior, garage, blip: null };
    houses.set(Number(info.id), record);
    record.blip = new mint.PointBlip(40, Number(info.pickupX), Number(info.pickupY), Number(info.pickupZ), 2, 0.8, true, 0, 'Продажа собственности');
    paintHouse(record);
    const enter = new mint.ColshapeCylinder(Number(info.pickupX), Number(info.pickupY), Number(info.pickupZ), 2, 2, 0, true);
    spots.set(enter, { id: Number(info.id), place: 0 });
    setColshapeHandlers(enter, {
      onEnter: (player) => openMenu(player, { id: Number(info.id), place: 0 }),
      onExit: (player) => {
        standing.delete(player);
        cef(player, `mp.event.call('house.menu.close');`);
      },
    });
    const exit = new mint.ColshapeSphere(Number(interior.exitX), Number(interior.exitY), Number(interior.exitZ), 1, Number(info.id), true);
    spots.set(exit, { id: Number(info.id), place: 1 });
    setColshapeHandlers(exit, {
      onEnter: (player) => openMenu(player, { id: Number(info.id), place: 1 }),
      onExit: (player) => cef(player, `mp.event.call('house.menu.enter.close');`),
    });
    if (garage) {
      const garageExit = new mint.ColshapeSphere(Number(garage.exitX), Number(garage.exitY), Number(garage.exitZ), 1, Number(info.id), true);
      spots.set(garageExit, { id: Number(info.id), place: 2 });
      setColshapeHandlers(garageExit, {
        onEnter: (player) => openMenu(player, { id: Number(info.id), place: 2 }),
        onExit: (player) => cef(player, `mp.event.call('house.menu.enter.close');`),
      });
    }
    if (Number(info.holder)) {
      const mod = await import('../inventory/houseHolder.js');
      await mod.installHouseHolder(record);
    }
  }
  return houses.size;
}

export function houseById(id: number): HouseRecord | null {
  return houses.get(id) ?? null;
}

export function syncOwnedHouse(player: mint.Player): void {
  syncHouseMenu(player);
}

function syncHouseMenu(player: mint.Player): void {
  const house = houseForCharacter(Number(getSession(player).character?.id));
  const data: Record<string, unknown> = {};
  if (house) {
    data.house = {
      id: house.info.id,
      pos: [house.info.pickupX, house.info.pickupY, house.info.pickupZ],
      class: house.interior.class,
      rooms: house.interior.numRooms,
      carPlaces: house.garage ? Number(house.garage.carPlaces) || 0 : 0,
      price: house.info.price,
    };
  }
  cef(player, `mp.event.call('playerMenu.setHouse', ${JSON.stringify(data)});`);
}

export function houseForCharacter(characterId: number): HouseRecord | null {
  for (const house of houses.values()) {
    if (Number(house.info.characterId) === characterId) return house;
  }
  return null;
}

export function ownedHouses(): HouseRecord[] {
  return [...houses.values()].filter((house) => house.info.characterId != null);
}

export async function releaseHouse(house: HouseRecord): Promise<number | null> {
  if (house.info.characterId == null) return null;
  const characterId = Number(house.info.characterId);
  house.info.characterId = null;
  house.info.characterNick = null;
  house.info.date = null;
  house.info.isOpened = true;
  house.info.holder = 0;
  paintHouse(house);
  await house.info.save();
  return characterId;
}

export async function enterHouse(player: mint.Player, place: number): Promise<void> {
  const spot = standing.get(player);
  const house = spot ? houses.get(spot.id) : null;
  if (!house) {
    cef(player, `mp.event.call('house.enter.ans.err');`);
    return;
  }
  const info = house.info;
  if (info.characterId != null && Number(info.characterId) !== Number(getSession(player).character?.id) && !info.isOpened) {
    cef(player, `mp.event.call('house.enter.ans.err');`);
    return;
  }
  if (place === 0) {
    player.dimension = 0;
    player.pos = new mint.Vector3(Number(info.spawnX), Number(info.spawnY), Number(info.spawnZ));
    player.rot = new mint.Vector3(0, 0, (Number(info.angle) || 0) * (Math.PI / 180));
  } else if (place === 1) {
    player.dimension = Number(info.id);
    player.pos = new mint.Vector3(Number(house.interior.x), Number(house.interior.y), Number(house.interior.z));
    player.rot = new mint.Vector3(0, 0, (Number(house.interior.rotation) || 0) * (Math.PI / 180));
  } else if (place === 2 && house.garage) {
    player.dimension = Number(info.id);
    player.pos = new mint.Vector3(Number(house.garage.x), Number(house.garage.y), Number(house.garage.z));
    player.rot = new mint.Vector3(0, 0, (Number(house.garage.rotation) || 0) * (Math.PI / 180));
  } else {
    cef(player, `mp.event.call('house.enter.ans.err');`);
    return;
  }
  cef(player, `mp.event.call('house.menu.close'); mp.event.call('house.menu.enter.close');`);
}

const HOLDER_MULT = 0.01;

export async function buyHolder(player: mint.Player): Promise<void> {
  const character = getSession(player).character;
  const spot = standing.get(player);
  const house = spot ? houses.get(spot.id) : null;
  if (!character || !house || Number(house.info.characterId) !== Number(character.id) || Number(house.info.holder)) {
    cef(player, 'mp.event.call("house.improvements.buy.ans", 0);');
    return;
  }
  const price = Math.trunc(Number(house.info.price) * HOLDER_MULT);
  const paid = await removeCash(player, price);
  if (!paid) {
    cef(player, 'mp.event.call("house.improvements.buy.ans", 2);');
    return;
  }
  house.info.holder = 1;
  await house.info.save();
  const mod = await import('../inventory/houseHolder.js');
  await mod.installHouseHolder(house);
  cef(player, 'mp.event.call("house.improvements.buy.ans", 1);');
  notifyInfo(player, 'Шкаф установлен в доме', 'Улучшение');
}

export async function buyHouse(player: mint.Player, method: number): Promise<void> {
  const character = getSession(player).character;
  const spot = standing.get(player);
  const house = spot ? houses.get(spot.id) : null;
  if (!character || !house || house.info.characterId != null) {
    cef(player, `mp.event.call('house.buy.ans', 0, "");`);
    return;
  }
  if (houseForCharacter(Number(character.id))) {
    cef(player, `mp.event.call('house.buy.ans', 2, "");`);
    return;
  }
  const price = Number(house.info.price) || 0;
  const paid = method === 1 ? await removeBank(player, price) : await removeCash(player, price);
  if (!paid) {
    cef(player, `mp.event.call('house.buy.ans', 0, "");`);
    return;
  }
  house.info.characterId = character.id;
  house.info.characterNick = character.name;
  house.info.date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await house.info.save();
  paintHouse(house);
  cef(player, `mp.event.call('house.buy.ans', 1, ${JSON.stringify(String(character.name ?? ''))});`);
  notifyInfo(player, 'Оплатите имущество в банке в течение 24 часов, иначе оно будет продано', 'Внимание');
  syncHouseMenu(player);
}

interface HouseSale {
  buyerId: number;
  houseId: number;
  cost: number;
}

const buyers = new WeakMap<mint.Player, number>();
const sales = new WeakMap<mint.Player, HouseSale>();

function buyerOf(player: mint.Player, raw: unknown): mint.Player | null {
  const text = String(raw ?? '').trim();
  const id = Number(text);
  if (Number.isInteger(id) && text !== '') {
    const byId = mint.Player.getByID(id);
    return byId?.valid && byId.id !== player.id ? byId : null;
  }
  return mint.Player.all.find((entry) => entry.valid && entry.id !== player.id && getSession(entry).character?.name === text) ?? null;
}

async function hasCars(characterId: number): Promise<boolean> {
  const rows = (await table('Vehicle').findAll({ where: { key: 'private', owner: characterId } })) as DbRow[];
  return rows.length > 0;
}

export function installHouses(): void {
  mint.onClient('crp:house:sell:check', (player, raw) => {
    const buyer = buyerOf(player, raw);
    if (!buyer) return cef(player, `mp.event.call('house.sell.check.ans', null);`);
    buyers.set(player, buyer.id);
    cef(player, `mp.event.call('house.sell.check.ans', ${JSON.stringify(getSession(buyer).character?.name ?? buyer.name)});`);
  });
  mint.onClient('crp:house:sell', async (player, rawId, rawCost) => {
    const buyer = mint.Player.getByID(buyers.get(player) ?? 0);
    const house = houseById(Number(rawId));
    const cost = Math.trunc(Number(rawCost));
    const character = getSession(player).character;
    if (!buyer?.valid || !house || !character) return cef(player, `mp.event.call('house.sell.ans', 0);`);
    if (await hasCars(Number(character.id))) return cef(player, `mp.event.call('house.sell.ans', 5);`);
    if ((Number(getSession(buyer).character?.cash) || 0) < cost) return cef(player, `mp.event.call('house.sell.ans', 6);`);
    if (houseForCharacter(Number(getSession(buyer).character?.id))) return cef(player, `mp.event.call('house.sell.ans', 7);`);
    const spot = new mint.Vector3(Number(house.info.pickupX), Number(house.info.pickupY), Number(house.info.pickupZ));
    if (player.pos.distanceTo(spot) > 10 || buyer.pos.distanceTo(spot) > 10) return cef(player, `mp.event.call('house.sell.ans', 3);`);
    if (cost < Number(house.info.price) || cost > 1000000000) return cef(player, `mp.event.call('house.sell.ans', 4);`);
    sales.set(player, { buyerId: buyer.id, houseId: Number(house.info.id), cost });
    cef(buyer, `offerDialog.show('house_sell', ${JSON.stringify({ name: character.name, price: cost })});`);
  });
  mint.onClient('crp:house:sell:ans', async (player, result) => {
    const seller = mint.Player.all.find((entry) => sales.get(entry)?.buyerId === player.id);
    const sale = seller ? sales.get(seller) : undefined;
    if (!seller?.valid || !sale) return;
    sales.delete(seller);
    buyers.delete(seller);
    const house = houseById(sale.houseId);
    const finish = (code: number) => cef(seller, `mp.event.call('house.sell.ans', ${code});`);
    if (Number(result) !== 1) return finish(2);
    if (!house || Number(house.info.characterId) !== Number(getSession(seller).character?.id)) return finish(0);
    if ((Number(getSession(player).character?.cash) || 0) < sale.cost) return finish(6);
    if (houseForCharacter(Number(getSession(player).character?.id))) return finish(7);
    if (!(await removeCash(player, sale.cost))) return finish(6);
    if (!(await addCash(seller, sale.cost))) {
      await addCash(player, sale.cost);
      return finish(0);
    }
    house.info.characterId = getSession(player).character?.id;
    house.info.characterNick = getSession(player).character?.name;
    house.info.date = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await house.info.save();
    paintHouse(house);
    finish(1);
    notifyInfo(player, 'Оплатите имущество в банке в течение 24 часов, иначе оно будет продано', 'Внимание');
    syncHouseMenu(player);
    syncHouseMenu(seller);
  });
  mint.onClient('crp:house:sell:stop', (player) => {
    const buyerId = sales.get(player)?.buyerId ?? buyers.get(player);
    sales.delete(player);
    buyers.delete(player);
    const buyer = buyerId ? mint.Player.getByID(buyerId) : null;
    if (buyer?.valid) cef(buyer, 'offerDialog.hide();');
  });
  mint.onClient('crp:house:gov', async (player, rawId) => {
    const house = houseById(Number(rawId));
    const character = getSession(player).character;
    if (!house || !character || Number(house.info.characterId) !== Number(character.id)) return cef(player, `mp.event.call('house.sell.toGov.ans', 0);`);
    if (await hasCars(Number(character.id))) return cef(player, `mp.event.call('house.sell.toGov.ans', 5);`);
    const spot = new mint.Vector3(Number(house.info.pickupX), Number(house.info.pickupY), Number(house.info.pickupZ));
    if (player.pos.distanceTo(spot) > 10) return cef(player, `mp.event.call('house.sell.toGov.ans', 3);`);
    const payback = Math.trunc(Number(house.info.price) * 0.6);
    house.info.characterId = null;
    house.info.characterNick = null;
    house.info.date = null;
    await house.info.save();
    paintHouse(house);
    await addBank(player, payback);
    cef(player, `mp.event.call('house.sell.toGov.ans', 1);`);
    notifySuccess(player, `Дом продан штату за $${payback}`, 'Дом');
    syncHouseMenu(player);
  });
  mint.onClient('crp:house:lock', async (player, rawId, opened) => {
    const house = houseById(Number(rawId));
    const character = getSession(player).character;
    if (!house || !character || Number(house.info.characterId) !== Number(character.id)) return;
    house.info.isOpened = opened === true || opened === 1 || opened === '1';
    await house.info.save();
  });
  mint.onClient('crp:house:enter', (player, place) => {
    void enterHouse(player, Number(place) || 0).catch((err: unknown) => writeCrash('house.enter', err));
  });
  mint.onClient('crp:house:buy', (player, method) => {
    void buyHouse(player, Number(method) || 0).catch((err: unknown) => writeCrash('house.buy', err));
  });
  mint.onClient('crp:house:improve', (player, type) => {
    if (String(type) !== 'holder') return;
    void buyHolder(player).catch((err: unknown) => writeCrash('house.improve', err));
  });
}
