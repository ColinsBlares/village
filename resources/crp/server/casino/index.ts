import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess, notifyWarning } from '../ui/notify.js';
import { addCash, removeCash } from '../world/money.js';
import { installCasinoTables } from './tables.js';

const AREA = { x: 1100.59, y: 219.76 };
const WHEEL = { x: 1111.05, y: 229.86, z: -49.84 };
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
const wheelAt = new Map<number, number>();

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

function roll(max: number): number {
  return Math.floor(Math.random() * max) + 1;
}

export function installCasino(): void {
  installCasinoTables();
  mint.onClient('crp:casino:dice', (player, raw) => {
    const data = JSON.parse(String(raw ?? '{}')) as { targetId?: number; amount?: number };
    const amount = Math.trunc(Number(data.amount));
    const target = mint.Player.getByID(Number(data.targetId));
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

  mint.onClient('crp:casino:slots', async (player, raw) => {
    const bet = Math.trunc(Number(raw));
    if (!inCasino(player)) return notifyError(player, 'Вы не в казино', 'Слоты');
    if (!BETS.includes(bet)) return notifyError(player, 'Некорректная ставка', 'Слоты');
    if (!(await removeCash(player, bet))) return notifyError(player, `Необходимо $${bet}`, 'Слоты');
    const win = Math.random() < 0.23;
    let symbol = SYMBOLS[0];
    if (win) {
      const total = SYMBOLS.reduce((sum, item) => sum + item.weight, 0);
      let roll = Math.random() * total;
      for (const item of SYMBOLS) {
        roll -= item.weight;
        if (roll <= 0) {
          symbol = item;
          break;
        }
      }
      await addCash(player, bet * symbol.mult);
      notifySuccess(player, `Выигрыш $${bet * symbol.mult}`, 'Слоты');
    } else notifyInfo(player, 'Нет совпадения', 'Слоты');
    const reels = win ? [symbol.i, symbol.i, symbol.i] : [roll(6) - 1, roll(6) - 1, roll(6) - 1];
    cef(player, `mp.event.call('casino.slots.result', ${JSON.stringify(reels)});`);
  });

  mint.onClient('crp:casino:horse', async (player, raw) => {
    const data = JSON.parse(String(raw ?? '{}')) as { horse?: number; amount?: number };
    const amount = Math.trunc(Number(data.amount));
    const horse = Math.trunc(Number(data.horse));
    if (!inCasino(player)) return notifyError(player, 'Вы не в казино', 'Скачки');
    if (horse < 1 || horse > 6) return notifyError(player, 'Выберите лошадь', 'Скачки');
    if (amount < 100 || amount > 10000) return notifyError(player, 'Ставка $100 - $10 000', 'Скачки');
    if (!(await removeCash(player, amount))) return notifyError(player, `Необходимо $${amount}`, 'Скачки');
    const winner = roll(6);
    cef(player, `mp.event.call('casino.horse.race.start', ${JSON.stringify([winner])});`);
    if (winner === horse) {
      await addCash(player, amount * 5);
      notifySuccess(player, `Лошадь ${winner} пришла первой. Выигрыш $${amount * 5}`, 'Скачки');
    } else notifyInfo(player, `Победила лошадь ${winner}`, 'Скачки');
  });

  mint.onClient('crp:casino:wheel', async (player) => {
    if (!inCasino(player)) return notifyError(player, 'Вы не в казино', 'Колесо');
    if (player.pos.distanceTo(new mint.Vector3(WHEEL.x, WHEEL.y, WHEEL.z)) > 4) return notifyError(player, 'Подойдите к колесу удачи', 'Колесо');
    const id = Number(getSession(player).character?.id) || 0;
    const free = Date.now() - (wheelAt.get(id) ?? 0) > 24 * 60 * 60 * 1000;
    if (!free && !(await removeCash(player, 500))) return notifyError(player, 'Повторная прокрутка $500', 'Колесо');
    wheelAt.set(id, Date.now());
    const prize = roll(20);
    const money = prize <= 10 ? prize * 100 : prize === 20 ? 5000 : 0;
    if (money) await addCash(player, money);
    notifySuccess(player, money ? `Приз $${money}` : 'Пустой сектор', 'Колесо');
    cef(player, `mp.event.call('casino.wheel.spin.start', ${JSON.stringify([prize * 18])});`);
  });
}
