import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { houseForCharacter } from '../houses/index.js';
import { giveItem } from '../inventory/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError } from '../ui/notify.js';
import { addCash, removeCash } from '../world/money.js';
import { vehicleState } from './index.js';

interface Offer {
  seller: mint.Player;
  vehicle: mint.Vehicle;
  price: number;
  vehId: number;
}

const offers = new WeakMap<mint.Player, Offer>();

function distance(left: mint.Player, right: mint.Player): number {
  return Math.hypot(left.pos.x - right.pos.x, left.pos.y - right.pos.y, left.pos.z - right.pos.z);
}

function answer(player: mint.Player, who: 'seller' | 'target', code: number, extra?: unknown): void {
  cef(player, `mp.event.call(${JSON.stringify(`vehicles.sell.${who}.final`)}, ${JSON.stringify(extra == null ? [code] : [code, extra])});`);
}

export async function canOwnAnother(player: mint.Player): Promise<boolean> {
  const character = getSession(player).character;
  if (!character) return false;
  const rows = (await table('Vehicle').findAll({ where: { owner: character.id, key: 'private' } })) as DbRow[];
  const house = houseForCharacter(Number(character.id));
  if (!house) return rows.length < 1;
  const places = Number(house.garage?.carPlaces) || 1;
  if (places > 1) return rows.length + 1 <= places - 1;
  return rows.length < places;
}

export function installVehicleSell(): void {
  mint.onClient('crp:veh:sell', (player, raw) => {
    const data = JSON.parse(String(raw ?? '{}')) as { id?: number; price?: number };
    const vehicle = player.vehicle;
    const state = vehicle ? vehicleState(vehicle) : undefined;
    const character = getSession(player).character;
    if (!vehicle || !state) return answer(player, 'seller', 0);
    if (state.key !== 'private' || state.owner !== Number(character?.id)) return answer(player, 'seller', 1);
    if (player.id === Number(data.id)) return answer(player, 'seller', 6);
    const price = Math.trunc(Number(data.price));
    if (!Number.isFinite(price) || price < 1) return answer(player, 'seller', 2);
    const target = mint.Player.getByID(Number(data.id));
    if (!target?.valid) return answer(player, 'seller', 3);
    if (distance(player, target) > 10) return answer(player, 'seller', 4);
    answer(player, 'seller', 5, { targetName: getSession(target).character?.name, vehicleName: state.props.name, price });
  });
  mint.onClient('crp:veh:sell:offer', (player, raw) => {
    const data = JSON.parse(String(raw ?? '{}')) as { id?: number; price?: number };
    const price = Math.trunc(Number(data.price));
    const target = mint.Player.getByID(Number(data.id));
    const vehicle = player.vehicle;
    const state = vehicle ? vehicleState(vehicle) : undefined;
    const character = getSession(player).character;
    if (!Number.isFinite(price) || price < 1) return notifyError(player, 'Неверная цена', 'Ошибка');
    if (!target?.valid) return notifyError(player, 'Нет игрока', 'Ошибка');
    if (distance(player, target) > 10) return notifyError(player, 'Игрок далеко', 'Ошибка');
    if (!vehicle || !state || !state.row || state.key !== 'private' || state.owner !== Number(character?.id)) {
      return notifyError(player, 'Это не ваш транспорт', 'Ошибка');
    }
    offers.set(target, { seller: player, vehicle, price, vehId: Number(state.row.id) });
    cef(target, `offerDialog.show('vehicles_sell', ${JSON.stringify({
      name: character?.name,
      model: state.props.name,
      price,
      plate: vehicle.numberPlateText,
    })});`);
  });
  mint.onClient('crp:veh:sell:accept', async (player, accept) => {
    const offer = offers.get(player);
    if (!offer) return;
    offers.delete(player);
    const seller = offer.seller;
    if (accept !== true && accept !== 1) return;
    const vehicle = seller.vehicle;
    const state = vehicle ? vehicleState(vehicle) : undefined;
    if (!seller.valid || !vehicle || !state?.row || Number(state.row.id) !== offer.vehId) {
      answer(player, 'target', 2);
      if (seller.valid) answer(seller, 'seller', 2);
      return;
    }
    if (!(await removeCash(player, offer.price))) {
      answer(player, 'target', 0);
      answer(seller, 'seller', 0);
      return;
    }
    if (!(await canOwnAnother(player))) {
      await addCash(player, offer.price);
      answer(player, 'target', 3);
      answer(seller, 'seller', 3);
      return;
    }
    const buyer = getSession(player).character;
    if (!buyer || !(await addCash(seller, offer.price))) {
      await addCash(player, offer.price);
      return;
    }
    state.row.owner = buyer.id;
    state.row.owners = (Number(state.row.owners) || 0) + 1;
    state.owner = Number(buyer.id);
    await state.row.save();
    const given = await giveItem(player, 33, { vehId: state.row.id, owner: buyer.id });
    if (!given) {
      state.row.owner = getSession(seller).character?.id;
      state.owner = Number(state.row.owner) || 0;
      await state.row.save();
      await removeCash(seller, offer.price);
      await addCash(player, offer.price);
      answer(player, 'target', 4, { text: 'Нет места для ключей' });
      return;
    }
    answer(player, 'target', 1);
    answer(seller, 'seller', 1);
  });
}
