import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';

const likes = new Map<number, number[]>();

function payload(accountId: number): Record<string, { likes: number; liked: boolean }> {
  const data: Record<string, { likes: number; liked: boolean }> = {};
  for (const [id, accounts] of likes) {
    data[String(id)] = { likes: accounts.length, liked: accounts.includes(accountId) };
  }
  return data;
}

export function sendChangelist(player: mint.Player): void {
  const accountId = Number(getSession(player).account?.id) || 0;
  if (!accountId || !player.valid) return;
  cef(player, `if (window.changelist && changelist.initLikes) changelist.initLikes(${JSON.stringify(payload(accountId))});`);
}

export async function loadChangelist(): Promise<number> {
  const rows = (await table('ChangelistLike').findAll()) as DbRow[];
  likes.clear();
  for (const row of rows) {
    const id = Number(row.changelistId);
    const list = likes.get(id) ?? [];
    list.push(Number(row.likeAccountId));
    likes.set(id, list);
  }
  return rows.length;
}

export function installChangelist(): void {
  mint.onClient('crp:changelist:like', async (player, raw) => {
    const accountId = Number(getSession(player).account?.id) || 0;
    const id = Math.trunc(Number(raw));
    if (!accountId || !Number.isInteger(id) || id <= 0) return;
    const list = likes.get(id) ?? [];
    if (list.includes(accountId)) return;
    list.push(accountId);
    likes.set(id, list);
    await table('ChangelistLike').create({ changelistId: id, likeAccountId: accountId });
    const count = list.length;
    for (const current of mint.Player.all) {
      if (!current.valid || !getSession(current).character) continue;
      cef(current, `if (window.changelist && changelist.setLikes) changelist.setLikes(${id}, ${count});`);
    }
  });
}
