import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess } from '../ui/notify.js';

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const TABLES = [
  { game: 'blackjack' as const, title: 'Блэкджек', x: 1148.84, y: 269.75, z: -52.84, bets: [10, 50, 100, 500, 1000] },
  { game: 'blackjack' as const, title: 'Блэкджек, высокий стол', x: 1129.41, y: 262.36, z: -52.04, bets: [1000, 5000, 10000] },
  { game: 'roulette' as const, title: 'Рулетка', x: 1144.81, y: 268.26, z: -52.84, bets: [10, 50, 100, 500, 1000] },
  { game: 'roulette' as const, title: 'Рулетка, высокий стол', x: 1133.96, y: 262.11, z: -52.04, bets: [1000, 5000, 10000] },
];

interface Card { r: string }
interface Seat {
  game: 'blackjack' | 'roulette';
  title: string;
  bets: number[];
  stake: number;
  player: Card[];
  dealer: Card[];
  spots: { spot: string; amount: number }[];
  timer: ReturnType<typeof setTimeout> | null;
  history: string[];
  result: string;
}

const seats = new WeakMap<mint.Player, Seat>();

function inCasino(player: mint.Player): boolean {
  return player.dimension === 1;
}

function nearest(player: mint.Player): (typeof TABLES)[number] | null {
  let best: (typeof TABLES)[number] | null = null;
  let dist = 4;
  for (const table of TABLES) {
    const gap = player.pos.distanceTo(new mint.Vector3(table.x, table.y, table.z));
    if (gap < dist) {
      dist = gap;
      best = table;
    }
  }
  return best;
}

async function chips(player: mint.Player): Promise<DbRow> {
  const id = Number(getSession(player).character?.id);
  let row = (await table('CasinoChips').findOne({ where: { characterId: id } })) as DbRow | null;
  if (!row) row = (await table('CasinoChips').create({ characterId: id, chips: 0 })) as DbRow;
  return row;
}

async function takeChips(player: mint.Player, amount: number): Promise<boolean> {
  const row = await chips(player);
  if ((Number(row.chips) || 0) < amount) return false;
  row.chips = Number(row.chips) - amount;
  await row.save();
  return true;
}

async function giveChips(player: mint.Player, amount: number): Promise<void> {
  const row = await chips(player);
  row.chips = (Number(row.chips) || 0) + amount;
  await row.save();
}

function draw(): Card {
  return { r: RANKS[Math.floor(Math.random() * RANKS.length)] };
}

function value(cards: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.r === 'A') {
      aces += 1;
      total += 11;
    } else if (card.r === 'J' || card.r === 'Q' || card.r === 'K') total += 10;
    else total += Number(card.r);
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

function showHand(title: string, cards: Card[]): string {
  return `${title}: ${cards.map((card) => card.r).join(' ')} (${value(cards)})`;
}

function paint(player: mint.Player, seat: Seat, chips: number, phase: string, message: string, yourTurn: boolean): void {
  const dealer = phase === 'play' ? seat.dealer.slice(0, 1) : seat.dealer;
  const payload = {
    game: seat.game,
    title: seat.title,
    phase,
    seconds: seat.timer ? 15 : 0,
    chips,
    chip: seat.stake || seat.spots.at(-1)?.amount || seat.bets[0] || 0,
    target: seat.spots.at(-1)?.spot ?? '',
    bets: seat.spots.map((bet) => ({ label: bet.spot, amount: bet.amount })),
    result: seat.result,
    history: seat.history,
    dealer: dealer.map((card) => card.r),
    dealerScore: dealer.length ? value(dealer) : null,
    you: seat.player.map((card) => card.r),
    score: seat.player.length ? value(seat.player) : null,
    bet: seat.stake,
    message,
    yourTurn,
    canDouble: yourTurn && seat.player.length === 2,
  };
  cef(player, `mp.event.call('casino.chips.sync', ${chips}); casinoTable.render(${JSON.stringify(payload)});`);
}

async function finishBlackjack(player: mint.Player, seat: Seat): Promise<void> {
  while (value(seat.dealer) < 17) seat.dealer.push(draw());
  const mine = value(seat.player);
  const theirs = value(seat.dealer);
  const natural = seat.player.length === 2 && mine === 21;
  const line = `${showHand('Вы', seat.player)}. ${showHand('Дилер', seat.dealer)}`;
  notifyInfo(player, line, 'Блэкджек');
  let message = 'Проигрыш';
  if (mine > 21 || (theirs <= 21 && theirs > mine)) notifyError(player, 'Проигрыш', 'Блэкджек');
  else if (mine === theirs) {
    await giveChips(player, seat.stake);
    message = 'Ничья, ставка возвращена';
    notifyInfo(player, message, 'Блэкджек');
  } else {
    const pay = natural ? Math.trunc(seat.stake * 2.5) : seat.stake * 2;
    await giveChips(player, pay);
    message = `Выигрыш ${pay} фишек`;
    notifySuccess(player, message, 'Блэкджек');
  }
  seat.result = message;
  seat.history = [message, ...seat.history].slice(0, 8);
  paint(player, seat, Number((await chips(player)).chips) || 0, 'result', message, false);
  seat.player = [];
  seat.dealer = [];
  seat.stake = 0;
}

function rouletteWin(spot: string, result: number): number {
  if (/^\d+$/.test(spot)) return Number(spot) === result ? 35 : 0;
  if (result === 0) return 0;
  const red = RED.has(result);
  if (spot === 'red') return red ? 1 : 0;
  if (spot === 'black') return red ? 0 : 1;
  if (spot === 'even') return result % 2 === 0 ? 1 : 0;
  if (spot === 'odd') return result % 2 === 1 ? 1 : 0;
  if (spot === 'low') return result <= 18 ? 1 : 0;
  if (spot === 'high') return result >= 19 ? 1 : 0;
  if (spot === 'd1') return result <= 12 ? 2 : 0;
  if (spot === 'd2') return result >= 13 && result <= 24 ? 2 : 0;
  if (spot === 'd3') return result >= 25 ? 2 : 0;
  return 0;
}

async function spin(player: mint.Player, seat: Seat): Promise<void> {
  seat.timer = null;
  const result = Math.floor(Math.random() * 37);
  let payout = 0;
  for (const bet of seat.spots) payout += bet.amount * (rouletteWin(bet.spot, result) + (rouletteWin(bet.spot, result) > 0 ? 1 : 0));
  seat.spots = [];
  if (payout) await giveChips(player, payout);
  const color = result === 0 ? 'зеро' : RED.has(result) ? 'красное' : 'чёрное';
  const message = payout ? `Выпало ${result} (${color}), выплата ${payout}` : `Выпало ${result} (${color})`;
  seat.result = String(result);
  seat.history = [message, ...seat.history].slice(0, 8);
  notifyInfo(player, `Выпало ${result} (${color})`, 'Рулетка');
  if (payout) notifySuccess(player, `Выплата ${payout} фишек`, 'Рулетка');
  paint(player, seat, Number((await chips(player)).chips) || 0, 'result', message, false);
}

export function installCasinoTables(): void {
  mint.onClient('crp:table:join', async (player) => {
    if (!inCasino(player)) return notifyError(player, 'Вы не в казино', 'Казино');
    const table = nearest(player);
    if (!table) return notifyError(player, 'Подойдите к столу', 'Казино');
    const seat: Seat = { game: table.game, title: table.title, bets: table.bets, stake: 0, player: [], dealer: [], spots: [], timer: null, history: [], result: '' };
    seats.set(player, seat);
    notifySuccess(player, table.title, 'Казино');
    paint(player, seat, Number((await chips(player)).chips) || 0, 'bet', table.title, false);
  });
  mint.onClient('crp:table:leave', async (player) => {
    const seat = seats.get(player);
    if (!seat) return;
    if (seat.timer) clearTimeout(seat.timer);
    const back = seat.stake + seat.spots.reduce((sum, bet) => sum + bet.amount, 0);
    if (back) await giveChips(player, back);
    seats.delete(player);
    cef(player, 'casinoTable.hide();');
  });
  mint.onClient('crp:table:bet', async (player, spot, amountRaw) => {
    const seat = seats.get(player);
    const amount = Math.trunc(Number(amountRaw));
    if (!seat || !seat.bets.includes(amount)) return notifyError(player, 'Некорректная ставка', 'Казино');
    if (!(await takeChips(player, amount))) return notifyError(player, 'Недостаточно фишек', 'Казино');
    if (seat.game === 'blackjack') {
      if (seat.player.length) return giveChips(player, amount);
      seat.stake += amount;
      if (seat.player.length === 0 && seat.stake === amount) {
        seat.player = [draw(), draw()];
        seat.dealer = [draw(), draw()];
        const message = `${showHand('Вы', seat.player)}. Дилер: ${seat.dealer[0].r}`;
        notifyInfo(player, message, 'Блэкджек');
        paint(player, seat, Number((await chips(player)).chips) || 0, 'play', message, value(seat.player) !== 21);
        if (value(seat.player) === 21) await finishBlackjack(player, seat);
      }
      return;
    }
    seat.spots.push({ spot: String(spot ?? 'red'), amount });
    if (!seat.timer) {
      seat.timer = setTimeout(() => {
        if (seats.get(player) === seat) void spin(player, seat);
      }, 15000);
    }
    notifyInfo(player, `Ставка ${amount} на ${spot}`, 'Рулетка');
    paint(player, seat, Number((await chips(player)).chips) || 0, 'bet', `Ставка ${amount} на ${spot}`, false);
  });
  mint.onClient('crp:table:hit', async (player) => {
    const seat = seats.get(player);
    if (!seat || seat.game !== 'blackjack' || !seat.player.length) return;
    seat.player.push(draw());
    if (value(seat.player) >= 21) await finishBlackjack(player, seat);
    else {
      const message = showHand('Вы', seat.player);
      notifyInfo(player, message, 'Блэкджек');
      paint(player, seat, Number((await chips(player)).chips) || 0, 'play', message, true);
    }
  });
  mint.onClient('crp:table:stand', async (player) => {
    const seat = seats.get(player);
    if (!seat || seat.game !== 'blackjack' || !seat.player.length) return;
    await finishBlackjack(player, seat);
  });
  mint.onClient('crp:table:double', async (player) => {
    const seat = seats.get(player);
    if (!seat || seat.player.length !== 2) return notifyError(player, 'Удвоение только на двух картах', 'Блэкджек');
    if (!(await takeChips(player, seat.stake))) return notifyError(player, 'Недостаточно фишек', 'Блэкджек');
    seat.stake *= 2;
    seat.player.push(draw());
    await finishBlackjack(player, seat);
  });
}
