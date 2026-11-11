import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { isBodyGun } from '../inventory/items.js';
import { getSession, type DbRow } from '../player/session.js';
import { notifyError } from '../ui/notify.js';

const worn = new WeakMap<mint.Player, number[]>();
let catalog = '';

export function joaat(text: string): number {
  let hash = 0;
  const value = text.toLowerCase();
  for (let i = 0; i < value.length; i += 1) {
    hash += value.charCodeAt(i);
    hash += hash << 10;
    hash ^= hash >>> 6;
  }
  hash += hash << 3;
  hash ^= hash >>> 11;
  hash += hash << 15;
  return hash >>> 0;
}

function listOf(player: mint.Player): number[] {
  let list = worn.get(player);
  if (!list) {
    list = [];
    worn.set(player, list);
  }
  return list;
}

function publish(player: mint.Player): void {
  const list = listOf(player);
  if (!list.length) player.deleteStreamSyncedMeta('crp:attach');
  else player.setStreamSyncedMeta('crp:attach', list.map((hash) => hash.toString(36)).join('|'));
}

export function hasAttachment(player: mint.Player, name: string): boolean {
  return listOf(player).includes(joaat(name));
}

export function addAttachment(player: mint.Player, name: string, remove = false): void {
  if (!player.valid || !name) return;
  const hash = joaat(name);
  const list = listOf(player);
  const index = list.indexOf(hash);
  if (index === -1) {
    if (!remove) list.push(hash);
  } else if (remove) list.splice(index, 1);
  publish(player);
}

export function syncGun(player: mint.Player, itemId: number, on: boolean): void {
  if (!isBodyGun(itemId)) return;
  addAttachment(player, `weapon_${itemId}`, !on);
}

function readAttach(raw: unknown): { bone: number; pos: number[]; rot: number[] } {
  const fallback = { bone: 11363, pos: [0.08, -0.15, -0.25], rot: [-100, 0, 0] };
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
  if (!parsed || typeof parsed !== 'object') return fallback;
  const info = parsed as { bone?: number; pos?: number[]; rot?: number[] };
  if (!Array.isArray(info.pos) || !Array.isArray(info.rot)) return fallback;
  return { bone: Number(info.bone) || fallback.bone, pos: info.pos.map(Number), rot: info.rot.map(Number) };
}

export async function sendAttachCatalog(player: mint.Player): Promise<void> {
  if (!catalog) {
    const rows = (await table('InventoryItem').findAll()) as DbRow[];
    const list = rows.filter((row) => row.model).map((row) => {
      const info = readAttach(row.attachInfo);
      return { id: Number(row.id), model: String(row.model), bone: info.bone, pos: info.pos, rot: info.rot, gun: isBodyGun(Number(row.id)) };
    });
    catalog = JSON.stringify(list);
  }
  if (player.valid) player.emit('crp:attach:catalog', catalog);
}

export async function syncWornGuns(player: mint.Player): Promise<void> {
  const character = getSession(player).character;
  if (!character) return;
  const rows = (await table('CharacterInventory').findAll({ where: { playerId: character.id, parentId: null, index: 9 } })) as DbRow[];
  for (const row of rows) syncGun(player, Number(row.itemId), true);
}

export function installAttaches(): void {
  mint.onClient('crp:attach:add', (player, name) => {
    if (typeof name === 'string') addAttachment(player, name, false);
  });
  mint.onClient('crp:attach:remove', (player, name) => {
    if (typeof name === 'string') addAttachment(player, name, true);
  });
  mint.onClient('crp:attach:lost', (player, name) => {
    if (typeof name !== 'string') return;
    addAttachment(player, name, true);
    notifyError(player, 'Вы уронили груз');
  });
  mint.on('playerDisconnect', (player) => {
    worn.delete(player);
  });
}
