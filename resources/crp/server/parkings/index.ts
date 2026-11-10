import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { houseForCharacter } from '../houses/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifySuccess } from '../ui/notify.js';
import { removeCash } from '../world/money.js';
import { hideVehicle, placeVehicle, vehicleSpawned } from '../vehicles/index.js';

const HOUR = 7;
const spots = new Map<number, DbRow>();

export async function loadParkings(): Promise<number> {
  const rows = (await table('Parking').findAll()) as DbRow[];
  for (const row of rows) {
    const id = Number(row.id);
    spots.set(id, row);
    new mint.PointBlip(267, Number(row.x), Number(row.y), Number(row.z), 8, 0.8, true, 0, String(row.name ?? 'Парковка'));
    const shape = new mint.ColshapeSphere(Number(row.x), Number(row.y), Number(row.z), 2, 0, true);
    shape.setMeta('parking', id);
  }
  mint.log(`crp: парковок ${rows.length}`);
  return rows.length;
}

function closest(player: mint.Player): number {
  let id = 0;
  let best = Number.POSITIVE_INFINITY;
  for (const [parkingId, row] of spots) {
    const next = Math.hypot(Number(row.x) - player.pos.x, Number(row.y) - player.pos.y);
    if (next < best) {
      best = next;
      id = parkingId;
    }
  }
  return id;
}

export function installParkings(): void {
  mint.on('entityEnterColshape', (shape, entity) => {
    const id = shape.getMeta('parking');
    if (typeof id !== 'number' || !(entity instanceof mint.Player) || entity.vehicle) return;
    if (!getSession(entity).character) return;
    entity.setMeta('crp:parking', id);
    cef(entity, `selectMenu.menu = selectMenu.menus["parkingMenu"]; selectMenu.show = true;`);
  });
  mint.on('entityLeaveColshape', (shape, entity) => {
    if (!shape.hasMeta('parking') || !(entity instanceof mint.Player)) return;
    entity.deleteMeta('crp:parking');
    cef(entity, 'selectMenu.show = false;');
  });
  mint.onClient('crp:parking:get', async (player) => {
    const parkingId = Number(player.getMeta('crp:parking'));
    const character = getSession(player).character;
    const spot = spots.get(parkingId);
    if (!character || !spot) return notifyError(player, 'На парковке нет вашего т/c', 'Ошибка');
    const rows = (await table('Vehicle').findAll({
      where: { key: 'private', owner: character.id, parkingId },
    })) as DbRow[];
    const row = rows.find((item) => item.parkingDate);
    if (!row) return notifyError(player, 'На парковке нет вашего т/c', 'Ошибка');
    if (vehicleSpawned(Number(row.id))) return notifyError(player, 'Сработала анти-дюп система', 'Ошибка');
    const hours = Math.trunc((Date.now() - new Date(row.parkingDate).getTime()) / 3600000);
    const price = Math.max(0, hours) * HOUR;
    if (price > 0 && !(await removeCash(player, price))) return notifyError(player, `Требуется $${price}`, 'Ошибка');
    row.x = spot.carX;
    row.y = spot.carY;
    row.z = spot.carZ;
    row.h = spot.carH;
    row.parkingDate = null;
    await row.save();
    placeVehicle(row);
    notifySuccess(player, 'Вы забрали т/с с парковки', 'Успешно');
    mint.emitClient(player, 'crp:chat', `!{#80c102} Вы забрали транспорт с парковки за !{#009eec}$${price}`);
  });
  mint.on('playerDisconnect', async (player) => {
    const character = getSession(player).character;
    if (!character || houseForCharacter(Number(character.id))) return;
    const parkingId = closest(player);
    const rows = (await table('Vehicle').findAll({ where: { key: 'private', owner: character.id, parkingDate: null } })) as DbRow[];
    const now = new Date();
    for (const row of rows) {
      row.parkingId = parkingId;
      row.parkingDate = now;
      await row.save();
      hideVehicle(Number(row.id));
    }
  });
}
