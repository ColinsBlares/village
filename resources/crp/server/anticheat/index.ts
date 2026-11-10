import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { getSession, type DbRow } from '../player/session.js';
import { notifyError } from '../ui/notify.js';

const UNARMED = 2725352035;
const PARACHUTE = 4222310262;
const OBJECT_WEAPON = 966099553;
const PING_INTERVAL = 15000;
const PING_MISSES = 3;
const COOLDOWN = 10000;
const GRACE = 2000;

const PARAMS: [string, number, string, string][] = [
  ['weapon', 1, 'kick', 'Оружие не из слота рук'],
  ['ammo', 1, 'kick', 'Патронов больше, чем в предмете'],
  ['health', 1, 'notify', 'Лечение без серверного источника'],
  ['godmode', 1, 'kick', 'Урон не снимает здоровье'],
  ['armour', 1, 'notify', 'Броня без надетого бронежилета'],
  ['teleport', 1, 'kick', 'Скачок позиции'],
  ['speed', 1, 'notify', 'Скорость пешком выше спринта'],
  ['explosion', 1, 'kick', 'Взрыв без оружия'],
  ['projectile', 1, 'kick', 'Снаряд без оружия в руках'],
  ['vehicle', 1, 'notify', 'Вход в машину без серверного ключа'],
  ['repair', 1, 'notify', 'Починка машины без сервиса'],
  ['jail', 1, 'kick', 'Выход из тюрьмы или КПЗ'],
  ['flood', 1, 'kick', 'Флуд репортов и взрывов'],
  ['native', 1, 'kick', 'Событие чит-детекта'],
  ['rules', 0, 'notify', 'Провал max-ping / min-fps / max-packet-loss'],
  ['spectate', 1, 'notify', 'Режим наблюдения'],
  ['damage', 1, 'kick', 'Аномальный исходящий урон'],
  ['invisible', 1, 'notify', 'Локальная невидимость'],
  ['model', 0, 'notify', 'Смена модели игрока'],
  ['fly', 1, 'kick', 'Набор высоты без транспорта и парашюта'],
  ['warp', 1, 'kick', 'Посадка в машину с большого расстояния'],
  ['flycar', 1, 'notify', 'Наземная машина набирает высоту'],
  ['firerate', 1, 'kick', 'Очередь быстрее темпа оружия'],
  ['range', 1, 'kick', 'Попадание дальше дистанции оружия'],
  ['modifier', 1, 'kick', 'Множитель урона, бега или бесконечные патроны'],
  ['freecam', 1, 'notify', 'Камера далеко от педа'],
  ['heartbeat', 1, 'kick', 'Клиентский античит не отвечает'],
  ['peace', 1, 'kick', 'Урон или выстрел в мирной зоне'],
  ['cuffs', 1, 'kick', 'Действие в наручниках'],
  ['money', 1, 'kick', 'Деньги или предмет мимо серверного сценария'],
  ['job', 1, 'kick', 'Награда работы раньше таймера'],
  ['logspam', 1, 'kick', 'Клиентский logger.log'],
];

const CLIENT_REPORTS = ['weapon', 'jail', 'spectate', 'invisible', 'godmode', 'damage', 'modifier', 'freecam', 'rules', 'health'];
const SOFT = new Set(['spectate', 'invisible', 'godmode', 'damage', 'freecam', 'rules', 'health']);
const JAIL = [
  { x: 455.7, y: -986.9, z: 34.2, r: 50 },
  { x: 1689.79, y: 2598.76, z: 45.56, r: 300 },
  { x: -439.45, y: 5989.65, z: 31.72, r: 25 },
];

interface Param extends DbRow {
  name: string;
  enable: number | boolean;
  punish: string;
  description: string;
}

interface Spot {
  x: number;
  y: number;
  z: number;
}

interface State {
  ready: boolean;
  kicked: boolean;
  godmode: boolean;
  vanished: boolean;
  noclip: boolean;
  peace: boolean;
  pos: Spot | null;
  posAt: number;
  dim: number;
  inVeh: boolean;
  moveGrace: number;
  loginUntil: number;
  aim: Spot | null;
  aimUntil: number;
  jump: { from: Spot; reason: string } | null;
  speedTicks: number;
  flyTicks: number;
  flyFrom: Spot | null;
  health: number | null;
  healGrace: number;
  armour: number | null;
  armourGrace: number;
  godTicks: number;
  preHealth: number | null;
  triggers: Record<string, number>;
  reports: { start: number; count: number } | null;
  pingNonce: number | null;
  pingAt: number;
  pingMisses: number;
  weapons: number[];
}

const params: Param[] = [];
const serials = new Set<string>();
const clubs = new Set<string>();
const states = new WeakMap<mint.Player, State>();

function emptyState(): State {
  return {
    ready: false,
    kicked: false,
    godmode: false,
    vanished: false,
    noclip: false,
    peace: false,
    pos: null,
    posAt: 0,
    dim: 0,
    inVeh: false,
    moveGrace: 0,
    loginUntil: 0,
    aim: null,
    aimUntil: 0,
    jump: null,
    speedTicks: 0,
    flyTicks: 0,
    flyFrom: null,
    health: null,
    healGrace: 0,
    armour: null,
    armourGrace: 0,
    godTicks: 0,
    preHealth: null,
    triggers: {},
    reports: null,
    pingNonce: null,
    pingAt: 0,
    pingMisses: 0,
    weapons: [],
  };
}

function stateOf(player: mint.Player): State {
  let state = states.get(player);
  if (!state) {
    state = emptyState();
    states.set(player, state);
  }
  return state;
}

function spot(player: mint.Player): Spot {
  return { x: player.pos.x, y: player.pos.y, z: player.pos.z };
}

function distXY(a: Spot, b: Spot): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function emptyWeapon(hash: number): boolean {
  const value = hash >>> 0;
  return value === 0 || value === UNARMED || value === PARACHUTE || value === OBJECT_WEAPON;
}

function enabled(name: string): boolean {
  return params.some((param) => param.name === name && param.enable);
}

function punishOf(name: string): string {
  return params.find((param) => param.name === name)?.punish || 'notify';
}

function tellAdmins(text: string): void {
  for (const player of mint.Player.all) {
    if ((Number(getSession(player).character?.admin) || 0) > 0) mint.emitClient(player, 'crp:chat', text);
  }
}

function flag(player: mint.Player, name: string, reason: string, soft = false): void {
  const state = stateOf(player);
  if (!player.valid || state.kicked || !enabled(name)) return;
  const now = Date.now();
  let punish = punishOf(name);
  if (soft || !['notify', 'kick', 'ban'].includes(punish)) punish = 'notify';
  if (punish === 'notify' && state.triggers[name] && now - state.triggers[name] < COOLDOWN) return;
  state.triggers[name] = now;
  const text = `!{#ff0000} ANTICHEAT (${name}): ${getSession(player).character?.name ?? player.name}[${player.id}] (${reason.slice(0, 100)})${punish === 'notify' ? '' : ` ${punish}`}`;
  mint.log(`crp: ${text}`);
  tellAdmins(text);
  if (punish === 'ban') void ban(player, `${name}: ${reason}`);
  if (punish === 'kick' || punish === 'ban') {
    state.kicked = true;
    player.kick('Anticheat');
  }
}

async function ban(player: mint.Player, reason: string): Promise<void> {
  const serial = player.hwidHash ? String(player.hwidHash).slice(0, 128) : null;
  const rgscId = player.socialID ? String(player.socialID).slice(0, 64) : null;
  if (serial) serials.add(serial);
  if (rgscId) clubs.add(rgscId);
  await table('AntiCheatBan').create({
    serial,
    rgscId,
    ip: player.ip ? String(player.ip).slice(0, 64) : null,
    reason: reason.slice(0, 128),
    name: String(player.name).slice(0, 64),
    date: new Date(),
  });
}

export function blockedReason(player: mint.Player): string | null {
  if ((player.hwidHash && serials.has(player.hwidHash)) || (player.socialID && clubs.has(player.socialID))) return 'бан';
  return null;
}

export function allowWeapon(player: mint.Player, hash: number): void {
  const state = stateOf(player);
  const value = hash >>> 0;
  if (!state.weapons.includes(value)) state.weapons.push(value);
}

export function denyWeapon(player: mint.Player, hash: number): void {
  const state = stateOf(player);
  const value = hash >>> 0;
  state.weapons = state.weapons.filter((item) => item !== value);
}

export function allowMove(player: mint.Player, ms = GRACE): void {
  const state = stateOf(player);
  state.moveGrace = Math.max(state.moveGrace, Date.now() + ms);
  state.pos = null;
  state.jump = null;
  state.flyFrom = null;
}

export function allowHeal(player: mint.Player, ms = GRACE): void {
  const state = stateOf(player);
  state.healGrace = Math.max(state.healGrace, Date.now() + ms);
  state.preHealth = null;
  state.godTicks = 0;
}

export function allowArmour(player: mint.Player, ms = GRACE): void {
  const state = stateOf(player);
  state.armourGrace = Math.max(state.armourGrace, Date.now() + ms);
}

export function godmodeOn(player: mint.Player): boolean {
  return !!states.get(player)?.godmode;
}

export function setGodmode(player: mint.Player, on: boolean): void {
  stateOf(player).godmode = on;
  player.invincible = on;
  player.emit('crp:ac:god', on);
}

export function setPeace(player: mint.Player, on: boolean): void {
  stateOf(player).peace = on;
}

export function inPeace(player: mint.Player): boolean {
  return !!states.get(player)?.peace;
}

export function setVanished(player: mint.Player, on: boolean): void {
  stateOf(player).vanished = on;
}

export function setNoclip(player: mint.Player, on: boolean, pos?: { x: number; y: number; z: number; h: number }): void {
  if ((Number(getSession(player).character?.admin) || 0) <= 0) return;
  const state = stateOf(player);
  state.noclip = on;
  allowMove(player, on ? 60000 : 3000);
  if (on || !pos) return;
  player.pos = new mint.Vector3(pos.x, pos.y, pos.z);
  player.rot = new mint.Vector3(0, 0, pos.h);
  remember(player, state, Date.now());
}

export function moveNoclip(player: mint.Player, x: number, y: number, z: number): void {
  const state = states.get(player);
  if (!state?.noclip || !player.valid) return;
  if (![x, y, z].every((value) => Number.isFinite(value) && Math.abs(value) < 20000)) return;
  if (z < -200 || z > 3000) return;
  player.pos = new mint.Vector3(x, y, z);
  remember(player, state, Date.now());
}

function remember(player: mint.Player, state: State, now: number): void {
  state.pos = spot(player);
  state.posAt = now;
  state.dim = player.dimension;
  state.inVeh = player.vehicle != null;
  state.jump = null;
  state.flyFrom = null;
  state.speedTicks = 0;
  state.flyTicks = 0;
}

function rollback(player: mint.Player, state: State, name: string, reason: string, from: Spot, now: number): void {
  player.pos = new mint.Vector3(from.x, from.y, from.z);
  state.pos = from;
  state.posAt = now;
  state.moveGrace = now + GRACE;
  flag(player, name, reason);
}

function checkWeapon(player: mint.Player, state: State): void {
  if (!enabled('weapon')) return;
  const hash = player.currentWeapon >>> 0;
  if (emptyWeapon(hash) || state.weapons.includes(hash)) return;
  try {
    player.currentWeapon = UNARMED;
  } catch {
    // Текущее оружие только для чтения у этой сборки.
  }
  flag(player, 'weapon', `оружие ${hash} не выдавалось сервером`);
}

function checkHealth(player: mint.Player, state: State, now: number): void {
  const hp = player.health;
  const grace = now < state.healGrace;
  const exempt = state.godmode || player.getSyncedMeta('crp:knocked') != null;
  if (state.preHealth != null) {
    const previous = state.preHealth;
    state.preHealth = null;
    if (!grace && !exempt && hp >= previous) {
      if (++state.godTicks >= 3) {
        state.godTicks = 0;
        flag(player, 'godmode', `урон не снимает здоровье (${hp})`);
      }
    } else state.godTicks = 0;
  }
  if (state.health == null || grace) {
    state.health = Math.min(hp, 100);
    return;
  }
  if (hp > state.health + 1 && enabled('health')) {
    const legal = Math.min(state.health, 100);
    player.health = legal;
    flag(player, 'health', `здоровье ${legal} -> ${hp}`, true);
    return;
  }
  state.health = Math.min(hp, 100);
}

function checkArmour(player: mint.Player, state: State, now: number): void {
  const armour = player.armour;
  if (state.armour == null || now < state.armourGrace) {
    state.armour = Math.min(armour, 100);
    return;
  }
  if (armour > state.armour + 1 && enabled('armour')) {
    const legal = Math.min(state.armour, 100);
    player.armour = legal;
    flag(player, 'armour', `броня ${legal} -> ${armour}`, true);
    return;
  }
  state.armour = Math.min(armour, 100);
}

function checkMove(player: mint.Player, state: State, now: number): void {
  const cur = spot(player);
  const vehicle = player.vehicle != null;
  if (state.noclip) return remember(player, state, now);
  const skip = now < state.moveGrace || state.godmode || player.health <= 0 || player.getSyncedMeta('crp:knocked') != null
    || player.dimension !== state.dim || vehicle !== state.inVeh;
  if (!state.pos || skip) return remember(player, state, now);
  if (state.jump) {
    const jump = state.jump;
    state.jump = null;
    return rollback(player, state, 'teleport', jump.reason, jump.from, now);
  }
  const dt = Math.max(0.5, (now - state.posAt) / 1000);
  const dxy = distXY(cur, state.pos);
  const dz = cur.z - state.pos.z;
  const parachute = (player.currentWeapon >>> 0) === PARACHUTE;
  const limit = vehicle ? 200 : 40;
  const falling = dz < 0 && dxy < 15 * dt;
  const jumped = dxy > limit * dt || (!vehicle && !falling && Math.abs(dz) > 25 * dt);
  if (jumped && enabled('teleport')) {
    if (now < state.loginUntil) return remember(player, state, now);
    if (state.aim && now < state.aimUntil && distXY(cur, state.aim) < 50) return remember(player, state, now);
    state.jump = { from: state.pos, reason: `${Math.round(dxy)} м по XY, ${Math.round(dz)} м по Z${vehicle ? ' в машине' : ''}` };
    return;
  }
  if (!vehicle) {
    if (!parachute && dxy / dt > 12) {
      if (++state.speedTicks >= 3) {
        state.speedTicks = 0;
        flag(player, 'speed', `${Math.round(dxy / dt)} м/с пешком`, true);
      }
    } else state.speedTicks = 0;
    if (!parachute && dz > 6 * dt && dxy < 20 * dt) {
      if (!state.flyFrom) state.flyFrom = state.pos;
      if (++state.flyTicks >= 2 && enabled('fly')) {
        const from = state.flyFrom;
        state.flyFrom = null;
        state.flyTicks = 0;
        return rollback(player, state, 'fly', `+${Math.round(dz)} м по Z пешком`, from, now);
      }
    } else {
      state.flyTicks = 0;
      state.flyFrom = null;
    }
  }
  state.pos = cur;
  state.posAt = now;
}

function checkJail(player: mint.Player, state: State): void {
  if (!enabled('jail')) return;
  const character = getSession(player).character;
  const time = Number(character?.arrestTime) || 0;
  const jail = JAIL[Number(character?.arrestType) || 0];
  if (!time || !jail || Date.now() < state.moveGrace) return;
  const distance = distXY(spot(player), jail);
  if (distance > jail.r + 15) flag(player, 'jail', `${Math.round(distance)} м от тюрьмы #${character?.arrestType}`);
}

function heartbeat(player: mint.Player, state: State, now: number): void {
  if (now < state.pingAt) return;
  if (state.pingNonce != null && ++state.pingMisses >= PING_MISSES) {
    state.pingMisses = 0;
    flag(player, 'heartbeat', `нет ответа ${PING_MISSES * PING_INTERVAL / 1000} с`);
  }
  state.pingNonce = Math.floor(Math.random() * 2147483647);
  state.pingAt = now + PING_INTERVAL;
  player.emit('crp:ac:ping', state.pingNonce);
}

function tick(): void {
  const now = Date.now();
  for (const player of mint.Player.all) {
    const state = states.get(player);
    if (!player.valid || !state?.ready || state.kicked || !getSession(player).character) continue;
    try {
      checkWeapon(player, state);
      checkHealth(player, state, now);
      checkArmour(player, state, now);
      if (state.kicked) continue;
      checkMove(player, state, now);
      checkJail(player, state);
      heartbeat(player, state, now);
    } catch (err) {
      mint.log(`crp: античит ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

export function armPlayer(player: mint.Player): void {
  const now = Date.now();
  const state = stateOf(player);
  state.ready = true;
  state.loginUntil = now + 8000;
  state.moveGrace = state.loginUntil;
  state.healGrace = now + 5000;
  state.armourGrace = now + 5000;
  state.pingAt = now + PING_INTERVAL;
  state.pos = null;
  const flags: Record<string, boolean> = {};
  for (const param of params) flags[param.name] = !!param.enable;
  player.emit('crp:ac:init', JSON.stringify(flags));
}

export async function loadAnticheat(): Promise<number> {
  const rows = (await table('AntiCheatParam').findAll()) as Param[];
  params.splice(0, params.length, ...rows);
  for (const [name, enable, punish, description] of PARAMS) {
    if (params.some((param) => param.name === name)) continue;
    const created = (await table('AntiCheatParam').create({ name, enable, punish, description })) as Param;
    params.push(created);
  }
  const bans = (await table('AntiCheatBan').findAll()) as DbRow[];
  serials.clear();
  clubs.clear();
  for (const banRow of bans) {
    if (banRow.serial) serials.add(String(banRow.serial));
    if (banRow.rgscId) clubs.add(String(banRow.rgscId));
  }
  mint.log(`crp: античит параметров ${params.length}, банов ${bans.length}`);
  return params.length;
}

export function installAnticheat(): void {
  setInterval(tick, 1000);
  mint.on('playerDamage', (player, _attacker, healthDamage) => {
    const state = states.get(player);
    if (!state?.ready) return;
    state.preHealth = player.health + (Number(healthDamage) || 0);
  });
  mint.on('playerWeaponChange', (player, _oldWeapon, weapon) => {
    const state = states.get(player);
    if (!state?.ready || !getSession(player).character) return;
    if (emptyWeapon(weapon) || state.weapons.includes(weapon >>> 0)) return;
    if (!enabled('weapon')) return;
    flag(player, 'weapon', `оружие ${weapon >>> 0} не выдавалось сервером`);
  });
  mint.onClient('crp:ac:pong', (player, nonce) => {
    const state = states.get(player);
    if (!state || state.pingNonce == null || Number(nonce) !== state.pingNonce) return;
    state.pingNonce = null;
    state.pingMisses = 0;
  });
  mint.onClient('crp:ac:report', (player, name) => {
    const state = states.get(player);
    if (!state?.ready || typeof name !== 'string' || !CLIENT_REPORTS.includes(name)) return;
    const now = Date.now();
    if (!state.reports || now - state.reports.start > 5000) state.reports = { start: now, count: 0 };
    if (++state.reports.count > 10) return flag(player, 'flood', 'флуд anticheat.report');
    if (name === 'weapon') return checkWeapon(player, state);
    if (name === 'jail') return checkJail(player, state);
    if (name === 'godmode' && state.godmode) return;
    if (['spectate', 'invisible', 'freecam'].includes(name) && state.vanished) return;
    flag(player, name, 'сигнал клиента', SOFT.has(name));
  });
  mint.on('playerDisconnect', (player) => states.delete(player));
}

export function anticheatNotice(player: mint.Player, text: string): void {
  notifyError(player, text, 'Античит');
}
