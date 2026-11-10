import * as mint from 'mint-server';
import { getSession } from './session.js';

export const PRELOAD = { x: -1685.21, y: -1653.46, z: 183.55 };

const queue: mint.Player[] = [];
let ready = false;
let sessionReady: ((player: mint.Player) => void) | null = null;
let worldSpawn: ((player: mint.Player) => void) | null = null;

/** Игрок заспавнен в прелоаде и клиент получил crp:init. */
export function onSessionReady(hook: (player: mint.Player) => void): void {
  sessionReady = hook;
}

/** playerSpawn после выбора персонажа, фаза enter. */
export function onWorldSpawn(hook: (player: mint.Player) => void): void {
  worldSpawn = hook;
}

function enqueue(player: mint.Player): void {
  if (!queue.includes(player)) queue.push(player);
}

function drop(player: mint.Player): void {
  const index = queue.indexOf(player);
  if (index !== -1) queue.splice(index, 1);
}

function hold(player: mint.Player): void {
  if (!player.valid || player.isSpawned) return;
  getSession(player);
  player.model = 'mp_m_freemode_01';
  player.dimension = player.id + 1;
  player.maxHealth = 100;
  player.maxArmour = 100;
  player.invincible = true;
  player.frozen = true;
  player.visible = false;
  player.setSyncedMeta('crp:phase', 'preload');
  player.spawn(PRELOAD.x, PRELOAD.y, PRELOAD.z);
}

function release(player: mint.Player): void {
  if (!player.valid) return;
  const session = getSession(player);
  if (session.initSent) return;
  // Пока спавн не подтверждён, повторная запись dimension отклоняется сервером.
  if (!player.isSpawned) {
    session.pendingInit = true;
    return;
  }
  session.pendingInit = false;
  session.initSent = true;
  mint.emitClient(player, 'crp:init');
  sessionReady?.(player);
}

export function markReady(): void {
  ready = true;
  const waiting = queue.splice(0);
  for (const player of waiting) release(player);
}

export function endPreload(player: mint.Player): void {
  if (!player.valid) return;
  player.visible = true;
  player.frozen = false;
  player.invincible = false;
  player.setSyncedMeta('crp:phase', 'world');
  mint.emitClient(player, 'crp:preloadEnd');
}

export function installPlayers(): void {
  mint.on('playerConnect', (player) => {
    hold(player);
  });

  mint.on('playerSpawn', (player) => {
    if (!player.valid || !player.isSpawned) return;
    const phase = player.getSyncedMeta('crp:phase');
    if (phase === 'preload') {
      player.health = player.maxHealth;
      player.armour = 0;
      player.frozen = true;
      player.invincible = true;
      player.visible = false;
      if (getSession(player).pendingInit) release(player);
      return;
    }
    if (phase === 'enter') worldSpawn?.(player);
  });

  mint.on('playerDisconnect', (player) => {
    drop(player);
  });

  mint.onClient('crp:join', (player) => {
    if (!player?.valid) return;
    if (!ready) {
      enqueue(player);
      return;
    }
    release(player);
  });
}
