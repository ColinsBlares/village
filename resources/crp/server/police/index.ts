import * as mint from 'mint-server';
import { allowMove } from '../anticheat/index.js';
import { playAnimation } from '../animations/index.js';
import { giveItem, takeItem } from '../inventory/index.js';
import { getSession } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess, notifyWarning } from '../ui/notify.js';
import { addCash } from '../world/money.js';
import { installPoliceDuty } from './duty.js';

const ARREST_MS = 15 * 60 * 1000;
const ARREST_PAY = 10;
const LS = [
  { x: 461.27, y: -992.37, z: 34.19, h: -3.86 },
  { x: 455.48, y: -993.02, z: 34.19, h: -1.45 },
  { x: 449.42, y: -992.67, z: 34.19, h: -2.37 },
  { x: 449.79, y: -981.04, z: 34.22, h: 176.58 },
  { x: 455.75, y: -981.27, z: 34.22, h: 176.8 },
  { x: 461.74, y: -981.48, z: 34.22, h: 177.07 },
];
const JAIL = [{ x: 1753.02, y: 2623.72, z: 45.56, h: 228.06 }];
const LS_EXIT = { x: 438.56, y: -1001.74, z: 30.72, h: 89.31 };
const JAIL_EXIT = { x: 1845.97, y: 2585.97, z: 45.67, h: 271.52 };
const arrestTimers = new Map<number, ReturnType<typeof setTimeout>>();

const CUFFS = [1, 2, 3, 4, 6, 12, 13, 14];
const COPS = [2, 3, 4];

function nearPlayer(player: mint.Player): mint.Player | null {
  let found: mint.Player | null = null;
  let best = 5;
  for (const other of mint.Player.all) {
    if (other.id === player.id || !other.valid || other.dimension !== player.dimension) continue;
    const distance = player.pos.distanceTo(other.pos);
    if (distance < best) {
      best = distance;
      found = other;
    }
  }
  return found;
}

function setWanted(player: mint.Player, wanted: number): void {
  const character = getSession(player).character;
  if (!character) return;
  const next = Math.max(0, wanted);
  const prev = Number(character.wanted) || 0;
  if (next > prev) {
    character.crimes = (Number(character.crimes) || 0) + (next - prev);
    character.law = (Number(character.law) || 0) - (next - prev);
  }
  character.wanted = next;
  void character.save();
  cef(player, `mp.event.call('hud.setData', ${JSON.stringify({ wanted: next })});`);
}

function nearest(player: mint.Player, cells: typeof LS): (typeof LS)[number] {
  let best = cells[0];
  let distance = player.pos.distanceTo(new mint.Vector3(best.x, best.y, best.z));
  for (const cell of cells) {
    const next = player.pos.distanceTo(new mint.Vector3(cell.x, cell.y, cell.z));
    if (next < distance) {
      distance = next;
      best = cell;
    }
  }
  return best;
}

export function releaseArrest(player: mint.Player): void {
  const type = Number(getSession(player).character?.arrestType) || 0;
  stopArrest(player, type === 1 ? JAIL_EXIT : LS_EXIT);
}

export function arrestPrice(player: mint.Player): number {
  const time = Number(getSession(player).character?.arrestTime) || 0;
  return Math.max(1, Math.ceil(time / ARREST_MS)) * 1000;
}

function stopArrest(player: mint.Player, exit: typeof LS_EXIT): void {
  const character = getSession(player).character;
  if (!character) return;
  const timer = arrestTimers.get(Number(character.id));
  if (timer) clearTimeout(timer);
  arrestTimers.delete(Number(character.id));
  character.arrestTime = 0;
  character.arrestType = 0;
  void character.save();
  if (!player.valid) return;
  allowMove(player);
  player.pos = new mint.Vector3(exit.x, exit.y, exit.z);
  player.rot = new mint.Vector3(0, 0, exit.h * (Math.PI / 180));
  cef(player, `inventory.enable = true; mp.event.call('hud.setData', ${JSON.stringify({ arrestTimeMax: 0 })});`);
}

function beginArrest(target: mint.Player, cell: (typeof LS)[number], time: number, type: number, exit: typeof LS_EXIT): void {
  const character = getSession(target).character;
  if (!character) return;
  if (target.getSyncedMeta('crp:cuffs')) {
    const raw = target.getSyncedMeta('crp:cuffs');
    const back = typeof raw === 'number' && raw > 1 ? raw : 28;
    target.deleteSyncedMeta('crp:cuffs');
    target.setClothes(7, 0, 0, 0);
    void giveItem(target, back);
  }
  setWanted(target, 0);
  character.arrestTime = time;
  character.arrestType = type;
  void character.save();
  allowMove(target);
  target.dimension = 0;
  target.pos = new mint.Vector3(cell.x, cell.y, cell.z);
  target.rot = new mint.Vector3(0, 0, cell.h * (Math.PI / 180));
  cef(target, `inventory.enable = false; mp.event.call('hud.setData', ${JSON.stringify({ arrestTimeMax: Math.floor(time / 1000), wanted: 0 })});`);
  const id = Number(character.id);
  const prev = arrestTimers.get(id);
  if (prev) clearTimeout(prev);
  arrestTimers.set(id, setTimeout(() => stopArrest(target, exit), time));
}

export function resumeArrest(player: mint.Player): void {
  const time = Number(getSession(player).character?.arrestTime) || 0;
  if (time <= 0) return;
  const type = Number(getSession(player).character?.arrestType) || 0;
  if (type === 1) beginArrest(player, JAIL[0], time, 1, JAIL_EXIT);
  else beginArrest(player, LS[0], time, 0, LS_EXIT);
}

export function installPolice(): void {
  installPoliceDuty();
  mint.onClient('crp:police:wanted', (player, targetId) => {
    const character = getSession(player).character;
    const target = mint.Player.getByID(Number(targetId)) ?? nearPlayer(player);
    const other = target ? getSession(target).character : null;
    if (!character || !target?.valid || !other) {
      notifyError(player, 'Гражданин не найден', 'Розыск');
      return;
    }
    const faction = Number(character.factionId) || 0;
    if (!COPS.includes(faction)) {
      notifyError(player, 'Вы не сотрудник полиции/агент', 'Розыск');
      return;
    }
    setWanted(target, (Number(other.wanted) || 0) + 1);
    notifyInfo(target, `${player.name} выдал вам ${other.wanted} ур.`, 'Розыск');
    for (const cop of mint.Player.all) {
      const copCharacter = getSession(cop).character;
      if (!copCharacter || !COPS.includes(Number(copCharacter.factionId) || 0)) continue;
      notifyWarning(cop, `${player.name} выдал ${other.wanted} ур. ${target.name}`, 'Розыск');
    }
  });

  mint.onClient('crp:police:cuffs', async (player, targetId) => {
    const character = getSession(player).character;
    if (!character) return;
    if (player.getSyncedMeta('crp:cuffs')) {
      notifyError(player, 'У вас связаны руки', 'Наручники');
      return;
    }
    const faction = Number(character.factionId) || 0;
    if (!CUFFS.includes(faction)) {
      notifyError(player, 'Нет прав для использования', 'Наручники');
      return;
    }
    const target = mint.Player.getByID(Number(targetId)) ?? nearPlayer(player);
    if (!target?.valid || !getSession(target).character) {
      notifyError(player, 'Гражданин не найден', 'Наручники');
      return;
    }
    if (target.vehicle) {
      notifyError(player, `${target.name} находится в авто`, 'Наручники');
      return;
    }
    if (player.pos.distanceTo(target.pos) > 5) {
      notifyError(player, `${target.name} далеко`, 'Наручники');
      return;
    }
    if (!target.getSyncedMeta('crp:cuffs')) {
      const item = await takeItem(player, [28, 54]);
      if (!item) {
        notifyError(player, 'Предмет не найден', 'Наручники');
        return;
      }
      target.setSyncedMeta('crp:cuffs', Number(item.itemId) || 28);
      target.setClothes(7, Number(getSession(target).character?.gender) === 0 ? 41 : 25, 0, 0);
      playAnimation(target, 'mp_arresting', 'idle', 49);
      notifyInfo(target, `${player.name} задержал вас`, 'Наручники');
      notifySuccess(player, `${target.name} задержан`, 'Наручники');
      return;
    }
    const raw = target.getSyncedMeta('crp:cuffs');
    const back = typeof raw === 'number' && raw > 1 ? raw : 28;
    target.deleteSyncedMeta('crp:cuffs');
    target.setClothes(7, 0, 0, 0);
    playAnimation(target, 'special_ped@tonya@intro', 'idle', 49);
    mint.emitClient(target, 'crp:follow', 0);
    await giveItem(player, back);
    notifyInfo(target, `${player.name} отпустил вас`, 'Наручники');
    notifyInfo(player, `${target.name} отпущен`, 'Наручники');
  });

  mint.onClient('crp:police:cell', async (player, targetId) => {
    await arrest(player, Number(targetId) || 0, 0);
  });
  mint.onClient('crp:police:jail', async (player, targetId) => {
    await arrest(player, Number(targetId) || 0, 1);
  });
  mint.on('playerDisconnect', (player) => {
    const id = Number(getSession(player).character?.id) || 0;
    const timer = arrestTimers.get(id);
    if (timer) clearTimeout(timer);
    arrestTimers.delete(id);
  });
}

async function arrest(player: mint.Player, targetId: number, type: number): Promise<void> {
  const character = getSession(player).character;
  const target = mint.Player.getByID(targetId);
  const other = target ? getSession(target).character : null;
  if (!character || !target?.valid || !other) {
    notifyError(player, 'Гражданин не найден', 'Арест');
    return;
  }
  if (!COPS.includes(Number(character.factionId) || 0)) {
    notifyError(player, 'Вы не сотрудник полиции/агент', 'Арест');
    return;
  }
  if (!(Number(other.wanted) > 0)) {
    notifyError(player, `${target.name} не преступник`, 'Арест');
    return;
  }
  const time = ARREST_MS * (Number(other.wanted) || 1);
  if (type === 1) beginArrest(target, nearest(player, JAIL), time, 1, JAIL_EXIT);
  else beginArrest(target, nearest(player, LS), time, 0, LS_EXIT);
  notifyInfo(target, `${player.name} посадил вас`, 'Арест');
  notifySuccess(player, `Вы посадили ${target.name}`, 'Арест');
  if (await addCash(player, ARREST_PAY)) notifyInfo(player, `+ $${ARREST_PAY}`, 'Бонус');
}
