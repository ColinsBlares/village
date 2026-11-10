import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { getPlace } from '../inventory/place.js';
import { rowParams } from '../inventory/items.js';
import {
  characterItems,
  checkTradeReceive,
  restoreSnapshots,
  snapshotTree,
  transferItemTree,
  type RowSnap,
} from '../inventory/slots.js';
import { sendInventory } from '../inventory/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess } from '../ui/notify.js';
import { addCash, removeCash } from '../world/money.js';

const HEADER = 'Обмен';
const RANGE = 5;
const MAX_ITEMS = 12;
const MAX_CASH = 10_000_000;
const OFFER_MS = 12_000;

interface Side {
  items: number[];
  cash: number;
  ready: boolean;
  confirm: boolean;
}

interface Session {
  a: mint.Player;
  b: mint.Player;
  aId: number;
  bId: number;
  locked: boolean;
  closed: boolean;
  sides: Record<number, Side>;
}

const byCharacter = new Map<number, Session>();
const live = new Set<Session>();
const pending = new Map<number, { from: mint.Player; at: number }>();

function alive(player: mint.Player): boolean {
  return player.valid && !!getSession(player).character;
}

function tell(player: mint.Player, kind: 'error' | 'info' | 'success', text: string): void {
  if (!alive(player)) return;
  if (kind === 'error') notifyError(player, text, HEADER);
  else if (kind === 'success') notifySuccess(player, text, HEADER);
  else notifyInfo(player, text, HEADER);
}

function blockReason(a: mint.Player, b: mint.Player): string | null {
  if (!alive(a) || !alive(b)) return 'Игрок недоступен';
  if (a.vehicle || b.vehicle) return 'Обмен недоступен в транспорте';
  if (a.dimension !== b.dimension || a.pos.distanceTo(b.pos) > RANGE) return 'Игрок слишком далеко';
  if (getPlace(a) || getPlace(b)) return 'Сначала закройте багажник или шкаф';
  return null;
}

function sessionOf(player: mint.Player): Session | null {
  const id = Number(getSession(player).character?.id);
  if (id && byCharacter.has(id)) return byCharacter.get(id)!;
  for (const session of live) {
    if (session.a === player || session.b === player) return session;
  }
  return null;
}

function other(session: Session, player: mint.Player): mint.Player {
  return session.a === player ? session.b : session.a;
}

function blankSide(): Side {
  return { items: [], cash: 0, ready: false, confirm: false };
}

function unready(session: Session): void {
  for (const id of [session.aId, session.bId]) {
    session.sides[id].ready = false;
    session.sides[id].confirm = false;
  }
}

function forget(session: Session): void {
  if (session.closed) return;
  session.closed = true;
  live.delete(session);
  byCharacter.delete(session.aId);
  byCharacter.delete(session.bId);
}

function closeUi(player: mint.Player): void {
  if (!player.valid) return;
  cef(player, 'trade.close();');
}

function cancel(session: Session, text: string): void {
  if (session.closed || session.locked) return;
  forget(session);
  tell(session.a, 'info', text);
  tell(session.b, 'info', text);
  closeUi(session.a);
  closeUi(session.b);
}

async function itemTitle(item: DbRow): Promise<string> {
  const row = (await table('InventoryItem').findOne({ where: { id: item.itemId } })) as DbRow | null;
  const params = rowParams(item);
  if (params.name) return String(params.name);
  return String(row?.name ?? 'Предмет');
}

function isTradable(rows: DbRow[], item: DbRow): boolean {
  if (!item.parentId) return false;
  const parent = rows.find((row) => Number(row.id) === Number(item.parentId));
  if (!parent || parent.parentId != null) return false;
  if (rowParams(item).faction) return false;
  return true;
}

async function describe(player: mint.Player, id: number): Promise<{ sqlId: number; itemId: number; name: string; params: Record<string, unknown> } | null> {
  const character = getSession(player).character;
  if (!character) return null;
  const rows = await characterItems(character.id);
  const item = rows.find((row) => Number(row.id) === id);
  if (!item) return null;
  return { sqlId: id, itemId: Number(item.itemId), name: await itemTitle(item), params: rowParams(item) };
}

async function tradableList(player: mint.Player, offered: number[]): Promise<{ sqlId: number; itemId: number; name: string; params: Record<string, unknown> }[]> {
  const character = getSession(player).character;
  if (!character) return [];
  const rows = await characterItems(character.id);
  const list: { sqlId: number; itemId: number; name: string; params: Record<string, unknown> }[] = [];
  for (const row of rows) {
    if (offered.includes(Number(row.id))) continue;
    if (!isTradable(rows, row)) continue;
    list.push({ sqlId: Number(row.id), itemId: Number(row.itemId), name: await itemTitle(row), params: rowParams(row) });
  }
  return list;
}

async function payload(me: mint.Player, them: mint.Player, session: Session): Promise<Record<string, unknown>> {
  const mine = session.sides[Number(getSession(me).character?.id)];
  const theirs = session.sides[Number(getSession(them).character?.id)];
  const offerItems: unknown[] = [];
  const theirItems: unknown[] = [];
  for (const id of mine.items) {
    const row = await describe(me, id);
    if (row) offerItems.push(row);
  }
  for (const id of theirs.items) {
    const row = await describe(them, id);
    if (row) theirItems.push(row);
  }
  return {
    partnerName: them.name,
    partnerId: them.id,
    cash: Number(getSession(me).character?.cash) || 0,
    items: await tradableList(me, mine.items),
    offerItems,
    offerCash: mine.cash,
    ready: mine.ready,
    confirm: mine.confirm,
    theirItems,
    theirCash: theirs.cash,
    theirReady: theirs.ready,
    theirConfirm: theirs.confirm,
  };
}

async function push(session: Session): Promise<void> {
  if (session.closed || session.locked) return;
  if (!alive(session.a) || !alive(session.b)) return cancel(session, 'Обмен отменён');
  cef(session.a, `trade.apply(${JSON.stringify(await payload(session.a, session.b, session))});`);
  cef(session.b, `trade.apply(${JSON.stringify(await payload(session.b, session.a, session))});`);
}

function normalizeCash(player: mint.Player, raw: unknown): number | null {
  const value = Math.trunc(Number(raw));
  if (!Number.isFinite(value) || value < 0) return null;
  const wallet = Number(getSession(player).character?.cash) || 0;
  return Math.min(value, wallet, MAX_CASH);
}

async function validatePack(player: mint.Player, ids: number[]): Promise<string | null> {
  const character = getSession(player).character;
  if (!character) return 'Персонаж недоступен';
  const rows = await characterItems(character.id);
  for (const id of ids) {
    const item = rows.find((row) => Number(row.id) === id);
    if (!item || !isTradable(rows, item)) return 'Один из предметов уже недоступен';
  }
  return null;
}

async function commit(session: Session): Promise<void> {
  if (session.closed || session.locked) return;
  session.locked = true;
  const a = session.a;
  const b = session.b;
  const reason = blockReason(a, b);
  if (reason) {
    session.locked = false;
    return cancel(session, 'Обмен отменён');
  }
  const sideA = session.sides[session.aId];
  const sideB = session.sides[session.bId];
  const cashA = sideA.cash;
  const cashB = sideB.cash;
  if (!sideA.items.length && !sideB.items.length && !cashA && !cashB) {
    session.locked = false;
    tell(a, 'error', 'Нечего обменивать');
    return;
  }
  const packErrA = await validatePack(a, sideA.items);
  if (packErrA) {
    session.locked = false;
    return fail(session, packErrA);
  }
  const packErrB = await validatePack(b, sideB.items);
  if (packErrB) {
    session.locked = false;
    return fail(session, packErrB);
  }
  const rowsA = await characterItems(session.aId);
  const rowsB = await characterItems(session.bId);
  const genderA = Number(getSession(a).character?.gender) || 0;
  const genderB = Number(getSession(b).character?.gender) || 0;
  const fitA = await checkTradeReceive(session.aId, genderA, rowsA, sideB.items, rowsB, sideA.items);
  if (fitA) {
    session.locked = false;
    return fail(session, fitA);
  }
  const fitB = await checkTradeReceive(session.bId, genderB, rowsB, sideA.items, rowsA, sideB.items);
  if (fitB) {
    session.locked = false;
    return fail(session, fitB);
  }
  if ((Number(getSession(a).character?.cash) || 0) < cashA || (Number(getSession(b).character?.cash) || 0) < cashB) {
    session.locked = false;
    return fail(session, 'Недостаточно наличных');
  }

  const moved: RowSnap[] = [];
  for (const id of sideA.items) {
    const snap = snapshotTree(rowsA, id);
    const err = await transferItemTree(session.aId, session.bId, id);
    if (err) {
      await restoreSnapshots(moved);
      session.locked = false;
      return fail(session, err);
    }
    moved.push(...snap);
  }
  for (const id of sideB.items) {
    const snap = snapshotTree(rowsB, id);
    const err = await transferItemTree(session.bId, session.aId, id);
    if (err) {
      await restoreSnapshots(moved);
      session.locked = false;
      return fail(session, err);
    }
    moved.push(...snap);
  }
  if (cashA > 0) {
    const ok = await removeCash(a, cashA);
    if (!ok || !(await addCash(b, cashA))) {
      await restoreSnapshots(moved);
      session.locked = false;
      return fail(session, 'Не удалось передать деньги');
    }
  }
  if (cashB > 0) {
    const ok = await removeCash(b, cashB);
    if (!ok || !(await addCash(a, cashB))) {
      if (cashA > 0) {
        await removeCash(b, cashA);
        await addCash(a, cashA);
      }
      await restoreSnapshots(moved);
      session.locked = false;
      return fail(session, 'Не удалось передать деньги');
    }
  }
  await sendInventory(a);
  await sendInventory(b);
  forget(session);
  tell(a, 'success', 'Обмен завершён');
  tell(b, 'success', 'Обмен завершён');
  closeUi(a);
  closeUi(b);
}

function fail(session: Session, text: string): void {
  session.locked = false;
  unready(session);
  tell(session.a, 'error', text);
  tell(session.b, 'error', text);
  void push(session);
}

function ensure(player: mint.Player): Session | null {
  const session = sessionOf(player);
  if (!session || session.closed) return null;
  const reason = blockReason(session.a, session.b);
  if (reason) {
    cancel(session, 'Обмен отменён');
    tell(player, 'error', reason);
    return null;
  }
  return session;
}

export function installTrade(): void {
  mint.setInterval(() => {
    for (const session of live) {
      if (session.locked || session.closed) continue;
      if (blockReason(session.a, session.b)) cancel(session, 'Обмен отменён');
    }
  }, 1000);

  mint.onClient('crp:trade:offer', (player, targetId) => {
    const target = mint.Player.getByID(Number(targetId));
    if (!alive(player) || !target || !alive(target) || target === player) return tell(player, 'error', 'Игрок не найден');
    const reason = blockReason(player, target);
    if (reason) return tell(player, 'error', reason);
    if (sessionOf(player) || sessionOf(target)) return tell(player, 'error', 'Обмен уже идёт');
    pending.set(Number(getSession(target).character?.id), { from: player, at: Date.now() });
    cef(target, `offerDialog.show('trade', ${JSON.stringify({ playerId: player.id, name: player.name })});`);
    tell(player, 'info', `Вы предложили обмен ${target.name}`);
  });

  mint.onClient('crp:trade:accept', (player, fromId) => {
    const character = getSession(player).character;
    if (!character) return;
    const offer = pending.get(character.id);
    pending.delete(character.id);
    if (!offer || !alive(offer.from) || offer.from.id !== Number(fromId) || Date.now() - offer.at > OFFER_MS) {
      return tell(player, 'error', 'Предложение не найдено');
    }
    const from = offer.from;
    const reason = blockReason(from, player);
    if (reason) {
      tell(player, 'error', reason);
      tell(from, 'error', reason);
      return;
    }
    if (sessionOf(from) || sessionOf(player)) return tell(player, 'error', 'Обмен уже идёт');
    const session: Session = {
      a: from,
      b: player,
      aId: Number(getSession(from).character?.id),
      bId: character.id,
      locked: false,
      closed: false,
      sides: {},
    };
    session.sides[session.aId] = blankSide();
    session.sides[session.bId] = blankSide();
    byCharacter.set(session.aId, session);
    byCharacter.set(session.bId, session);
    live.add(session);
    void push(session);
  });

  mint.onClient('crp:trade:decline', (player, fromId) => {
    const character = getSession(player).character;
    if (!character) return;
    const offer = pending.get(character.id);
    if (!offer || offer.from.id !== Number(fromId)) return;
    pending.delete(character.id);
    if (alive(offer.from)) tell(offer.from, 'info', `${player.name} отказался от обмена`);
  });

  mint.onClient('crp:trade:item:add', (player, sqlId) => {
    const session = ensure(player);
    if (!session) return;
    const id = Number(getSession(player).character?.id);
    const side = session.sides[id];
    const itemId = Number(sqlId);
    if (side.items.includes(itemId)) return;
    if (side.items.length >= MAX_ITEMS) return tell(player, 'error', 'В обмене уже максимум предметов');
    void characterItems(id).then((rows) => {
      const item = rows.find((row) => Number(row.id) === itemId);
      if (!item || !isTradable(rows, item)) return tell(player, 'error', 'Этот предмет нельзя обменять');
      side.items.push(itemId);
      unready(session);
      void push(session);
    });
  });

  mint.onClient('crp:trade:item:remove', (player, sqlId) => {
    const session = ensure(player);
    if (!session) return;
    const side = session.sides[Number(getSession(player).character?.id)];
    const idx = side.items.indexOf(Number(sqlId));
    if (idx === -1) return;
    side.items.splice(idx, 1);
    unready(session);
    void push(session);
  });

  mint.onClient('crp:trade:cash', (player, sum) => {
    const session = ensure(player);
    if (!session) return;
    const value = normalizeCash(player, sum);
    if (value == null) return tell(player, 'error', 'Некорректная сумма');
    const side = session.sides[Number(getSession(player).character?.id)];
    if (side.cash === value) return;
    side.cash = value;
    unready(session);
    void push(session);
  });

  mint.onClient('crp:trade:ready', (player, sum, flag) => {
    const session = ensure(player);
    if (!session) return;
    const side = session.sides[Number(getSession(player).character?.id)];
    const otherSide = session.sides[Number(getSession(other(session, player)).character?.id)];
    const cash = normalizeCash(player, sum);
    if (sum != null && sum !== '' && cash == null) return tell(player, 'error', 'Некорректная сумма');
    if (cash != null) side.cash = cash;
    const ready = flag === true || flag === 1 || flag === '1';
    if (ready) {
      if (!side.items.length && !side.cash && !otherSide.items.length && !otherSide.cash) {
        return tell(player, 'error', 'Нечего обменивать');
      }
      side.ready = true;
      side.confirm = false;
    } else {
      side.ready = false;
      side.confirm = false;
      otherSide.confirm = false;
    }
    void push(session);
  });

  mint.onClient('crp:trade:confirm', (player, sum) => {
    const session = ensure(player);
    if (!session) return;
    const side = session.sides[Number(getSession(player).character?.id)];
    const otherSide = session.sides[Number(getSession(other(session, player)).character?.id)];
    const cash = normalizeCash(player, sum);
    if (sum != null && sum !== '' && cash == null) return tell(player, 'error', 'Некорректная сумма');
    if (cash != null && cash !== side.cash) {
      unready(session);
      void push(session);
      return tell(player, 'error', 'Сумма изменилась, нажмите «Готов» ещё раз');
    }
    if (!side.ready || !otherSide.ready) return tell(player, 'error', 'Оба должны нажать «Готов»');
    side.confirm = true;
    if (!otherSide.confirm) return void push(session);
    void commit(session);
  });

  mint.onClient('crp:trade:cancel', (player) => {
    const session = sessionOf(player);
    if (!session) return closeUi(player);
    if (session.locked) return;
    cancel(session, 'Обмен отменён');
  });

  mint.on('playerDisconnect', (player) => {
    const character = getSession(player).character;
    if (character) pending.delete(character.id);
    const session = sessionOf(player);
    if (session && !session.locked) cancel(session, 'Обмен отменён');
  });
}
