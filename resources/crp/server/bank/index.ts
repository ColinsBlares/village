import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { bizBankView, bizDailyRent } from '../bizes/index.js';
import { houseById, houseForCharacter } from '../houses/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifySuccess } from '../ui/notify.js';
import { addBank, addCash, removeBank, removeCash } from '../world/money.js';

const CARDS: Record<string, { openFee: number; transferThreshold: number; transferFeeBps: number; maxBalance: number }> = {
  classic: { openFee: 0, transferThreshold: 100000, transferFeeBps: 500, maxBalance: 250000 },
  personal: { openFee: 2000, transferThreshold: 250000, transferFeeBps: 300, maxBalance: 1000000 },
  premium: { openFee: 10000, transferThreshold: 1500000, transferFeeBps: 200, maxBalance: 30000000 },
};

const DEPOSITS: Record<string, { min: number; max: number; topup: boolean; withdraw: boolean }> = {
  growing: { min: 40000, max: 4000000, topup: true, withdraw: true },
  flexible: { min: 600000, max: 7500000, topup: true, withdraw: false },
  vip: { min: 1200000, max: 15000000, topup: false, withdraw: false },
};

interface Card extends DbRow {
  id: number;
  characterId: number;
  type: string;
  number: string;
  balance: number;
  active: boolean;
  blocked: boolean;
  monthKey: string;
  transferMonth: number;
  cashbackMonth: number;
}

const here = new WeakSet<mint.Player>();
const cashLock = new Set<number>();

function call(player: mint.Player, event: string, payload: unknown): void {
  cef(player, `mp.event.call(${JSON.stringify(event)}, ${JSON.stringify([payload])});`);
}

function monthKey(date = new Date()): string {
  const month = date.getMonth() + 1;
  return `${date.getFullYear()}-${month < 10 ? '0' : ''}${month}`;
}

function dateDays(value: unknown): number {
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return 0;
  const now = new Date();
  const left = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const right = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.ceil(Math.abs(right - left) / 86400000);
}

function rentOf(info: DbRow, interior: DbRow): number {
  return Math.trunc(Number(info.price) * (Number(interior.rent) || 0));
}

async function cardsOf(characterId: number): Promise<Card[]> {
  return (await table('BankCard').findAll({ where: { characterId } })) as Card[];
}

async function show(player: mint.Player): Promise<void> {
  const payload = await info(player);
  if (!payload) return;
  call(player, 'bank.show', payload);
  player.emit('crp:bank:open');
}

async function info(player: mint.Player): Promise<Record<string, unknown> | null> {
  const character = getSession(player).character;
  if (!character) return null;
  const cards = await cardsOf(Number(character.id));
  const active = cards.find((card) => card.active);
  const deposit = (await table('BankDeposit').findOne({ where: { characterId: character.id } })) as DbRow | null;
  const house = houseForCharacter(Number(character.id));
  const phone = (await table('Phone').findOne({ where: { characterId: character.id } })) as (DbRow & { money: number }) | null;
  const biz = (await table('Biz').findOne({ where: { characterId: character.id } })) as DbRow | null;
  return {
    name: character.name,
    cash: character.cash,
    money: active ? active.balance : character.bank,
    phoneMoney: phone ? phone.money : null,
    number: String(character.id),
    biz: biz ? [bizBankView(biz)] : [],
    houses: house
      ? [{
          name: house.info.id,
          class: house.interior.class,
          rent: rentOf(house.info, house.interior),
          days: dateDays(house.info.date),
        }]
      : [],
    cards: cards.map((card) => ({
      id: card.id,
      type: card.type,
      number: card.number,
      balance: card.balance,
      active: card.active,
      blocked: card.blocked,
    })),
    deposit: deposit
      ? { tariff: deposit.tariff, balance: deposit.balance, openedAt: deposit.openedAt }
      : null,
    activeCardId: active?.id ?? null,
    isLoading: false,
  };
}

async function refresh(player: mint.Player): Promise<void> {
  const payload = await info(player);
  if (payload) call(player, 'bank.update', payload);
}

function feeOf(type: string, transferMonth: number, amount: number): number {
  const spec = CARDS[type];
  if (!spec) return 0;
  const free = Math.max(0, spec.transferThreshold - (transferMonth || 0));
  return Math.floor((Math.max(0, amount - free) * spec.transferFeeBps) / 10000);
}

export async function loadBanks(): Promise<number> {
  const rows = (await table('Bank').findAll()) as DbRow[];
  for (const bank of rows) {
    new mint.PointBlip(207, Number(bank.x), Number(bank.y), Number(bank.z), 69, 0.8, true, 0, 'Банк');
    const shape = new mint.ColshapeSphere(Number(bank.x), Number(bank.y), Number(bank.z), 1, 0, true);
    setColshapeHandlers(shape, {
      onEnter: (player) => {
        here.add(player);
        cef(player, `prompt.show(${JSON.stringify('Нажмите <span>E</span> для того, чтобы взаимодействовать с банковским счетом')});`);
      },
      onExit: (player) => {
        here.delete(player);
        cef(player, 'prompt.hide();');
        call(player, 'bank.close', true);
        player.emit('crp:bank:close');
      },
    });
  }
  mint.log(`crp: банков ${rows.length}`);
  return rows.length;
}

export function installBank(): void {
  mint.onClient('crp:shop:use', (player: mint.Player) => {
    if (here.has(player)) void show(player);
  });
  mint.onClient('bank.entering', (player: mint.Player) => {
    if (here.has(player)) void show(player);
  });
  mint.onClient('bank.close', (player: mint.Player) => player.emit('crp:bank:close'));
  mint.onClient('bank.push', async (player: mint.Player, ...args: unknown[]) => {
    if (!here.has(player)) return call(player, 'bank.push.ans', 0);
    const sum = Math.floor(Number(args[0]));
    if (!Number.isFinite(sum) || sum <= 0) return call(player, 'bank.push.ans', 0);
    if (!(await removeCash(player, sum))) return call(player, 'bank.push.ans', 3);
    if (!(await addBank(player, sum))) {
      await addCash(player, sum);
      return call(player, 'bank.push.ans', 0);
    }
    const character = getSession(player).character;
    const active = character ? (await cardsOf(Number(character.id))).find((card) => card.active) : undefined;
    if (active && character) {
      active.balance = Number(character.bank) || 0;
      await active.save();
    }
    call(player, 'bank.push.ans', 1);
    await refresh(player);
  });
  mint.onClient('bank.pop', async (player: mint.Player, ...args: unknown[]) => {
    if (!here.has(player)) return call(player, 'bank.pop.ans', 0);
    const sum = Math.floor(Number(args[0]));
    if (!Number.isFinite(sum) || sum <= 0) return call(player, 'bank.pop.ans', 0);
    if (!(await removeBank(player, sum))) return call(player, 'bank.pop.ans', 2);
    if (!(await addCash(player, sum))) {
      await addBank(player, sum);
      return call(player, 'bank.pop.ans', 0);
    }
    const character = getSession(player).character;
    const active = character ? (await cardsOf(Number(character.id))).find((card) => card.active) : undefined;
    if (active && character) {
      active.balance = Number(character.bank) || 0;
      await active.save();
    }
    call(player, 'bank.pop.ans', 1);
    await refresh(player);
  });
  mint.onClient('bank.transfer.ask', async (player: mint.Player, ...args: unknown[]) => {
    const character = getSession(player).character;
    const account = Math.floor(Number(args[0]));
    if (!character || account === Number(character.id)) return call(player, 'bank.transfer.ask.ans', null);
    const row = (await table('Character').findOne({ where: { id: account } })) as (DbRow & { name: string }) | null;
    call(player, 'bank.transfer.ask.ans', row?.name ?? null);
  });
  mint.onClient('bank.transfer', async (player: mint.Player, ...args: unknown[]) => {
    const character = getSession(player).character;
    const sum = Math.floor(Number(args[0]));
    const account = Math.floor(Number(args[1]));
    if (!character || !Number.isFinite(sum) || sum <= 0 || account === Number(character.id)) return call(player, 'bank.transfer.ans', 0);
    if (Math.floor((Number(character.minutes) || 0) / 60) < 30) return call(player, 'bank.transfer.ans', 3);
    const card = (await cardsOf(Number(character.id))).find((item) => item.active);
    if (!card) {
      notifyError(player, 'Откройте карту в банке', 'Банк');
      return call(player, 'bank.transfer.ans', 0);
    }
    if (card.blocked) {
      notifyError(player, 'Карта заблокирована', 'Банк');
      return call(player, 'bank.transfer.ans', 0);
    }
    const key = monthKey();
    if (card.monthKey !== key) {
      card.monthKey = key;
      card.transferMonth = 0;
      card.cashbackMonth = 0;
    }
    const spec = CARDS[card.type];
    const fee = feeOf(card.type, Number(card.transferMonth) || 0, sum);
    const total = sum + fee;
    if ((Number(card.balance) || 0) < total || (Number(character.bank) || 0) < total) return call(player, 'bank.transfer.ans', 2);
    const target = (await table('Character').findOne({ where: { id: account } })) as (DbRow & { id: number; bank: number }) | null;
    const targetCard = (await table('BankCard').findOne({ where: { characterId: account, active: true } })) as Card | null;
    if (!target || !targetCard) {
      notifyError(player, 'У получателя нет активной карты', 'Банк');
      return call(player, 'bank.transfer.ans', 0);
    }
    const max = CARDS[targetCard.type]?.maxBalance ?? spec?.maxBalance ?? 0;
    if ((Number(targetCard.balance) || 0) + sum > max) {
      notifyError(player, 'Получатель не может принять эту сумму', 'Банк');
      return call(player, 'bank.transfer.ans', 0);
    }
    if (!(await removeBank(player, total))) return call(player, 'bank.transfer.ans', 2);
    const online = mint.Player.all.find((entry) => getSession(entry).character?.id === target.id);
    const credited = online ? await addBank(online, sum) : await creditOffline(target, sum);
    if (!credited) {
      await addBank(player, total);
      return call(player, 'bank.transfer.ans', 0);
    }
    card.balance = (Number(card.balance) || 0) - total;
    card.transferMonth = (Number(card.transferMonth) || 0) + sum;
    await card.save();
    targetCard.balance = (Number(targetCard.balance) || 0) + sum;
    await targetCard.save();
    call(player, 'bank.transfer.ans', 1);
    await refresh(player);
    if (online) await refresh(online);
  });
  mint.onClient('bank.phone.push', async (player: mint.Player, ...args: unknown[]) => {
    const character = getSession(player).character;
    const sum = Math.floor(Number(args[0]));
    const phone = character
      ? ((await table('Phone').findOne({ where: { characterId: character.id } })) as (DbRow & { money: number }) | null)
      : null;
    if (!character || !phone || !Number.isFinite(sum) || sum <= 0) return call(player, 'bank.phone.push.ans', 0);
    if (!(await removeBank(player, sum))) return call(player, 'bank.phone.push.ans', 2);
    phone.money = (Number(phone.money) || 0) + sum;
    await phone.save();
    call(player, 'bank.phone.push.ans', 1);
    notifySuccess(player, `Текущий баланс телефона $${phone.money}`, 'Телефон');
    await refresh(player);
  });
  mint.onClient('bank.house.push', async (player: mint.Player, ...args: unknown[]) => {
    const character = getSession(player).character;
    const id = Math.floor(Number(args[0]));
    const days = Math.floor(Number(args[1]));
    const house = houseById(id);
    if (!character || !house || days <= 0 || Number(house.info.characterId) !== Number(character.id)) return call(player, 'bank.house.push.ans', 0);
    const left = dateDays(house.info.date);
    if (days + left > 30) return call(player, 'bank.house.push.ans', 0);
    const price = days * rentOf(house.info, house.interior);
    if (!(await removeBank(player, price))) return call(player, 'bank.house.push.ans', 2);
    house.info.date = new Date(Date.now() + (days + left) * 86400000);
    await house.info.save();
    call(player, 'bank.house.push.ans', 1);
    await refresh(player);
  });
  mint.onClient('bank.biz.push', async (player: mint.Player, ...args: unknown[]) => {
    const character = getSession(player).character;
    const id = Math.floor(Number(args[0]));
    const days = Math.floor(Number(args[1]));
    const biz = (await table('Biz').findOne({ where: { id } })) as DbRow | null;
    if (!character || !biz || days <= 0 || Number(biz.characterId) !== Number(character.id) || biz.date == null) return call(player, 'bank.biz.push.ans', 0);
    const left = dateDays(biz.date);
    if (days + left > 30) return call(player, 'bank.biz.push.ans', 0);
    const due = Math.trunc(bizDailyRent(biz) * days);
    if ((Number(character.bank) || 0) < due) return call(player, 'bank.biz.push.ans', 2);
    if (!(await removeBank(player, due))) return call(player, 'bank.biz.push.ans', 0);
    biz.date = new Date(Date.now() + (days + left) * 86400000);
    await biz.save();
    call(player, 'bank.biz.push.ans', 1);
    await refresh(player);
  });
  mint.onClient('bank.card.open', async (player: mint.Player, ...args: unknown[]) => {
    if (!here.has(player)) return call(player, 'bank.card.open.ans', 0);
    const type = String(args[0] ?? '');
    const spec = CARDS[type];
    const character = getSession(player).character;
    if (!spec || !character) return call(player, 'bank.card.open.ans', 0);
    const cards = await cardsOf(Number(character.id));
    if (cards.some((card) => card.type === type)) return call(player, 'bank.card.open.ans', 0);
    if (spec.openFee && !(await removeBank(player, spec.openFee))) return call(player, 'bank.card.open.ans', 2);
    const number = String(Math.floor(1000000000000000 + Math.random() * 8999999999999999));
    await table('BankCard').create({
      characterId: character.id,
      type,
      number,
      balance: character.bank,
      active: !cards.some((card) => card.active),
      blocked: false,
      feeAt: new Date(),
      monthKey: monthKey(),
      transferMonth: 0,
      cashbackMonth: 0,
    });
    call(player, 'bank.card.open.ans', 1);
    await refresh(player);
  });
  mint.onClient('bank.card.activate', async (player: mint.Player, ...args: unknown[]) => {
    const character = getSession(player).character;
    const cardId = Math.floor(Number(args[0]));
    if (!character) return call(player, 'bank.card.activate.ans', 0);
    const cards = await cardsOf(Number(character.id));
    const card = cards.find((item) => item.id === cardId);
    if (!card || card.blocked) return call(player, 'bank.card.activate.ans', 0);
    for (const item of cards) {
      item.active = item.id === card.id;
      if (item.active) item.balance = Number(character.bank) || 0;
      await item.save();
    }
    call(player, 'bank.card.activate.ans', 1);
    await refresh(player);
  });
  mint.onClient('bank.card.reissue', async (player: mint.Player, ...args: unknown[]) => {
    if (!here.has(player)) return call(player, 'bank.card.reissue.ans', 0);
    const character = getSession(player).character;
    const cardId = Math.floor(Number(args[0]));
    const cards = character ? await cardsOf(Number(character.id)) : [];
    const card = cards.find((item) => item.id === cardId);
    const spec = card ? CARDS[card.type] : undefined;
    if (!character || !card || !spec) return call(player, 'bank.card.reissue.ans', 0);
    if (spec.openFee && !(await removeBank(player, spec.openFee))) return call(player, 'bank.card.reissue.ans', 2);
    card.number = String(Math.floor(1000000000000000 + Math.random() * 8999999999999999));
    card.blocked = false;
    await card.save();
    call(player, 'bank.card.reissue.ans', 1);
    await refresh(player);
  });
  mint.onClient('bank.deposit.open', async (player: mint.Player, ...args: unknown[]) => {
    if (!here.has(player)) return call(player, 'bank.deposit.open.ans', 0);
    const tariff = String(args[0] ?? '');
    const amount = Math.floor(Number(args[1]));
    const spec = DEPOSITS[tariff];
    const character = getSession(player).character;
    if (!spec || !character || amount < spec.min || amount > spec.max) return call(player, 'bank.deposit.open.ans', 0);
    const exists = (await table('BankDeposit').findOne({ where: { characterId: character.id } })) as DbRow | null;
    const card = (await cardsOf(Number(character.id))).find((item) => item.active);
    if (exists || !card) return call(player, 'bank.deposit.open.ans', 0);
    if (!(await removeBank(player, amount))) return call(player, 'bank.deposit.open.ans', 2);
    card.balance = Number(character.bank) || 0;
    await card.save();
    await table('BankDeposit').create({
      characterId: character.id,
      cardId: card.id,
      tariff,
      balance: amount,
      openedAt: new Date(),
      lastAccrualAt: new Date(),
    });
    call(player, 'bank.deposit.open.ans', 1);
    await refresh(player);
  });
  mint.onClient('bank.deposit.topup', async (player: mint.Player, ...args: unknown[]) => {
    const amount = Math.floor(Number(args[0]));
    const character = getSession(player).character;
    const deposit = character ? (await table('BankDeposit').findOne({ where: { characterId: character.id } })) as DbRow | null : null;
    const spec = deposit ? DEPOSITS[String(deposit.tariff)] : undefined;
    if (!character || !deposit || !spec?.topup || amount <= 0) return call(player, 'bank.deposit.topup.ans', 0);
    if ((Number(deposit.balance) || 0) + amount > spec.max) return call(player, 'bank.deposit.topup.ans', 0);
    if (!(await removeBank(player, amount))) return call(player, 'bank.deposit.topup.ans', 2);
    deposit.balance = (Number(deposit.balance) || 0) + amount;
    await deposit.save();
    call(player, 'bank.deposit.topup.ans', 1);
    await refresh(player);
  });
  mint.onClient('bank.deposit.withdraw', async (player: mint.Player, ...args: unknown[]) => {
    if (!here.has(player)) return call(player, 'bank.deposit.withdraw.ans', 0);
    const amount = Math.floor(Number(args[0]));
    const character = getSession(player).character;
    const deposit = character ? (await table('BankDeposit').findOne({ where: { characterId: character.id } })) as DbRow | null : null;
    const spec = deposit ? DEPOSITS[String(deposit.tariff)] : undefined;
    if (!character || !deposit || !spec?.withdraw || amount <= 0 || amount > (Number(deposit.balance) || 0)) {
      return call(player, 'bank.deposit.withdraw.ans', 0);
    }
    deposit.balance = (Number(deposit.balance) || 0) - amount;
    await deposit.save();
    if (!(await addBank(player, amount))) {
      deposit.balance = (Number(deposit.balance) || 0) + amount;
      await deposit.save();
      return call(player, 'bank.deposit.withdraw.ans', 0);
    }
    call(player, 'bank.deposit.withdraw.ans', 1);
    await refresh(player);
  });
  mint.onClient('bank.deposit.close', async (player: mint.Player) => {
    if (!here.has(player)) return call(player, 'bank.deposit.close.ans', 0);
    const character = getSession(player).character;
    const deposit = character ? (await table('BankDeposit').findOne({ where: { characterId: character.id } })) as DbRow | null : null;
    if (!character || !deposit) return call(player, 'bank.deposit.close.ans', 0);
    const balance = Number(deposit.balance) || 0;
    if (typeof deposit.destroy === 'function') await deposit.destroy();
    if (balance && !(await addBank(player, balance))) return call(player, 'bank.deposit.close.ans', 0);
    call(player, 'bank.deposit.close.ans', 1);
    await refresh(player);
  });
  mint.onClient('bank.biz.cashbox.push', async (player: mint.Player, ...args: unknown[]) => {
    const character = getSession(player).character;
    const id = Math.floor(Number(args[0]));
    const sum = Math.floor(Number(args[1]));
    if (!character || !Number.isFinite(id) || sum <= 0) return call(player, 'bank.biz.cashbox.push.ans', 0);
    const biz = (await table('Biz').findOne({ where: { id } })) as DbRow | null;
    if (!biz || Number(biz.characterId) !== Number(character.id)) return call(player, 'bank.biz.cashbox.push.ans', 0);
    if ((Number(character.bank) || 0) < sum) return call(player, 'bank.biz.cashbox.push.ans', 2);
    if (cashLock.has(id)) return call(player, 'bank.biz.cashbox.push.ans', 0);
    cashLock.add(id);
    try {
      const paid = await removeBank(player, sum);
      if (!paid) return call(player, 'bank.biz.cashbox.push.ans', 0);
      biz.cashBox = (Number(biz.cashBox) || 0) + sum;
      await biz.save();
      call(player, 'bank.biz.cashbox.push.ans', 1);
      await refresh(player);
    } finally {
      cashLock.delete(id);
    }
  });
  mint.onClient('bank.biz.cashbox.pop', async (player: mint.Player, ...args: unknown[]) => {
    const character = getSession(player).character;
    const id = Math.floor(Number(args[0]));
    const sum = Math.floor(Number(args[1]));
    if (!character || !Number.isFinite(id) || sum <= 0) return call(player, 'bank.biz.cashbox.pop.ans', 0);
    const biz = (await table('Biz').findOne({ where: { id } })) as DbRow | null;
    if (!biz || Number(biz.characterId) !== Number(character.id)) return call(player, 'bank.biz.cashbox.pop.ans', 0);
    if ((Number(biz.cashBox) || 0) < sum) return call(player, 'bank.biz.cashbox.pop.ans', 4);
    if (cashLock.has(id)) return call(player, 'bank.biz.cashbox.pop.ans', 0);
    cashLock.add(id);
    biz.cashBox = (Number(biz.cashBox) || 0) - sum;
    try {
      const paid = await addBank(player, sum);
      if (!paid) {
        biz.cashBox = (Number(biz.cashBox) || 0) + sum;
        return call(player, 'bank.biz.cashbox.pop.ans', 0);
      }
      await biz.save();
      call(player, 'bank.biz.cashbox.pop.ans', 1);
      await refresh(player);
    } finally {
      cashLock.delete(id);
    }
  });
  mint.on('playerDisconnect', (player: mint.Player) => here.delete(player));
}

async function creditOffline(target: DbRow & { bank: number }, sum: number): Promise<boolean> {
  target.bank = (Number(target.bank) || 0) + sum;
  await target.save();
  return true;
}
