import * as mint from 'mint-server';
import { allowMove } from '../anticheat/index.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { table } from '../core/db.js';
import { houseForCharacter } from '../houses/index.js';
import { giveItem } from '../inventory/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { notifyError, notifyInfo, notifySuccess, notifyWarning } from '../ui/notify.js';
import { canOwnAnother } from '../vehicles/sell.js';
import { vehicleTitle } from '../vehicles/index.js';
import { addCash, removeCash } from '../world/money.js';

const PRICE = 500;
const COOLDOWN = 24 * 60 * 60 * 1000;
const SPIN_MS = 12000;
const HERE = { x: 1110.2363, y: 227.8508, z: -50.755817 };

interface Prize {
  type: 'cash' | 'item' | 'vehicle' | 'empty';
  amount?: number;
  itemId?: number;
  params?: Record<string, unknown>;
  needGender?: boolean;
  modelName?: string;
  text: string;
  weight: number;
}

const PRIZES: Prize[] = [
  { type: 'cash', amount: 500, text: '$500', weight: 15 },
  { type: 'cash', amount: 1000, text: '$1 000', weight: 12 },
  { type: 'cash', amount: 2500, text: '$2 500', weight: 10 },
  { type: 'cash', amount: 5000, text: '$5 000', weight: 8 },
  { type: 'cash', amount: 10000, text: '$10 000', weight: 6 },
  { type: 'cash', amount: 20000, text: '$20 000', weight: 3 },
  { type: 'cash', amount: 50000, text: '$50 000', weight: 1 },
  { type: 'cash', amount: 250000, text: 'ДЖЕКПОТ $250 000', weight: 1 },
  { type: 'vehicle', modelName: 'turismor', text: 'Автомобиль Turismo R', weight: 1 },
  { type: 'item', itemId: 24, params: { health: 100 }, text: 'Малая аптечка', weight: 6 },
  { type: 'item', itemId: 25, text: 'Пластырь', weight: 6 },
  { type: 'item', itemId: 35, text: 'Батончик шоколада', weight: 6 },
  { type: 'item', itemId: 34, text: 'Бутылка воды', weight: 6 },
  { type: 'item', itemId: 16, text: 'Сигареты', weight: 5 },
  { type: 'item', itemId: 14, params: { variation: 1, texture: 0 }, needGender: true, text: 'Маска', weight: 4 },
  { type: 'empty', text: 'Пусто', weight: 11 },
];

interface Pending {
  prize: Prize;
  paid: boolean;
  timer: ReturnType<typeof setTimeout> | null;
}

const near = new WeakSet<mint.Player>();
const pending = new WeakMap<mint.Player, Pending>();
let spinning = false;

function prizeOf(): Prize {
  const total = PRIZES.reduce((sum, prize) => sum + prize.weight, 0);
  let cursor = Math.random() * total;
  for (const prize of PRIZES) {
    cursor -= prize.weight;
    if (cursor < 0) return prize;
  }
  return PRIZES[PRIZES.length - 1];
}

function fail(player: mint.Player, text: string, warning = false): void {
  if (warning) notifyWarning(player, text, 'Колесо');
  else notifyError(player, text, 'Колесо');
  mint.emitClient(player, 'crp:wheel:fail');
}

function clearPending(player: mint.Player): Pending | undefined {
  const spin = pending.get(player);
  if (spin?.timer) clearTimeout(spin.timer);
  pending.delete(player);
  spinning = false;
  return spin;
}

async function giveVehicle(player: mint.Player): Promise<boolean> {
  const character = getSession(player).character;
  if (!character || !(await canOwnAnother(player))) return false;
  const house = houseForCharacter(Number(character.id));
  const created = (await table('Vehicle').create({
    key: 'private',
    owner: character.id,
    modelName: 'turismor',
    color1: 111,
    color2: 111,
    x: house ? Number(house.info.pickupX) : 0,
    y: house ? Number(house.info.pickupY) : 0,
    z: house ? Number(house.info.pickupZ) : 0,
    h: 0,
    parkingDate: house ? null : new Date(),
    plate: `CAS${100 + Math.floor(Math.random() * 900)}`,
    owners: 1,
    regDate: new Date(),
    fuel: 50,
  })) as DbRow;
  const keys = await giveItem(player, 33, { owner: character.id, vehId: created.id, vehName: vehicleTitle('turismor') });
  if (!keys && typeof created.destroy === 'function') await created.destroy();
  return keys;
}

async function grant(player: mint.Player, prize: Prize): Promise<void> {
  const character = getSession(player).character;
  if (!character) return;
  if (prize.type === 'cash' && prize.amount) {
    if (!(await addCash(player, prize.amount))) return notifyError(player, 'Ошибка зачисления выигрыша', 'Колесо');
    notifySuccess(player, `Выигрыш: ${prize.text}`, 'Колесо');
    return;
  }
  if (prize.type === 'item' && prize.itemId) {
    const params = { ...(prize.params ?? {}) };
    if (prize.needGender) params.sex = character.gender ? 0 : 1;
    if (!(await giveItem(player, prize.itemId, params))) {
      await addCash(player, 1000);
      return notifyWarning(player, `Приз «${prize.text}» не помещается. Получите $1 000 компенсации`, 'Колесо');
    }
    notifySuccess(player, `Выигрыш: ${prize.text}`, 'Колесо');
    return;
  }
  if (prize.type === 'vehicle') {
    if (await giveVehicle(player)) return notifySuccess(player, `Выигрыш: ${prize.text}. Ключи в инвентаре`, 'Колесо');
    await addCash(player, 25000);
    notifyWarning(player, 'Нет места для авто. Компенсация $25 000', 'Колесо');
    return;
  }
  notifyInfo(player, 'Пустой сектор', 'Колесо');
}

export function installWheel(inCasino: (player: mint.Player) => boolean): void {
  const shape = new mint.ColshapeSphere(HERE.x, HERE.y, HERE.z, 2.5, 1, true);
  setColshapeHandlers(shape, {
    onEnter: (player) => {
      near.add(player);
      mint.emitClient(player, 'crp:wheel:zone', true);
    },
    onExit: (player) => {
      near.delete(player);
      mint.emitClient(player, 'crp:wheel:zone', false);
    },
  });

  mint.onClient('crp:casino:wheel', async (player) => {
    const character = getSession(player).character;
    if (!character) return fail(player, 'Вы не в казино');
    if (!inCasino(player) || !near.has(player)) return fail(player, 'Подойдите к колесу удачи');
    if (spinning || pending.has(player)) return fail(player, 'Колесо уже крутится', true);
    const last = character.lastWheelSpin ? new Date(character.lastWheelSpin).getTime() : 0;
    const free = !last || Date.now() - last >= COOLDOWN;
    if (!free && !(await removeCash(player, PRICE))) {
      const hours = Math.ceil((COOLDOWN - (Date.now() - last)) / (60 * 60 * 1000));
      return fail(player, `Бесплатная прокрутка через ${hours} ч., либо нужно $${PRICE} наличными`);
    }
    if (free) {
      character.lastWheelSpin = new Date();
      void character.save();
    }
    const prize = prizeOf();
    spinning = true;
    const timer = setTimeout(() => {
      if (!pending.has(player)) return;
      clearPending(player);
      if (!free) void addCash(player, PRICE);
      fail(player, 'Колесо не запустилось');
    }, 20000);
    pending.set(player, { prize, paid: !free, timer });
    allowMove(player, 20000);
    mint.emitClient(player, 'crp:wheel:start', JSON.stringify({ type: prize.type, text: prize.text }));
  });

  mint.onClient('crp:wheel:ready', (player) => {
    const spin = pending.get(player);
    if (!spin) return fail(player, 'Колесо уже крутится', true);
    if (spin.timer) clearTimeout(spin.timer);
    spin.timer = setTimeout(() => {
      if (!player.valid || pending.get(player) !== spin) return;
      mint.emitClient(player, 'crp:wheel:done', JSON.stringify({ type: spin.prize.type, text: spin.prize.text }));
    }, SPIN_MS);
  });

  mint.onClient('crp:wheel:finish', async (player) => {
    const spin = clearPending(player);
    if (!spin) return;
    await grant(player, spin.prize);
  });

  mint.on('playerDisconnect', (player) => {
    const spin = pending.get(player);
    if (spin?.timer) clearTimeout(spin.timer);
    pending.delete(player);
    if (spin) spinning = false;
  });
}
