import * as mint from 'mint-server';
import { table } from '../core/db.js';
import type { DbRow } from '../player/session.js';

interface Door {
  id: number;
  hash: number;
  locked: boolean;
  x: number;
  y: number;
  z: number;
}

const doors: Door[] = [];

function point(row: DbRow): { x: number; y: number; z: number } | null {
  const raw = typeof row.getDataValue === 'function' ? row.getDataValue('pos') : row.pos;
  try {
    const pos = typeof raw === 'string' ? JSON.parse(raw) as { x?: number; y?: number; z?: number } : raw as { x?: number; y?: number; z?: number };
    if (!Number.isFinite(Number(pos?.x))) return null;
    return { x: Number(pos.x), y: Number(pos.y), z: Number(pos.z) };
  } catch {
    return null;
  }
}

function send(player: mint.Player): void {
  mint.emitClient(player, 'crp:doors', JSON.stringify(doors));
}

export async function loadDoors(): Promise<number> {
  const rows = (await table('Door').findAll()) as DbRow[];
  doors.splice(0, doors.length);
  for (const row of rows) {
    const pos = point(row);
    if (!pos || !row.hash) continue;
    doors.push({ id: Number(row.id), hash: Number(row.hash), locked: !!row.locked, ...pos });
  }
  return doors.length;
}

export function syncDoors(player: mint.Player): void {
  send(player);
}

export function installDoors(): void {
  mint.onClient('crp:door:toggle', async (player, rawId) => {
    const door = doors.find((item) => item.id === Number(rawId));
    const row = door ? (await table('Door').findOne({ where: { id: door.id } })) as DbRow | null : null;
    if (!door || !row || player.pos.distanceTo(new mint.Vector3(door.x, door.y, door.z)) > 3) return;
    door.locked = !door.locked;
    row.locked = door.locked ? 1 : 0;
    await row.save();
    for (const other of mint.Player.all) if (other.valid) send(other);
  });
}
