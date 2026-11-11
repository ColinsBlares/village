import * as mint from 'mint-server';
import { playCatalog, stopAnimation } from '../animations/index.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { table } from '../core/db.js';
import { GROUND_MS, dropFresh } from '../inventory/ground.js';
import { sendInventory } from '../inventory/index.js';
import { rowParams } from '../inventory/items.js';
import { getSession, type DbRow } from '../player/session.js';
import { notifyError } from '../ui/notify.js';
import { addJobExp } from './index.js';

const HEADER = 'Лесоруб';
const TREE_DAMAGE = 10;
const LOG_DAMAGE = 25;
const RESPAWN = 30 * 60 * 1000;
const CHOP_MS = 30 * 1000;
const HIT_MS = 1000;
const CLICK_MS = 180;
const LOG_HIT_MS = 1600;
const REACH = 4;
const SLOT_REACH = 10;

interface Tree {
  id: number;
  health: number;
  dead: number;
  x: number;
  y: number;
  z: number;
  players: Set<mint.Player>;
}

interface Chop {
  treeId: number;
  clicks: number;
  lastClickAt: number;
  damage: number;
  startedAt: number;
}

interface Log {
  id: number;
  squats: number[];
  object: mint.Object;
  shape: mint.Colshape;
  timer: ReturnType<typeof setTimeout>;
  players: Set<mint.Player>;
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  dimension: number;
}

interface Point {
  x: number;
  y: number;
  z: number;
}

interface LogSlot {
  pos: Point;
  rot: Point;
}

const trees = new Map<number, Tree>();
const logs = new Map<number, Log>();
const atTree = new WeakMap<mint.Player, number>();
const atLog = new WeakMap<mint.Player, number>();
const chop = new WeakMap<mint.Player, Chop>();
const logPending = new WeakMap<mint.Player, number>();
const itemsPending = new WeakMap<mint.Player, number>();
const hitAt = new WeakMap<mint.Player, number>();
const logHitAt = new WeakMap<mint.Player, number>();
const tails = new WeakMap<mint.Player, Promise<void>>();

let woodName = 'Древесина';
let woodModel = 'prop_paper_bag_01';

function enqueue(player: mint.Player, job: () => Promise<void>): void {
  const prev = tails.get(player) ?? Promise.resolve();
  const next = prev.then(job, job).catch((err: unknown) => {
    mint.logError(`crp wood: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  });
  tails.set(player, next);
}

function tell(player: mint.Player, text: string): void {
  if (player.valid) notifyError(player, text, HEADER);
}

function here(player: mint.Player, x: number, y: number, z: number, range: number): boolean {
  return player.pos.distanceTo(new mint.Vector3(x, y, z)) <= range;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function revive(tree: Tree): void {
  if (tree.dead && Date.now() - tree.dead > RESPAWN) {
    tree.health = 100;
    tree.dead = 0;
  }
}

async function hands(player: mint.Player): Promise<DbRow | null> {
  const character = getSession(player).character;
  if (!character) return null;
  return (await table('CharacterInventory').findOne({
    where: { playerId: character.id, index: 13, parentId: null },
    include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
  })) as DbRow | null;
}

function isAxe(item: DbRow | null): item is DbRow {
  const id = Number(item?.itemId);
  return id === 70 || id === 76;
}

function axeHealth(item: DbRow): number | null {
  const param = ((item.params ?? []) as DbRow[]).find((row) => row.key === 'health');
  const value = Number(param?.value);
  if (!param || !Number.isFinite(value)) return null;
  return value;
}

function markAxe(item: DbRow): DbRow | null {
  const param = ((item.params ?? []) as DbRow[]).find((row) => row.key === 'health');
  const current = Number(param?.value);
  if (!param || !Number.isFinite(current) || current <= 0) return null;
  param.value = String(clamp(current - 1));
  return param;
}

async function saveAxe(player: mint.Player, param: DbRow): Promise<void> {
  await param.save();
  await sendInventory(player);
}

async function power(player: mint.Player): Promise<number> {
  const character = getSession(player).character;
  if (!character) return 1;
  const rows = (await table('CharacterInventory').findAll({
    where: { playerId: character.id, parentId: null },
    include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
  })) as DbRow[];
  let sum = 0;
  for (const row of rows) {
    const value = Number(rowParams(row).treeDamage);
    if (Number.isFinite(value)) sum += value;
  }
  return 1 + sum / 100;
}

function tellTree(tree: Tree): void {
  for (const player of tree.players) {
    if (player.valid && atTree.get(player) === tree.id) mint.emitClient(player, 'crp:wood:tree:health', tree.health);
  }
}

function tellLog(log: Log, index: number): void {
  const sent = new Set<number>();
  const emit = (player: mint.Player): void => {
    if (!player.valid || sent.has(player.id)) return;
    sent.add(player.id);
    mint.emitClient(player, 'crp:wood:log:health', log.id, index, log.squats[index]);
  };
  for (const player of log.players) emit(player);
  const pos = new mint.Vector3(log.x, log.y, log.z);
  for (const player of mint.Player.all) {
    if (!player.valid || player.dimension !== log.dimension) continue;
    if (player.pos.distanceTo(pos) > 3) continue;
    emit(player);
  }
}

function enterTree(player: mint.Player, tree: Tree): void {
  const prev = atTree.get(player);
  if (prev != null && prev !== tree.id) {
    const old = trees.get(prev);
    old?.players.delete(player);
    const had = chop.get(player);
    chop.delete(player);
    if (had && old && old.health > 0 && player.valid) mint.emitClient(player, 'crp:wood:chop:end', 0);
  }
  revive(tree);
  atTree.set(player, tree.id);
  tree.players.add(player);
  if (player.valid) mint.emitClient(player, 'crp:wood:tree', tree.x, tree.y, tree.z, tree.health);
}

function leaveTree(player: mint.Player): void {
  const id = atTree.get(player);
  if (id == null) return;
  const tree = trees.get(id);
  const had = chop.get(player);
  atTree.delete(player);
  tree?.players.delete(player);
  chop.delete(player);
  if (!player.valid) return;
  if (had && tree && tree.health > 0) mint.emitClient(player, 'crp:wood:chop:end', 0);
  mint.emitClient(player, 'crp:wood:tree:clear');
}

function logPacket(log: Log): string {
  return JSON.stringify({
    id: log.id,
    x: log.x,
    y: log.y,
    z: log.z,
    rx: log.rx,
    ry: log.ry,
    rz: log.rz,
    squats: log.squats,
  });
}

function enterLog(player: mint.Player, log: Log): void {
  if (!player.valid || player.vehicle) return;
  const prev = atLog.get(player);
  if (prev != null && prev !== log.id) logs.get(prev)?.players.delete(player);
  atLog.set(player, log.id);
  log.players.add(player);
  mint.emitClient(player, 'crp:wood:log', logPacket(log));
}

function leaveLog(player: mint.Player, id: number): void {
  if (atLog.get(player) !== id) return;
  atLog.delete(player);
  logs.get(id)?.players.delete(player);
  if (player.valid) mint.emitClient(player, 'crp:wood:log:clear');
}

function destroyLog(id: number): void {
  const log = logs.get(id);
  if (!log) return;
  logs.delete(id);
  clearTimeout(log.timer);
  const inside = [...log.players];
  log.players.clear();
  for (const player of inside) {
    if (atLog.get(player) === id) atLog.delete(player);
    if (player.valid) mint.emitClient(player, 'crp:wood:log:clear');
  }
  if (log.shape.valid) log.shape.destroy();
  if (log.object.valid) log.object.destroy();
}

function spawnLog(player: mint.Player, slot: LogSlot): void {
  const rx = slot.rot.x * (Math.PI / 180);
  const ry = slot.rot.y * (Math.PI / 180);
  const rz = slot.rot.z * (Math.PI / 180);
  let object: mint.Object;
  try {
    object = new mint.Object(mint.hash('prop_fence_log_02'), slot.pos.x, slot.pos.y, slot.pos.z, rx, ry, rz, player.dimension, true);
    object.rot = new mint.Vector3(rx, ry, rz);
    object.frozen = true;
  } catch (err) {
    mint.logError(`crp wood log: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }
  const spot = object.pos;
  const shape = new mint.ColshapeSphere(spot.x, spot.y, spot.z, 3, player.dimension, true);
  const log: Log = {
    id: object.id,
    squats: [100, 100, 100, 100, 100],
    object,
    shape,
    timer: setTimeout(() => destroyLog(object.id), GROUND_MS),
    players: new Set(),
    x: spot.x,
    y: spot.y,
    z: spot.z,
    rx: slot.rot.x,
    ry: slot.rot.y,
    rz: slot.rot.z,
    dimension: player.dimension,
  };
  logs.set(log.id, log);
  setColshapeHandlers(shape, {
    onEnter: (entered) => enterLog(entered, log),
    onExit: (left) => leaveLog(left, log.id),
  });
  for (const near of mint.Player.all) {
    if (!near.valid || near.vehicle || near.dimension !== log.dimension) continue;
    if (!getSession(near).character) continue;
    if (!here(near, log.x, log.y, log.z, 3)) continue;
    enterLog(near, log);
  }
}

async function readyAxe(player: mint.Player): Promise<DbRow | null> {
  const ax = await hands(player);
  if (!player.valid) return null;
  if (!isAxe(ax)) {
    tell(player, 'Возьмите в руки топор');
    return null;
  }
  const hp = axeHealth(ax);
  if (hp == null || hp <= 0) {
    tell(player, 'Топор сломан');
    return null;
  }
  return ax;
}

async function hitTree(player: mint.Player, tree: Tree, damage: number): Promise<'fail' | 'hit' | 'down'> {
  const ax = await readyAxe(player);
  if (!ax || !player.valid) return 'fail';
  if (atTree.get(player) !== tree.id || !here(player, tree.x, tree.y, tree.z, REACH)) return 'fail';
  if (tree.health <= 0) {
    tell(player, 'Дерево исчерпало свой ресурс');
    return 'fail';
  }
  const param = markAxe(ax);
  if (!param) {
    tell(player, 'Топор сломан');
    return 'fail';
  }
  const before = tree.health;
  const next = clamp(before - damage);
  tree.health = next;
  const killed = before > 0 && next <= 0;
  if (killed) {
    tree.dead = Date.now();
    logPending.set(player, tree.id);
  }
  tellTree(tree);
  try {
    await saveAxe(player, param);
  } catch (err) {
    if (tree.health === next) tree.health = before;
    if (killed) {
      tree.dead = 0;
      logPending.delete(player);
    }
    tellTree(tree);
    mint.logError(`crp wood axe: ${err instanceof Error ? err.message : String(err)}`);
    return 'fail';
  }
  if (!killed || !player.valid) return killed ? 'down' : 'hit';
  mint.emitClient(player, 'crp:wood:log:ask');
  void addJobExp(player, 0.05, 7);
  return 'down';
}

async function hitLog(player: mint.Player, log: Log, index: number): Promise<void> {
  const ax = await readyAxe(player);
  const boost = ax ? await power(player) : 1;
  if (!ax || !player.valid || atLog.get(player) !== log.id) return;
  const slot = Math.max(0, Math.min(log.squats.length - 1, index));
  if ((log.squats[slot] ?? 0) <= 0) {
    tell(player, 'Перейдите к другой части бревна');
    return;
  }
  const param = markAxe(ax);
  if (!param) {
    tell(player, 'Топор сломан');
    return;
  }
  const damage = Math.trunc(LOG_DAMAGE * boost);
  const previous = log.squats[slot] ?? 0;
  const before = log.squats.reduce((sum, value) => sum + value, 0);
  const applied = clamp(previous - damage);
  log.squats[slot] = applied;
  const after = log.squats.reduce((sum, value) => sum + value, 0);
  const done = before > 0 && after <= 0;
  if (done) itemsPending.set(player, log.id);
  tellLog(log, slot);
  try {
    await saveAxe(player, param);
  } catch (err) {
    if (log.squats[slot] === applied) log.squats[slot] = previous;
    if (done) itemsPending.delete(player);
    tellLog(log, slot);
    mint.logError(`crp wood axe: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }
  if (!done || !player.valid) return;
  void addJobExp(player, 0.05, 7);
  mint.emitClient(player, 'crp:wood:items:ask');
}

function readLogSlot(raw: unknown): LogSlot | null {
  if (typeof raw !== 'string') return null;
  try {
    const data = JSON.parse(raw) as { pos?: Partial<Point>; rot?: Partial<Point> };
    const x = Number(data.pos?.x);
    const y = Number(data.pos?.y);
    const z = Number(data.pos?.z);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
    return {
      pos: { x, y, z },
      rot: {
        x: Number(data.rot?.x) || 0,
        y: Number(data.rot?.y) || 0,
        z: Number(data.rot?.z) || 0,
      },
    };
  } catch {
    return null;
  }
}

function readItemSlots(raw: unknown): { x: number; y: number; z: number; rZ: number }[] | null {
  if (typeof raw !== 'string') return null;
  try {
    const data = JSON.parse(raw) as { x?: number; y?: number; z?: number; rZ?: number }[];
    if (!Array.isArray(data) || data.length > 5) return null;
    const slots: { x: number; y: number; z: number; rZ: number }[] = [];
    for (const slot of data) {
      const x = Number(slot?.x);
      const y = Number(slot?.y);
      const z = Number(slot?.z);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
      slots.push({ x, y, z, rZ: Number(slot?.rZ) || 0 });
    }
    return slots;
  } catch {
    return null;
  }
}

export function bindTree(id: number, x: number, y: number, z: number, radius: number): void {
  const tree: Tree = { id, health: 100, dead: 0, x, y, z, players: new Set() };
  trees.set(id, tree);
  const shape = new mint.ColshapeSphere(x, y, z, Math.max(1.5, radius || 2), 0, true);
  setColshapeHandlers(shape, {
    onEnter: (player) => enterTree(player, tree),
    onExit: (player) => {
      if (atTree.get(player) === tree.id) leaveTree(player);
    },
  });
}

export async function loadWood(): Promise<void> {
  const row = (await table('InventoryItem').findOne({ where: { id: 131 } })) as DbRow | null;
  if (row?.model) woodModel = String(row.model);
  if (row?.name) woodName = String(row.name);
}

export function installWood(): void {
  mint.on('playerDisconnect', (player) => {
    const treeId = atTree.get(player);
    if (treeId != null) trees.get(treeId)?.players.delete(player);
    const currentLog = atLog.get(player);
    if (currentLog != null) logs.get(currentLog)?.players.delete(player);
    atTree.delete(player);
    atLog.delete(player);
    chop.delete(player);
    logPending.delete(player);
    itemsPending.delete(player);
  });

  mint.onClient('crp:wood:hit', (player) => {
    const at = Date.now();
    enqueue(player, async () => {
      if (!player.valid || !getSession(player).character) return;
      const treeId = atTree.get(player);
      const tree = treeId == null ? undefined : trees.get(treeId);
      if (!tree) return tell(player, 'Вы не у дерева');
      if (chop.has(player)) return;
      if (at - (hitAt.get(player) ?? 0) < HIT_MS) return;
      hitAt.set(player, at);
      if (tree.health <= 0) return tell(player, 'Дерево исчерпало свой ресурс');
      if (!(await readyAxe(player)) || !player.valid) return;
      const damage = Math.max(1, Math.ceil(TREE_DAMAGE * 2 * (await power(player))));
      if (!player.valid || atTree.get(player) !== tree.id || chop.has(player)) return;
      if (tree.health <= 0) return tell(player, 'Дерево исчерпало свой ресурс');
      chop.set(player, { treeId: tree.id, clicks: 0, lastClickAt: 0, damage, startedAt: at });
      mint.emitClient(player, 'crp:wood:chop:start', Math.ceil(tree.health / damage), tree.health);
    });
  });

  mint.onClient('crp:wood:click', (player) => {
    const at = Date.now();
    enqueue(player, async () => {
      if (!player.valid || !getSession(player).character) return;
      const session = chop.get(player);
      const treeId = atTree.get(player);
      const tree = treeId == null ? undefined : trees.get(treeId);
      if (!session || !tree || session.treeId !== tree.id) return;
      if (at - session.startedAt > CHOP_MS) {
        chop.delete(player);
        mint.emitClient(player, 'crp:wood:chop:end', 0);
        return;
      }
      if (!here(player, tree.x, tree.y, tree.z, REACH)) return;
      if (at - session.lastClickAt < CLICK_MS) return;
      session.lastClickAt = at;
      const result = await hitTree(player, tree, session.damage);
      if (!player.valid) return;
      if (result === 'fail') {
        if (!chop.has(player)) return;
        chop.delete(player);
        mint.emitClient(player, 'crp:wood:chop:end', 0);
        return;
      }
      if (result === 'down') {
        chop.delete(player);
        mint.emitClient(player, 'crp:wood:chop:end', 1);
        return;
      }
      if (!chop.has(player)) return;
      session.clicks += 1;
      mint.emitClient(player, 'crp:wood:chop:progress', session.clicks);
    });
  });

  mint.onClient('crp:wood:cancel', (player) => {
    const session = chop.get(player);
    if (!session) return;
    chop.delete(player);
    const tree = trees.get(session.treeId);
    if (tree && tree.health > 0 && atTree.get(player) === tree.id && player.valid) {
      mint.emitClient(player, 'crp:wood:chop:end', 0);
    }
  });

  mint.onClient('crp:wood:log:add', (player, raw) => {
    enqueue(player, async () => {
      if (!player.valid || !getSession(player).character) return;
      const treeId = atTree.get(player);
      if (treeId == null) return tell(player, 'Вы не у дерева');
      const pending = logPending.get(player);
      if (pending == null || pending !== treeId) return;
      logPending.delete(player);
      const slot = readLogSlot(raw);
      if (!slot || !here(player, slot.pos.x, slot.pos.y, slot.pos.z, SLOT_REACH)) return;
      spawnLog(player, slot);
    });
  });

  mint.onClient('crp:wood:log:swing', (player) => {
    enqueue(player, async () => {
      if (!player.valid || atLog.get(player) == null) return;
      if (!(await readyAxe(player)) || !player.valid) return;
      playCatalog(player, 5523);
    });
  });

  mint.onClient('crp:wood:log:stop', (player) => {
    if (player.valid) stopAnimation(player);
  });

  mint.onClient('crp:wood:log:hit', (player, raw) => {
    const at = Date.now();
    enqueue(player, async () => {
      if (player.valid) stopAnimation(player);
      if (!player.valid || !getSession(player).character) return;
      const id = atLog.get(player);
      const log = id == null ? undefined : logs.get(id);
      if (!log) return tell(player, 'Вы не у бревна');
      if (at - (logHitAt.get(player) ?? 0) < LOG_HIT_MS) return;
      logHitAt.set(player, at);
      const index = Math.trunc(Number(raw));
      if (!Number.isFinite(index)) return;
      await hitLog(player, log, index);
    });
  });

  mint.onClient('crp:wood:items:add', (player, raw) => {
    enqueue(player, async () => {
      if (!player.valid || !getSession(player).character) return;
      const current = atLog.get(player);
      if (current == null) return tell(player, 'Вы не у бревна');
      const pending = itemsPending.get(player);
      if (pending == null || pending !== current) return;
      itemsPending.delete(player);
      const slots = readItemSlots(raw);
      if (!slots || !slots.every((slot) => here(player, slot.x, slot.y, slot.z, SLOT_REACH))) return;
      const log = logs.get(current);
      if (!log) return;
      destroyLog(current);
      for (const slot of slots) {
        dropFresh(player, 131, woodName, woodModel, { x: slot.x, y: slot.y, z: slot.z }, (slot.rZ || 0) * (Math.PI / 180));
      }
    });
  });
}
