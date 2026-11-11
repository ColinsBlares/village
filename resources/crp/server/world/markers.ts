import * as mint from 'mint-server';
import { commands, type Out } from '../admin/commands.js';
import { allowMove } from '../anticheat/index.js';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { getSession, type DbRow } from '../player/session.js';

interface End {
  key: string;
  rowId: number;
  x: number;
  y: number;
  z: number;
  h: number;
  d: number;
  marker: mint.Marker;
  shape: mint.Colshape;
  blip: mint.PointBlip | null;
}

const ends: End[] = [];
const pair = new Map<string, string>();
const rows = new Map<number, DbRow>();
const last = new WeakMap<mint.Player, string>();

function degrees(player: mint.Player): number {
  return player.rot.z * (180 / Math.PI);
}

function nearPlayers(player: mint.Player): mint.Player[] {
  const list: mint.Player[] = [];
  for (const other of mint.Player.all) {
    if (!other.valid || other.id === player.id || other.dimension !== player.dimension) continue;
    if (!getSession(other).character) continue;
    if (player.pos.distanceTo(other.pos) > 10) continue;
    list.push(other);
  }
  return list;
}

function spawnEnd(row: DbRow, side: 'a' | 'b', x: number, y: number, z: number, h: number, d: number, sprite: number, color: number): End {
  const marker = new mint.Marker(
    mint.MarkerType.MarkerCylinder,
    x, y, z,
    0, 0, 0,
    0, 0, 0,
    0.5, 0.5, 0.5,
    70, 255, 207, 13,
    d,
  );
  const shape = new mint.ColshapeSphere(x, y, z, 1.5, d, true);
  const end: End = {
    key: `${row.id}:${side}`,
    rowId: Number(row.id),
    x, y, z, h, d,
    marker,
    shape,
    blip: sprite && color ? new mint.PointBlip(sprite, x, y, z, color, 1, true, d, String(row.name || 'ТП')) : null,
  };
  setColshapeHandlers(shape, {
    onEnter: (player) => enter(player, end),
    onExit: (player) => {
      if (last.get(player) === end.key) return;
      last.delete(player);
    },
  });
  ends.push(end);
  return end;
}

function enter(player: mint.Player, end: End): void {
  if (player.vehicle || last.has(player)) return;
  const dest = ends.find((item) => item.key === pair.get(end.key));
  if (!dest) return;
  for (const other of nearPlayers(player)) mint.emitClient(other, 'crp:marker:follow', player.id, end.x, end.y, end.z);
  allowMove(player);
  last.set(player, end.key);
  player.dimension = dest.d;
  player.pos = new mint.Vector3(dest.x, dest.y, dest.z + 1);
  player.rot = new mint.Vector3(0, 0, dest.h * (Math.PI / 180));
}

function clearRow(id: number): void {
  const row = rows.get(id);
  rows.delete(id);
  for (const end of ends.filter((item) => item.rowId === id)) {
    pair.delete(end.key);
    end.blip?.destroy();
    end.shape.destroy();
    end.marker.destroy();
  }
  for (let i = ends.length - 1; i >= 0; i -= 1) if (ends[i].rowId === id) ends.splice(i, 1);
  if (typeof row?.destroy === 'function') void row.destroy();
}

function place(row: DbRow): void {
  rows.set(Number(row.id), row);
  const a = spawnEnd(row, 'a', Number(row.x), Number(row.y), Number(row.z), Number(row.h) || 0, Number(row.d) || 0, Number(row.blip) || 0, Number(row.blipColor) || 0);
  const b = spawnEnd(row, 'b', Number(row.tpX), Number(row.tpY), Number(row.tpZ), Number(row.tpH) || 0, Number(row.tpD) || 0, Number(row.tpBlip) || 0, Number(row.tpBlipColor) || 0);
  pair.set(a.key, b.key);
  pair.set(b.key, a.key);
}

export async function loadMarkers(): Promise<number> {
  const list = (await table('TpMarker').findAll()) as DbRow[];
  for (const row of list) place(row);
  return list.length;
}

export function installMarkers(): void {
  commands['/tpmarkadd'] = {
    access: 3,
    description: 'Добавить маркер для телепорта (необходимо указать координаты конечного маркера). Используйте 0 для параметров blip/blipColor, если маркер не имеет блипа на карте.',
    args: '[x]:n [y]:n [z]:n [heading]:n [dimension]:n [blipA]:n [colorBlipA]:n [blipB]:n [colorBlipB]:n [name]',
    async handler(player, args, out: Out) {
      const there = new mint.Vector3(Number(args[0]), Number(args[1]), Number(args[2]) - 1);
      if (player.pos.distanceTo(there) < 5) return out.error('Маркеры расположены слишком близко', player);
      const row = (await table('TpMarker').create({
        name: String(args.slice(9).join(' ') || 'ТП').slice(0, 20),
        x: player.pos.x,
        y: player.pos.y,
        z: player.pos.z - 1,
        h: degrees(player),
        d: player.dimension,
        blip: Number(args[5]) || null,
        blipColor: Number(args[6]) || null,
        tpX: there.x,
        tpY: there.y,
        tpZ: there.z,
        tpH: Number(args[3]) || 0,
        tpD: Number(args[4]) || 0,
        tpBlip: Number(args[7]) || null,
        tpBlipColor: Number(args[8]) || null,
      })) as DbRow;
      place(row);
      out.info(`${getSession(player).character?.name ?? player.name} добавил ТП-маркер`);
    },
  };
  commands['/tpmarkdel'] = {
    access: 3,
    description: 'Удалить маркер для телепорта.',
    args: '',
    handler(player, _args, out: Out) {
      const end = ends.find((item) => item.d === player.dimension && player.pos.distanceTo(new mint.Vector3(item.x, item.y, item.z)) <= 2);
      if (!end) return out.error('Маркер поблизости не найден', player);
      const id = end.rowId;
      clearRow(id);
      out.info(`${getSession(player).character?.name ?? player.name} удалил ТП-маркер #${id}`);
    },
  };
}
