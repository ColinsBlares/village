import * as mint from 'mint-server';
import { getSession } from '../player/session.js';
import { notifyError, notifyInfo, notifySuccess } from '../ui/notify.js';

const setAt = new WeakMap<mint.Player, number>();
const seekAt = new WeakMap<mint.Vehicle, number>();
const endAt = new WeakMap<mint.Vehicle, number>();

function driver(player: mint.Player): mint.Vehicle | null {
  const vehicle = player.vehicle;
  if (!vehicle || (player.seat !== 1 && player.seat !== 0)) {
    notifyError(player, 'Нужно быть за рулём', 'Музыка');
    return null;
  }
  return vehicle;
}

function meta(vehicle: mint.Vehicle, key: string, value: string | number | null): void {
  const name = `crp:${key}`;
  if (value == null || value === '') vehicle.deleteStreamSyncedMeta(name);
  else vehicle.setStreamSyncedMeta(name, value);
}

function readQueue(vehicle: mint.Vehicle): string[] {
  const raw = vehicle.getStreamSyncedMeta('crp:musicQueue');
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];
    return list.filter((item) => typeof item === 'string' && item.length > 0 && item.length <= 300).slice(0, 15);
  } catch {
    return [];
  }
}

function urlOk(raw: string): boolean {
  return raw.length <= 300 && /^https?:\/\/\S+$/i.test(raw);
}

function applyQueue(vehicle: mint.Vehicle, queue: string[], index: number): void {
  if (!queue.length || index < 0 || index >= queue.length) {
    meta(vehicle, 'musicQueue', null);
    meta(vehicle, 'musicIndex', null);
    meta(vehicle, 'musicUrl', null);
    meta(vehicle, 'musicAt', null);
    return;
  }
  const at = Date.now();
  meta(vehicle, 'musicQueue', JSON.stringify(queue));
  meta(vehicle, 'musicIndex', index);
  meta(vehicle, 'musicAt', at);
  meta(vehicle, 'musicUrl', queue[index]);
}

export function handleMusic(player: mint.Player, raw: string): void {
  const vehicle = driver(player);
  if (!vehicle) return;
  const text = raw.trim();
  if (text === 'next') {
    const queue = readQueue(vehicle);
    const index = (Number(vehicle.getStreamSyncedMeta('crp:musicIndex')) || 0) + 1;
    applyQueue(vehicle, queue, index);
    return;
  }
  if (text === 'prev') {
    const queue = readQueue(vehicle);
    const index = Math.max(0, (Number(vehicle.getStreamSyncedMeta('crp:musicIndex')) || 0) - 1);
    applyQueue(vehicle, queue, index);
    return;
  }
  const volMatch = /^(?:volume|vol|громкость)\s+(\d{1,3})$/i.exec(text);
  if (volMatch) {
    const level = Math.max(0, Math.min(100, Number(volMatch[1])));
    meta(vehicle, 'musicVol', level);
    notifyInfo(player, `Громкость ${level}%`, 'Музыка');
    return;
  }
  if (!text || text === 'off' || text === 'stop') {
    applyQueue(vehicle, [], 0);
    notifyInfo(player, 'Музыка выключена', 'Музыка');
    return;
  }
  if (!urlOk(text)) return notifyError(player, 'Нужна прямая ссылка http или https', 'Музыка');
  const now = Date.now();
  if (now - (setAt.get(player) ?? 0) < 400) return;
  setAt.set(player, now);
  const queue = readQueue(vehicle);
  if (queue.length >= 15) return notifyError(player, 'В очереди уже 15 треков', 'Музыка');
  queue.push(text);
  if (vehicle.getStreamSyncedMeta('crp:musicUrl')) {
    meta(vehicle, 'musicQueue', JSON.stringify(queue));
    notifySuccess(player, 'Трек добавлен в очередь', 'Музыка');
    return;
  }
  applyQueue(vehicle, queue, 0);
  notifySuccess(player, 'Трек включён в машине', 'Музыка');
}

export function installVehicleMusic(): void {
  mint.onClient('crp:veh:music:ended', (player, rawId) => {
    if (!getSession(player).character) return;
    const id = Number(rawId);
    if (!Number.isSafeInteger(id) || id <= 0) return;
    let vehicle: mint.Vehicle | null = null;
    try {
      vehicle = mint.Vehicle.getByID(id);
    } catch {
      return;
    }
    if (!vehicle?.valid || !vehicle.getStreamSyncedMeta('crp:musicUrl')) return;
    if (player.dimension !== vehicle.dimension || player.pos.distanceTo(vehicle.pos) > 80) return;
    const now = Date.now();
    const started = Number(vehicle.getStreamSyncedMeta('crp:musicAt')) || 0;
    if (now - started < 1500) return;
    if (now - (endAt.get(vehicle) ?? 0) < 2000) return;
    endAt.set(vehicle, now);
    const queue = readQueue(vehicle);
    const index = Number(vehicle.getStreamSyncedMeta('crp:musicIndex'));
    applyQueue(vehicle, queue, (Number.isFinite(index) ? index : -1) + 1);
  });

  mint.onClient('crp:veh:music:volume', (player, level) => {
    const vehicle = driver(player);
    if (!vehicle) return;
    const next = Math.max(0, Math.min(100, Number(level) || 0));
    if (Number(vehicle.getStreamSyncedMeta('crp:musicVol')) === next) return;
    meta(vehicle, 'musicVol', next);
  });

  mint.onClient('crp:veh:music:seek', (player, seconds) => {
    const vehicle = driver(player);
    if (!vehicle || !vehicle.getStreamSyncedMeta('crp:musicUrl')) return;
    const at = Math.max(0, Math.min(3600, Number(seconds) || 0));
    const now = Date.now();
    if (now - (seekAt.get(vehicle) ?? 0) < 250) return;
    seekAt.set(vehicle, now);
    meta(vehicle, 'musicAt', now - Math.round(at * 1000));
  });

  mint.onClient('crp:veh:music:add', (player, raw) => handleMusic(player, String(raw ?? '')));
  mint.onClient('crp:veh:music:stop', (player) => {
    const vehicle = driver(player);
    if (vehicle) applyQueue(vehicle, [], 0);
  });
  mint.onClient('crp:veh:music:next', (player) => handleMusic(player, 'next'));
  mint.onClient('crp:veh:music:prev', (player) => handleMusic(player, 'prev'));
  mint.onClient('crp:veh:music:play', (player, index) => {
    const vehicle = driver(player);
    if (!vehicle) return;
    const queue = readQueue(vehicle);
    const at = Math.trunc(Number(index));
    if (!queue.length || at < 0 || at >= queue.length) return;
    applyQueue(vehicle, queue, at);
  });
  mint.onClient('crp:veh:music:remove', (player, index) => {
    const vehicle = driver(player);
    if (!vehicle) return;
    const queue = readQueue(vehicle);
    const at = Math.trunc(Number(index));
    if (at < 0 || at >= queue.length) return;
    const current = Number(vehicle.getStreamSyncedMeta('crp:musicIndex')) || 0;
    queue.splice(at, 1);
    if (!queue.length) return applyQueue(vehicle, [], 0);
    if (at < current) return applyQueue(vehicle, queue, current - 1);
    if (at === current) return applyQueue(vehicle, queue, Math.min(at, queue.length - 1));
    meta(vehicle, 'musicQueue', JSON.stringify(queue));
    meta(vehicle, 'musicIndex', current);
  });
}
