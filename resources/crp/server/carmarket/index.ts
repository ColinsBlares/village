import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { houseForCharacter } from '../houses/index.js';
import { giveItem } from '../inventory/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess } from '../ui/notify.js';
import { addBank, addCash, removeBank, removeCash } from '../world/money.js';
import { hideVehicle, placeVehicle, vehicleState } from '../vehicles/index.js';
import { canOwnAnother } from '../vehicles/sell.js';

const SELL = 0.7;
const BUY = 0.8;
const MARKET = { x: 61.74, y: -1727.13, z: 29.5 };
const here = new WeakSet<mint.Player>();
let spots: DbRow[] = [];
let nextSpot = 0;

function driver(player: mint.Player): boolean {
  return player.vehicle != null && (player.seat === 1 || player.seat === 0);
}

async function dropKeys(vehId: number): Promise<void> {
  const rows = (await table('CharacterInventory').findAll({
    where: { itemId: 33 },
    include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
  })) as DbRow[];
  for (const row of rows) {
    const params = (row.params ?? []) as DbRow[];
    if (params.some((param) => param.key === 'vehId' && String(param.value) === String(vehId)) && typeof row.destroy === 'function') {
      await row.destroy();
    }
  }
}

export async function loadCarMarket(): Promise<number> {
  spots = (await table('CarMarketData').findAll()) as DbRow[];
  new mint.PointBlip(225, MARKET.x, MARKET.y, MARKET.z, 73, 0.8, true, 0, 'Авторынок');
  const shape = new mint.ColshapeSphere(MARKET.x, MARKET.y, MARKET.z, 4, 0, true);
  shape.setMeta('carmarket', true);
  const rows = (await table('Vehicle').findAll({ where: { key: 'market' } })) as DbRow[];
  for (const row of rows) placeVehicle(row);
  mint.log(`crp: авторынок, мест ${spots.length}, машин ${rows.length}`);
  return spots.length;
}

export function installCarMarket(): void {
  mint.on('entityEnterColshape', (shape, entity) => {
    if (!shape.hasMeta('carmarket') || !(entity instanceof mint.Player)) return;
    here.add(entity);
    cef(entity, `prompt.showByName(${JSON.stringify(entity.vehicle ? 'carmarket_control' : 'carmarket_noveh')});`);
  });
  mint.on('entityLeaveColshape', (shape, entity) => {
    if (!shape.hasMeta('carmarket') || !(entity instanceof mint.Player)) return;
    here.delete(entity);
    cef(entity, 'prompt.hide();');
  });
  mint.on('playerEnteredVehicle', (player, vehicle, seat) => {
    const state = vehicleState(vehicle);
    if (!state || state.key !== 'market' || (seat !== 1 && seat !== 0)) return;
    player.emit('crp:carmarket:buy', JSON.stringify({
      name: state.props.name,
      price: Math.round(state.props.price * BUY),
      mileage: state.mileage,
      owners: Number(state.row?.owners) || 1,
    }));
  });
  mint.on('playerLeftVehicle', (player, vehicle) => {
    if (vehicleState(vehicle)?.key === 'market') player.emit('crp:carmarket:buy:close');
  });
  mint.onClient('crp:shop:use', (player) => {
    if (!here.has(player) || !driver(player)) return;
    const state = player.vehicle ? vehicleState(player.vehicle) : undefined;
    const character = getSession(player).character;
    if (!state || !character || state.key !== 'private' || state.owner !== Number(character.id)) return;
    const sum = Math.round(state.props.price * SELL);
    notifyInfo(player, `За этот транспорт вы получите $${sum}`, 'Авторынок');
    player.emit('crp:carmarket:sell');
  });
  mint.onClient('crp:carmarket:menu', (player) => {
    const state = player.vehicle ? vehicleState(player.vehicle) : undefined;
    const character = getSession(player).character;
    if (!here.has(player) || !driver(player) || !state || !character) return;
    if (state.key !== 'private' || state.owner !== Number(character.id)) return notifyError(player, 'Это не ваш транспорт', 'Ошибка');
    const sum = Math.round(state.props.price * SELL);
    notifyInfo(player, `За этот транспорт вы получите $${sum}`, 'Авторынок');
    player.emit('crp:carmarket:sell');
  });
  mint.onClient('crp:carmarket:sell', async (player) => {
    const vehicle = player.vehicle;
    const state = vehicle ? vehicleState(vehicle) : undefined;
    const character = getSession(player).character;
    if (!here.has(player) || !vehicle || !state?.row || !character || state.key !== 'private' || state.owner !== Number(character.id)) {
      return notifyError(player, 'Это не ваш транспорт', 'Ошибка');
    }
    const sum = Math.round(state.props.price * SELL);
    const spot = spots.length ? spots[nextSpot % spots.length] : undefined;
    if (!(await addCash(player, sum))) return notifyError(player, 'Не удалось выдать деньги', 'Авторынок');
    nextSpot += 1;
    const vehId = Number(state.row.id);
    state.key = 'market';
    state.row.key = 'market';
    if (spot) {
      state.row.x = spot.x;
      state.row.y = spot.y;
      state.row.z = spot.z;
      state.row.h = spot.h;
    }
    await state.row.save();
    await dropKeys(vehId);
    hideVehicle(vehId);
    placeVehicle(state.row);
    notifySuccess(player, `Вы продали транспорт за $${sum}`, 'Авторынок');
    mint.emitClient(player, 'crp:chat', `!{#80c102}Транспорт продан за !{#009eec}$${sum}`);
  });
  mint.onClient('crp:carmarket:buy', async (player, method) => {
    const vehicle = player.vehicle;
    const state = vehicle ? vehicleState(vehicle) : undefined;
    const character = getSession(player).character;
    const payMethod = Number(method) || 0;
    if (!driver(player) || !vehicle || !state?.row || state.key !== 'market' || !character) return notifyError(player, 'Вы не в машине с рынка', 'Ошибка');
    const price = Math.round(state.props.price * BUY);
    const have = payMethod === 1 ? Number(character.bank) || 0 : Number(character.cash) || 0;
    if (have < price) return notifyError(player, 'Недостаточно денег', 'Ошибка');
    if (!(await canOwnAnother(player))) return notifyError(player, 'Достигнут лимит на т/с', 'Ошибка');
    const paid = payMethod === 1 ? await removeBank(player, price) : await removeCash(player, price);
    if (!paid) return notifyError(player, 'Операция не прошла', 'Ошибка');
    await dropKeys(Number(state.row.id));
    const keys = await giveItem(player, 33, { owner: character.id, vehId: state.row.id, vehName: state.props.name });
    if (!keys) {
      if (payMethod === 1) await addBank(player, price);
      else await addCash(player, price);
      return notifyError(player, 'Нет места для ключей', 'Инвентарь');
    }
    state.key = 'private';
    state.owner = Number(character.id);
    state.row.key = 'private';
    state.row.owner = character.id;
    state.row.owners = (Number(state.row.owners) || 1) + 1;
    const house = houseForCharacter(Number(character.id));
    if (house) {
      state.row.x = house.info.pickupX;
      state.row.y = house.info.pickupY;
      state.row.z = house.info.pickupZ;
      state.row.parkingDate = null;
    }
    await state.row.save();
    notifySuccess(player, `Вы купили ${state.props.name} за $${price}`, 'Авторынок');
  });
}
