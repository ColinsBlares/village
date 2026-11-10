import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { houseForCharacter } from '../houses/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { notifyError, notifySuccess, notifyInfo } from '../ui/notify.js';
import { removeBank, removeCash } from '../world/money.js';
import {
  hideVehicle,
  placeVehicle,
  vehicleSpawned,
  vehicleTitle,
  vehicleBySqlId,
} from './index.js';

export const OWN_RESPAWN_PRICE = 300;

interface OwnListRow {
  id: number;
  name: string;
  plate: string;
}

async function privateRows(characterId: number): Promise<DbRow[]> {
  return (await table('Vehicle').findAll({
    where: { key: 'private', owner: characterId },
  })) as DbRow[];
}

function rowOf(rows: DbRow[], id: number): DbRow | null {
  return rows.find((row) => Number(row.id) === id) ?? null;
}

async function closestParking(player: mint.Player): Promise<DbRow | null> {
  const rows = (await table('Parking').findAll()) as DbRow[];
  let best: DbRow | null = null;
  let min = Number.POSITIVE_INFINITY;
  for (const row of rows) {
    const gap = Math.hypot(Number(row.x) - player.pos.x, Number(row.y) - player.pos.y);
    if (gap < min) {
      min = gap;
      best = row;
    }
  }
  return best;
}

async function pay(player: mint.Player, price: number, method: number): Promise<boolean> {
  if (method === 1) return removeBank(player, price);
  return removeCash(player, price);
}

async function deliverToHouse(row: DbRow, houseId: number): Promise<void> {
  const house = (await table('House').findOne({ where: { id: houseId } })) as DbRow | null;
  if (!house) return;
  row.x = house.carX;
  row.y = house.carY;
  row.z = house.carZ;
  row.h = house.carAngle;
  row.dimension = houseId;
  row.parkingId = null;
  row.parkingDate = null;
  await row.save();
}

async function deliverToParking(row: DbRow, parking: DbRow): Promise<void> {
  row.x = parking.carX;
  row.y = parking.carY;
  row.z = parking.carZ;
  row.h = parking.carH;
  row.dimension = 0;
  row.parkingId = parking.id;
  row.parkingDate = new Date();
  await row.save();
}

export function installOwnVehicles(): void {
  mint.onClient('crp:veh:own:list', async (player) => {
    const character = getSession(player).character;
    if (!character) return;
    const rows = await privateRows(character.id);
    if (!rows.length) return notifyError(player, 'У вас нет транспорта', 'Транспорт');
    const list: OwnListRow[] = rows.map((row) => ({
      id: Number(row.id),
      name: vehicleTitle(String(row.modelName ?? '')),
      plate: String(row.plate ?? ''),
    }));
    mint.emitClient(player, 'crp:veh:own:list', JSON.stringify({ list, price: OWN_RESPAWN_PRICE }));
  });

  mint.onClient('crp:veh:own:deliver', async (player, vehicleId, method) => {
    const character = getSession(player).character;
    if (!character) return;
    const rows = await privateRows(character.id);
    const row = rowOf(rows, Number(vehicleId));
    if (!row) return notifyError(player, 'Транспорт не найден', 'Доставка');
    const price = OWN_RESPAWN_PRICE;
    if (!(await pay(player, price, Number(method) === 1 ? 1 : 0))) {
      return notifyError(player, 'Недостаточно денег', 'Доставка');
    }
    hideVehicle(Number(row.id));
    const house = houseForCharacter(character.id);
    if (house) {
      await deliverToHouse(row, Number(house.info.id));
      placeVehicle(row);
    } else {
      const parking = await closestParking(player);
      if (!parking) return notifyError(player, 'Парковка не найдена', 'Доставка');
      await deliverToParking(row, parking);
    }
    const where = house ? 'к дому' : 'на парковку';
    notifySuccess(player, `Транспорт доставлен ${where}`, 'Доставка');
    if (!house) {
      mint.emitClient(player, 'crp:chat', '!{#ffcb5c}Транспорт доставлен на парковку, отмеченную на карте !{#e485e6}розовым');
    }
  });

  mint.onClient('crp:veh:own:find', async (player, vehicleId) => {
    const character = getSession(player).character;
    if (!character) return;
    const rows = await privateRows(character.id);
    const row = rowOf(rows, Number(vehicleId));
    if (!row || Number(row.owner) !== character.id) return notifyError(player, 'Транспорт не найден', 'GPS');
    const house = houseForCharacter(character.id);
    const vehicle = vehicleBySqlId(Number(row.id));
    if (!vehicle?.valid) {
      return house
        ? notifyError(player, 'Транспорт не найден', 'GPS')
        : notifyInfo(player, 'Не удалось отследить ваше т/с, ищите его на парковке', 'GPS');
    }
    if (vehicle.dimension !== 0) {
      return notifyInfo(player, 'Не удалось отследить ваше т/с, попробуйте выполнить доставку', 'GPS');
    }
    mint.emitClient(player, 'crp:veh:own:gps', vehicle.pos.x, vehicle.pos.y, vehicle.pos.z);
    notifySuccess(player, 'Транспорт отмечен на карте', 'GPS');
  });
}
