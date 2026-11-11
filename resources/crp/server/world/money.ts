import * as mint from 'mint-server';
import { db } from '../core/db.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyBank, notifyCash } from '../ui/notify.js';

const locks = new Map<number, Promise<unknown>>();

function withLock<T>(id: number, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(id) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const next = prev.then(() => gate, () => gate);
  locks.set(id, next);
  return prev.then(fn, fn).finally(release);
}

function affected(result: unknown, meta: unknown): number {
  const row = result as { affectedRows?: number } | null;
  const extra = meta as { affectedRows?: number } | null;
  if (row && typeof row.affectedRows === 'number') return row.affectedRows;
  if (extra && typeof extra.affectedRows === 'number') return extra.affectedRows;
  return 0;
}

async function deltaColumn(id: number, field: 'cash' | 'bank', delta: number, transaction: unknown): Promise<number> {
  const sequelize = db.sequelize as unknown as {
    query(sql: string, options: object): Promise<unknown>;
  };
  const need = delta < 0 ? -delta : 0;
  const guard = delta < 0 ? 'AND `' + field + '` >= :need' : '';
  const updated = (await sequelize.query(
    'UPDATE characters SET `' + field + '` = `' + field + '` + :delta WHERE id = :id ' + guard + ' AND `' + field + '` + :delta >= 0 AND `' + field + '` + :delta <= 1000000000',
    { replacements: { delta, id, need }, transaction },
  )) as [unknown, unknown];
  if (!affected(updated[0], updated[1])) throw new Error('money');
  const rows = (await sequelize.query(
    'SELECT `' + field + '` AS value FROM characters WHERE id = :id',
    { replacements: { id }, transaction, type: 'SELECT' },
  )) as { value: number }[];
  return Number(rows[0]?.value) || 0;
}

function remember(character: DbRow, field: 'cash' | 'bank', value: number): void {
  character[field] = value;
}

function pushHud(player: mint.Player, character: DbRow, cashDelta: number, bankDelta: number): void {
  cef(player, `mp.event.call('hud.setData', ${JSON.stringify({
    cash: Number(character.cash) || 0,
    bank: Number(character.bank) || 0,
  })}); if (playerMenu && playerMenu.setCash) playerMenu.setCash(${Number(character.cash) || 0});`);
  notifyCash(player, cashDelta);
  notifyBank(player, bankDelta);
}

async function change(player: mint.Player, field: 'cash' | 'bank', delta: number): Promise<boolean> {
  const character = getSession(player).character;
  if (!character || !player.valid) return false;
  const amount = Math.trunc(delta);
  if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1000000000) return false;
  try {
    const value = await withLock(Number(character.id), () => {
      const sequelize = db.sequelize as unknown as {
        transaction<T>(fn: (t: unknown) => Promise<T>): Promise<T>;
      };
      return sequelize.transaction((t) => deltaColumn(Number(character.id), field, amount, t));
    });
    remember(character, field, value);
    pushHud(player, character, field === 'cash' ? amount : 0, field === 'bank' ? amount : 0);
    return true;
  } catch {
    return false;
  }
}

export function addCash(player: mint.Player, amount: number): Promise<boolean> {
  return change(player, 'cash', amount);
}

export async function removeCash(player: mint.Player, amount: number): Promise<boolean> {
  const spent = Math.abs(amount);
  const ok = await change(player, 'cash', -spent);
  if (ok) {
    const pass = await import('../battlepass/index.js');
    void pass.noteSpend(player, spent);
  }
  return ok;
}

export function addBank(player: mint.Player, amount: number): Promise<boolean> {
  return change(player, 'bank', amount);
}

export function removeBank(player: mint.Player, amount: number): Promise<boolean> {
  return change(player, 'bank', -Math.abs(amount));
}

export async function creditBank(characterId: number, amount: number): Promise<boolean> {
  const sum = Math.trunc(amount);
  if (!Number.isFinite(sum) || sum <= 0) return false;
  const online = mint.Player.all.find((entry) => entry.valid && Number(getSession(entry).character?.id) === characterId);
  if (online) return addBank(online, sum);
  try {
    await withLock(characterId, () => {
      const sequelize = db.sequelize as unknown as {
        transaction<T>(fn: (t: unknown) => Promise<T>): Promise<T>;
      };
      return sequelize.transaction((t) => deltaColumn(characterId, 'bank', sum, t));
    });
    return true;
  } catch {
    return false;
  }
}
