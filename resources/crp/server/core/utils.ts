import * as mint from 'mint-server';
import { getSession } from '../player/session.js';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 extends Vec2 {
  z: number;
}

const vehicleRecords = new WeakMap<mint.Vehicle, { id: number }>();

export function bindVehicle(vehicle: mint.Vehicle, id: number): void {
  vehicleRecords.set(vehicle, { id });
}

export function escapeHtml(value: unknown): string {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function randomInteger(min: number, max: number): number {
  return Math.round(min - 0.5 + Math.random() * (max - min + 1));
}

export function randomFloat(min: number, max: number, digits: number): string {
  const value = min + Math.random() * (max - min);
  return value.toFixed(digits);
}

export function getPointsOnInterval(point1: Vec2, point2: Vec2, step: number): Vec2[] {
  const vectorX = point2.x - point1.x;
  const vectorY = point2.y - point1.y;
  const vectorLength = Math.sqrt(vectorX ** 2 + vectorY ** 2);
  const countOfPoint = Math.trunc(vectorLength / step);
  const stepX = vectorX / countOfPoint;
  const stepY = vectorY / countOfPoint;
  const points: Vec2[] = [];
  for (let i = 1; i < countOfPoint; i++) {
    points.push({ x: point1.x + stepX * i, y: point1.y + stepY * i });
  }
  return points;
}

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/** Как в Rage: имя vdist, значение — квадрат расстояния. */
export function vdist(posA: Vec3, posB: Vec3): number {
  const dx = posA.x - posB.x;
  const dy = posA.y - posB.y;
  const dz = posA.z - posB.z;
  return dx * dx + dy * dy + dz * dz;
}

export function vdistSqr(posA: Vec2, posB: Vec2): number {
  return Math.sqrt((posB.x - posA.x) ** 2 + (posB.y - posA.y) ** 2);
}

export function arraySum(values: number[]): number {
  let sum = 0;
  for (const value of values) sum += value;
  return sum;
}

export function getPlayerBySqlId(sqlId: number): mint.Player | null {
  if (!sqlId) return null;
  for (const player of mint.Player.all) {
    if (getSession(player).character?.id === sqlId) return player;
  }
  return null;
}

export function getPlayerByName(name: string): mint.Player | null {
  if (!name) return null;
  for (const player of mint.Player.all) {
    if (player.name === name) return player;
  }
  return null;
}

export function getNearPlayer(player: mint.Player): mint.Player | null {
  let near: mint.Player | null = null;
  let minDist = 99999;
  for (const other of mint.Player.all) {
    if (other.id === player.id || other.dimension !== player.dimension) continue;
    const distance = player.pos.distanceTo(other.pos);
    if (distance < minDist) {
      near = other;
      minDist = distance;
    }
  }
  return near;
}

export function getVehicleBySqlId(sqlId: number): mint.Vehicle | null {
  if (!sqlId) return null;
  for (const vehicle of mint.Vehicle.all) {
    if (vehicleRecords.get(vehicle)?.id === sqlId) return vehicle;
  }
  return null;
}

export function getNearVehicle(player: mint.Player, range = 10): mint.Vehicle | null {
  let near: mint.Vehicle | null = null;
  let minDist = 99999;
  for (const vehicle of mint.Vehicle.all) {
    if (vehicle.dimension !== player.dimension) continue;
    const distance = player.pos.distanceTo(vehicle.pos);
    if (distance < minDist && distance < range) {
      near = vehicle;
      minDist = distance;
    }
  }
  return near;
}

export function addOverheadText(
  player: mint.Player,
  text: string,
  color: readonly number[] = [255, 255, 255, 255],
): void {
  for (const other of mint.Player.all) {
    if (other.id === player.id || other.dimension !== player.dimension) continue;
    if (player.pos.distanceTo(other.pos) > 20) continue;
    mint.emitClient(other, 'crp:overhead', player.id, text, [...color]);
  }
}

function classify(vector: { x1: number; y1: number; x2: number; y2: number }, x1: number, y1: number): number {
  const product = (vector.x2 - vector.x1) * (y1 - vector.y1) - (vector.y2 - vector.y1) * (x1 - vector.x1);
  if (product > 0) return 1;
  if (product < 0) return -1;
  return 0;
}

function edgeType(vector: { x1: number; y1: number; x2: number; y2: number }, point: Vec2): number {
  switch (classify(vector, point.x, point.y)) {
    case 1:
      return vector.y1 < point.y && point.y <= vector.y2 ? 1 : 2;
    case -1:
      return vector.y2 < point.y && point.y <= vector.y1 ? 1 : 2;
    default:
      return 0;
  }
}

/** 2 — на ребре, 1 — внутри, 0 — снаружи. */
export function inPolygon(pos: Vec2, polygon: Vec2[]): number {
  let parity = 0;
  const edges = polygon.length;
  for (let i = 0; i < edges; i++) {
    const next = polygon[(i + 1) % edges];
    if (!next) continue;
    const current = polygon[i];
    if (!current) continue;
    const kind = edgeType(
      { x1: current.x, y1: current.y, x2: next.x, y2: next.y },
      pos,
    );
    if (kind === 0) return 2;
    if (kind === 1) parity = 1 - parity;
  }
  return parity;
}
