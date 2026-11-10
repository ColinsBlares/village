import * as mint from 'mint-server';
import { addAttachment } from '../attaches/index.js';
import { playAnimation, stopAnimation } from '../animations/index.js';
import type { DbRow } from '../player/session.js';
import { getSession } from '../player/session.js';
import { notifyError, notifyInfo } from '../ui/notify.js';
import { addJobExp } from '../jobs/index.js';
import { onTrunkOpen, vehicleState } from '../vehicles/index.js';

const GROW = (20 * 60 * 1000) / 3;
const NAMES = ['Работник', 'Фермер', 'Тракторист', 'Пилот'];

interface Spot {
  x: number;
  y: number;
  z: number;
}

interface Plant {
  object: mint.Object;
  count: number;
  field: DbRow;
}

interface FarmJob {
  farm: DbRow;
  type: number;
  pay: number;
}

const plants = new Map<number, Plant[]>();
const stage = new Map<number, number>();
const carried = new Map<number, number[]>();
const cropping = new Set<number>();
let storeCrop: (vehicle: mint.Vehicle, type: number) => string | null = () => 'Соберите урожай на поле';
let jobOf: (player: mint.Player) => FarmJob | undefined = () => undefined;
let hooked = false;

function point(value: unknown): Spot | null {
  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const spot = parsed as { x?: number; y?: number; z?: number };
  if (!Number.isFinite(Number(spot.x)) || !Number.isFinite(Number(spot.y))) return null;
  return { x: Number(spot.x), y: Number(spot.y), z: Number(spot.z) || 0 };
}

function between(a: Spot, b: Spot, step: number): Spot[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const count = Math.trunc(Math.hypot(dx, dy) / step);
  if (count < 2) return [];
  const list: Spot[] = [];
  for (let i = 1; i < count; i += 1) list.push({ x: a.x + (dx / count) * i, y: a.y + (dy / count) * i, z: a.z });
  return list;
}

function grid(field: DbRow): Spot[] {
  const p1 = point(field.p1);
  const p2 = point(field.p2);
  const p3 = point(field.p3);
  const p4 = point(field.p4);
  if (!p1 || !p2 || !p3 || !p4) return [];
  let left = between(p1, p3, 5);
  let right = between(p2, p4, 5);
  if (left.length > right.length) left = left.slice(0, right.length);
  if (right.length > left.length) right = right.slice(0, left.length);
  const spots: Spot[] = [];
  for (let i = 0; i < left.length; i += 1) spots.push(...between(left[i], right[i], 5));
  for (const spot of spots) spot.z = p1.z;
  return spots;
}

function clearPlants(field: DbRow): void {
  const list = plants.get(Number(field.id)) ?? [];
  for (const plant of list) if (plant.object.valid) plant.object.destroy();
  plants.delete(Number(field.id));
}

function spawn(field: DbRow, sunk: boolean, share: boolean): void {
  clearPlants(field);
  const spots = grid(field);
  if (!spots.length) return;
  const list: Plant[] = [];
  let left = Number(field.count) || 600;
  const piece = Math.max(1, Math.trunc(600 / spots.length));
  for (const spot of spots) {
    const count = share ? Math.min(piece, left) : piece;
    if (share && count <= 0) break;
    left -= count;
    try {
      const object = new mint.Object(
        mint.hash('prop_veg_crop_04'),
        spot.x,
        spot.y,
        sunk ? spot.z - 0.5 : spot.z,
        0,
        0,
        Math.PI / 2,
        0,
        true,
      );
      list.push({ object, count, field });
    } catch {
      break;
    }
  }
  plants.set(Number(field.id), list);
}

function raise(field: DbRow): void {
  for (const plant of plants.get(Number(field.id)) ?? []) {
    if (!plant.object.valid) continue;
    plant.object.pos = new mint.Vector3(plant.object.pos.x, plant.object.pos.y, plant.object.pos.z + 0.25);
  }
}

function dropHands(player: mint.Player): void {
  addAttachment(player, 'farmTrowel', true);
  addAttachment(player, 'farmProductA', true);
  addAttachment(player, 'farmProductB', true);
  addAttachment(player, 'farmProductC', true);
}

function showCarry(player: mint.Player, type: number): void {
  dropHands(player);
  const names = ['farmProductA', 'farmProductB', 'farmProductC'];
  addAttachment(player, names[Math.max(0, Math.min(2, type - 1))]);
}

export function sproutReady(rows: DbRow[]): void {
  for (const field of rows) {
    if ((Number(field.count) || 0) <= 0) continue;
    spawn(field, false, true);
  }
}

export function startGrowth(field: DbRow, crop: number): void {
  if (Number(field.count)) return;
  clearPlants(field);
  field.type = Math.max(1, Math.min(3, crop));
  field.count = 600;
  stage.set(Number(field.id), 0);
  void field.save();
  const timer = setInterval(() => {
    const next = (stage.get(Number(field.id)) ?? 0) + 1;
    stage.set(Number(field.id), next);
    if (next === 1) spawn(field, true, false);
    else raise(field);
    if (next >= 3) clearInterval(timer);
  }, GROW);
}

function nearest(player: mint.Player): Plant | null {
  let best: Plant | null = null;
  let dist = 4;
  for (const list of plants.values()) {
    for (const plant of list) {
      if (!plant.object.valid || plant.count <= 0) continue;
      const gap = player.pos.distanceTo(plant.object.pos);
      if (gap < dist) {
        dist = gap;
        best = plant;
      }
    }
  }
  return best;
}

export function takePlant(player: mint.Player, quiet: boolean): void {
  const header = 'Сбор урожая';
  const job = jobOf(player);
  if (cropping.has(player.id)) {
    if (!quiet) notifyError(player, 'Вы уже собираете урожай', header);
    return;
  }
  const plant = nearest(player);
  if (!plant) {
    if (!quiet) notifyError(player, 'Урожай не найден', header);
    return;
  }
  const grown = stage.get(Number(plant.field.id));
  if (grown != null && grown !== 3) {
    if (!quiet) notifyError(player, 'Урожай не созрел', header);
    return;
  }
  const character = getSession(player).character;
  if (!job || Number(character?.job) !== 5) {
    if (!quiet) notifyError(player, 'Вы не работаете на ферме', header);
    return;
  }
  if (Number(plant.field.farmId) !== Number(job.farm.id)) {
    if (!quiet) notifyError(player, 'Поле принадлежит другой ферме', header);
    return;
  }
  if (job.type !== 0 && job.type !== 1) {
    if (!quiet) notifyError(player, `Для должности ${NAMES[job.type] ?? NAMES[0]} недоступно`, header);
    return;
  }
  cropping.add(player.id);
  playAnimation(player, 'amb@world_human_gardener_plant@female@base', 'base_female', 1);
  addAttachment(player, 'farmTrowel');
  const playerId = player.id;
  const characterId = Number(character?.id) || 0;
  setTimeout(() => {
    cropping.delete(playerId);
    if (!player.valid || Number(getSession(player).character?.id) !== characterId) return;
    stopAnimation(player);
    dropHands(player);
    if (!jobOf(player)) return;
    if (!plant.object.valid || plant.count <= 0) {
      notifyError(player, 'В этой части поля урожай уже собран', header);
      return;
    }
    plant.count -= 1;
    plant.field.count = Math.max(0, (Number(plant.field.count) || 0) - 1);
    if (plant.count <= 0) {
      plant.object.destroy();
      const list = plants.get(Number(plant.field.id)) ?? [];
      const index = list.indexOf(plant);
      if (index >= 0) list.splice(index, 1);
      if (!list.length) plant.field.count = 0;
    }
    if ((Number(plant.field.count) || 0) % 20 === 0) void plant.field.save();
    const type = Math.max(1, Math.min(3, Number(plant.field.type) || 1));
    const bag = carried.get(playerId) ?? [];
    bag.push(type);
    carried.set(playerId, bag);
    showCarry(player, type);
  }, 7000);
}

export function bindCrop(store: (vehicle: mint.Vehicle, type: number) => string | null, jobs: (player: mint.Player) => FarmJob | undefined): void {
  storeCrop = store;
  jobOf = jobs;
  if (hooked) return;
  hooked = true;
  onTrunkOpen((player, vehicle) => {
    const header = 'Загрузка урожая';
    const state = vehicleState(vehicle);
    const bag = carried.get(player.id);
    if (!bag?.length) return;
    if (!state || state.key !== 'farm') return;
    if (player.pos.distanceTo(vehicle.pos) > 10) return notifyError(player, 'Авто далеко', header);
    const job = jobOf(player);
    if (!job || Number(getSession(player).character?.job) !== 5) return notifyError(player, 'Вы не работаете на ферме', header);
    const type = bag[0];
    const error = storeCrop(vehicle, type);
    if (error) return notifyError(player, error, header);
    bag.shift();
    if (!bag.length) {
      carried.delete(player.id);
      stopAnimation(player);
      dropHands(player);
    } else showCarry(player, bag[0]);
    if (state.owner !== Number(job.farm.id)) return notifyError(player, 'Вы работаете на другой ферме', header);
    job.pay += Number(job.farm.pay) || 0;
    notifyInfo(player, `Заработано $${job.pay}`, header);
    void addJobExp(player, 0.01, 5);
  });
  mint.on('playerDisconnect', (player) => {
    cropping.delete(player.id);
    carried.delete(player.id);
    dropHands(player);
  });
}
