import * as mint from 'mint-server';
import { allowMove } from '../anticheat/index.js';
import { table } from '../core/db.js';
import { getSession, type DbRow } from '../player/session.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess, notifyWarning } from '../ui/notify.js';
import { addCash, removeCash } from '../world/money.js';
import { installCasinoTables } from './tables.js';
import { installWheel } from './wheel.js';

const AREA = { x: 1100.59, y: 219.76 };
const PACKS = [10, 50, 100, 500, 1000, 5000, 10000];
const BETS = [50, 100, 250, 500, 1000];
const SYMBOLS = [
  { i: 0, weight: 40, mult: 2 },
  { i: 1, weight: 25, mult: 3 },
  { i: 2, weight: 18, mult: 4 },
  { i: 3, weight: 10, mult: 6 },
  { i: 4, weight: 5, mult: 10 },
  { i: 5, weight: 2, mult: 25 },
];

interface Dice {
  from: number;
  amount: number;
}

const dice = new WeakMap<mint.Player, Dice>();
const offered = new WeakSet<mint.Player>();

function inCasino(player: mint.Player): boolean {
  if (player.dimension !== 1) return false;
  const dx = player.pos.x - AREA.x;
  const dy = player.pos.y - AREA.y;
  return dx * dx + dy * dy < 120 * 120;
}

function nameOf(player: mint.Player): string {
  return String(getSession(player).character?.name ?? player.name);
}

async function chipsOf(player: mint.Player): Promise<DbRow> {
  const id = Number(getSession(player).character?.id);
  let row = (await table('CasinoChips').findOne({ where: { characterId: id } })) as DbRow | null;
  if (!row) row = (await table('CasinoChips').create({ characterId: id, chips: 0 })) as DbRow;
  return row;
}

function syncChips(player: mint.Player, value: number): void {
  cef(player, `mp.event.call('casino.chips.sync', ${value});`);
}

const ITB = { x: 1098.14, y: 258.14, z: -51.24 };
const HORSES = [
  { num: 1, name: 'Blue Dream', weight: 35, odds: 2 },
  { num: 2, name: 'Iron Heart', weight: 25, odds: 3 },
  { num: 3, name: 'Golden Boy', weight: 18, odds: 5 },
  { num: 4, name: 'Night Runner', weight: 12, odds: 8 },
  { num: 5, name: 'Lucky Strike', weight: 7, odds: 14 },
  { num: 6, name: 'Last Hope', weight: 3, odds: 30 },
];

interface Race {
  horse: number;
  amount: number;
  order: number[];
  odds: number;
  readyAt: number;
}

const atTrack = new WeakSet<mint.Player>();
const races = new WeakMap<mint.Player, Race>();

function horseOf(num: number): (typeof HORSES)[number] | undefined {
  return HORSES.find((horse) => horse.num === num);
}

const slotBusy = new WeakMap<mint.Player, { at: number; timer: ReturnType<typeof setTimeout> }>();

function roll(max: number): number {
  return Math.floor(Math.random() * max) + 1;
}

function clearSlot(player: mint.Player): void {
  const busy = slotBusy.get(player);
  if (busy) clearTimeout(busy.timer);
  slotBusy.delete(player);
}

function spinReels(bet: number): { win: boolean; reels: number[]; payout: number; multiplier: number } {
  if (Math.random() < 0.23) {
    const total = SYMBOLS.reduce((sum, item) => sum + item.weight, 0);
    let cursor = Math.random() * total;
    let symbol = SYMBOLS[0];
    for (const item of SYMBOLS) {
      cursor -= item.weight;
      if (cursor < 0) {
        symbol = item;
        break;
      }
    }
    return { win: true, reels: [symbol.i, symbol.i, symbol.i], payout: Math.floor(bet * symbol.mult), multiplier: symbol.mult };
  }
  let reels: number[];
  do {
    reels = [roll(6) - 1, roll(6) - 1, roll(6) - 1];
  } while (reels[0] === reels[1] && reels[1] === reels[2]);
  return { win: false, reels, payout: 0, multiplier: 0 };
}

function finishOrder(): number[] {
  const pool = HORSES.map((horse) => ({ num: horse.num, weight: horse.weight }));
  const order: number[] = [];
  while (pool.length) {
    const total = pool.reduce((sum, horse) => sum + horse.weight, 0);
    let cursor = Math.random() * total;
    let index = 0;
    for (let i = 0; i < pool.length; i += 1) {
      cursor -= pool[i].weight;
      if (cursor < 0) {
        index = i;
        break;
      }
    }
    order.push(pool[index].num);
    pool.splice(index, 1);
  }
  return order;
}

export function offerDice(player: mint.Player, targetId: number, amount: number): void {
    const target = mint.Player.getByID(targetId);
    if (!Number.isInteger(amount) || amount <= 0) return notifyError(player, 'Некорректная сумма');
    if (!target?.valid || target.id === player.id) return notifyError(player, 'Игрок не найден');
    if (!inCasino(player) || !inCasino(target)) return notifyError(player, 'Играть в кости можно в казино');
    if (player.pos.distanceTo(target.pos) > 5) return notifyError(player, 'Игрок далеко');
    if (amount < 100) return notifyWarning(player, 'Минимальная сумма: $100');
    if (amount > 1000000) return notifyWarning(player, 'Максимальная сумма: $1000000');
    const mine = Number(getSession(player).character?.cash) || 0;
    const theirs = Number(getSession(target).character?.cash) || 0;
    if (mine < amount) return notifyError(player, 'У вас недостаточно денег');
    if (theirs < amount) return notifyError(player, 'У игрока недостаточно денег');
    if (offered.has(player) || dice.has(target)) return notifyError(player, 'Предложение уже отправлено');
    offered.add(player);
    dice.set(target, { from: player.id, amount });
    setTimeout(() => offered.delete(player), 10000);
    notifyInfo(player, 'Вы предложили игру в кости');
    cef(target, `offerDialog.show('dice', ${JSON.stringify({ id: player.id, amount })});`);
}

export function installCasino(): void {
  installCasinoTables();
  const track = new mint.ColshapeSphere(ITB.x, ITB.y, ITB.z, 2, 1, true);
  setColshapeHandlers(track, {
    onEnter: (player) => {
      atTrack.add(player);
      mint.emitClient(player, 'crp:horse:zone', true);
    },
    onExit: (player) => {
      atTrack.delete(player);
      mint.emitClient(player, 'crp:horse:zone', false);
    },
  });
  mint.onClient('crp:horse:open', (player) => {
    if (!getSession(player).character) return;
    if (!inCasino(player)) return notifyError(player, 'Вы не в казино', 'Скачки');
    if (!atTrack.has(player)) return notifyError(player, 'Подойдите к автомату ставок', 'Скачки');
    if (races.has(player)) return notifyWarning(player, 'Забег уже идёт', 'Скачки');
    mint.emitClient(player, 'crp:horse:menu', JSON.stringify(HORSES));
  });
  installWheel(inCasino);
  mint.onClient('crp:casino:dice', (player, raw) => {
    const data = JSON.parse(String(raw ?? '{}')) as { targetId?: number; amount?: number };
    offerDice(player, Number(data.targetId), Math.trunc(Number(data.amount)));
  });

  mint.onClient('crp:casino:dice:accept', async (player, accept) => {
    const offer = dice.get(player);
    dice.delete(player);
    if (!offer) return;
    const from = mint.Player.getByID(offer.from);
    offered.delete(from ?? player);
    if (Number(accept) !== 1) {
      notifyInfo(player, 'Вы отклонили кости');
      if (from?.valid) notifyInfo(from, `${nameOf(player)} отклонил кости`);
      return;
    }
    if (!from?.valid || player.pos.distanceTo(from.pos) > 5) return notifyError(player, 'Игрок далеко');
    const left = roll(6);
    const right = roll(6);
    notifyInfo(from, `Вы: ${left}, ${nameOf(player)}: ${right}`, 'Кости');
    notifyInfo(player, `Вы: ${right}, ${nameOf(from)}: ${left}`, 'Кости');
    if (left === right) return notifyInfo(player, 'Ничья', 'Кости');
    const winner = left > right ? from : player;
    const loser = winner === from ? player : from;
    if (!(await removeCash(loser, offer.amount))) return notifyError(loser, 'Недостаточно денег', 'Кости');
    await addCash(winner, offer.amount);
    notifySuccess(winner, `Выигрыш $${offer.amount}`, 'Кости');
    notifyError(loser, `Проигрыш $${offer.amount}`, 'Кости');
  });

  mint.onClient('crp:casino:chips:buy', async (player, raw) => {
    const amount = Math.trunc(Number(raw));
    if (!inCasino(player)) return notifyError(player, 'Вы не в казино', 'Казино');
    if (!PACKS.includes(amount)) return notifyError(player, 'Такого пакета нет', 'Казино');
    if (!(await removeCash(player, amount))) return notifyError(player, `Необходимо $${amount}`, 'Казино');
    const row = await chipsOf(player);
    row.chips = (Number(row.chips) || 0) + amount;
    await row.save();
    syncChips(player, Number(row.chips));
    notifySuccess(player, `Куплено фишек: ${amount}`, 'Казино');
  });

  mint.onClient('crp:casino:chips:sell', async (player, raw) => {
    const amount = Math.trunc(Number(raw));
    if (!inCasino(player)) return notifyError(player, 'Вы не в казино', 'Казино');
    if (!PACKS.includes(amount)) return notifyError(player, 'Такого пакета нет', 'Казино');
    const row = await chipsOf(player);
    if ((Number(row.chips) || 0) < amount) return notifyError(player, 'Недостаточно фишек', 'Казино');
    row.chips = Number(row.chips) - amount;
    await row.save();
    await addCash(player, amount);
    syncChips(player, Number(row.chips));
    notifySuccess(player, `Продано фишек: ${amount}`, 'Казино');
  });

  mint.on('playerDisconnect', (player) => clearSlot(player));
  mint.onClient('crp:slots:sit', (player) => allowMove(player, 8000));
  mint.onClient('crp:slots:done', (player) => {
    const busy = slotBusy.get(player);
    if (!busy || Date.now() - busy.at < 2500) return;
    clearSlot(player);
  });
  mint.onClient('crp:casino:slots', async (player, raw) => {
    const bet = Math.trunc(Number(raw));
    if (!inCasino(player)) {
      notifyError(player, 'Вы не в казино', 'Слоты');
      mint.emitClient(player, 'crp:slots:fail');
      return;
    }
    if (slotBusy.has(player)) {
      notifyWarning(player, 'Барабаны ещё крутятся', 'Слоты');
      mint.emitClient(player, 'crp:slots:fail');
      return;
    }
    if (!BETS.includes(bet)) {
      notifyError(player, 'Некорректная ставка', 'Слоты');
      mint.emitClient(player, 'crp:slots:fail');
      return;
    }
    if (!(await removeCash(player, bet))) {
      notifyError(player, 'Недостаточно наличных', 'Слоты');
      mint.emitClient(player, 'crp:slots:fail');
      return;
    }
    const result = spinReels(bet);
    const timer = setTimeout(() => clearSlot(player), 8000);
    slotBusy.set(player, { at: Date.now(), timer });
    if (result.win) {
      if (!(await addCash(player, result.payout))) notifyError(player, 'Ошибка зачисления выигрыша', 'Слоты');
      else notifySuccess(player, `Выигрыш x${result.multiplier}: $${result.payout}`, 'Слоты');
    }
    mint.emitClient(player, 'crp:slots:result', JSON.stringify({ ...result, bet }));
  });

  mint.onClient('crp:casino:horse', async (player, raw) => {
    const data = JSON.parse(String(raw ?? '{}')) as { horse?: number; amount?: number };
    const amount = Math.trunc(Number(data.amount));
    const horse = horseOf(Math.trunc(Number(data.horse)));
    if (!inCasino(player) || !atTrack.has(player)) return notifyError(player, 'Подойдите к автомату ставок', 'Скачки');
    if (races.has(player)) return notifyWarning(player, 'Забег уже идёт', 'Скачки');
    if (!horse) return notifyError(player, 'Лошадь не выбрана', 'Скачки');
    if (amount < 100 || amount > 10000) return notifyError(player, 'Ставка $100 - $10 000', 'Скачки');
    if (!(await removeCash(player, amount))) return notifyError(player, 'Недостаточно наличных', 'Скачки');
    const order = finishOrder();
    races.set(player, { horse: horse.num, amount, order, odds: horse.odds, readyAt: Date.now() + 13000 });
    mint.emitClient(player, 'crp:horse:race', JSON.stringify({
      horses: HORSES.map((item) => ({ num: item.num, name: item.name, odds: item.odds })),
      order,
      seed: Math.floor(Math.random() * 1000000),
      durationSec: 26,
    }));
  });
  mint.onClient('crp:horse:done', async (player) => {
    const race = races.get(player);
    if (!race || Date.now() < race.readyAt) return;
    races.delete(player);
    const winner = horseOf(race.order[0]);
    if (race.order[0] === race.horse) {
      const payout = Math.floor(race.amount * race.odds);
      if (!(await addCash(player, payout))) return notifyError(player, 'Ошибка зачисления выигрыша', 'Скачки');
      notifySuccess(player, `Победила «${winner?.name ?? race.order[0]}». Выигрыш: $${payout}`, 'Скачки');
      return;
    }
    notifyWarning(player, `Победила «${winner?.name ?? race.order[0]}». Ваша ставка не сыграла`, 'Скачки');
  });
}
