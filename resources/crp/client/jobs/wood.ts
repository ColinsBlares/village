import * as mint from 'mint-client';
import * as native from 'natives';
import { holding } from '../attaches/index.js';
import { pushCef } from '../cef/view.js';
import { busyAdd, busyHas, busyRemove } from '../ui/busy.js';

const LOG_HEIGHT = 0.3;
const LOG_WIDTH = 4.4;
const ALONG = [-2, -1, 0, 1, 2];

interface Pose {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
}

let tree: { x: number; y: number; z: number } | null = null;
let health = 0;
let chop = false;
let need = 0;
let clicks = 0;
let logId: number | null = null;
let pose: Pose | null = null;
let squats: number[] = [];
let focus = -1;
let logTimer: number | null = null;
let hint = '';

function prompt(name: string): void {
  if (hint === name) return;
  hint = name;
  pushCef(name ? `prompt.showByName(${JSON.stringify(name)});` : 'prompt.hide();');
}

function fail(text: string): void {
  pushCef(`notifications.error(${JSON.stringify(text)}, ${JSON.stringify('Лесоруб')});`);
}

function axe(): boolean {
  return holding('invItem_70') || holding('invItem_76');
}

function text(value: string, x: number, y: number, scale: number, color: number[], centre: boolean, outline: boolean, font = 0): void {
  native.setTextFont(font);
  native.setTextScale(scale, scale);
  native.setTextColour(color[0] ?? 255, color[1] ?? 255, color[2] ?? 255, color[3] ?? 255);
  native.setTextCentre(centre);
  if (outline) native.setTextOutline();
  native.beginTextCommandDisplayText('STRING');
  native.addTextComponentSubstringPlayerName(value);
  native.endTextCommandDisplayText(x, y, 0);
}

function drawBack(x: number, y: number, width: number, height: number, color: number[]): void {
  native.drawRect(x, y, width + 0.004, height + 0.006, 0, 0, 0, 100, false);
  native.drawRect(x, y, width + 0.004, height + 0.006, color[0] ?? 0, color[1] ?? 0, color[2] ?? 0, color[3] ?? 0, false);
  native.drawRect(x, y + height * 0.1, width + 0.004, height * 0.8, 255, 255, 255, 12, false);
}

function drawTree(x: number, y: number, melee: boolean): void {
  const bg = melee ? [255, 76, 76, 150] : [12, 30, 38, 180];
  const fill = health > 50 ? [82, 220, 120, 220] : health > 15 ? [255, 189, 59, 220] : [238, 92, 92, 220];
  const width = 0.14;
  const height = 0.018;
  const border = 0.0007;
  const barX = x - width / 2;
  const fillWidth = Math.max(0, (width * health) / 100);
  drawBack(barX, y, width, height, bg);
  native.drawRect(barX + border, y + border, fillWidth, height - border * 2, fill[0], fill[1], fill[2], fill[3], false);
  native.drawRect(barX + fillWidth - 0.003, y + border * 0.7, 0.003, height - border * 1.4, 255, 255, 255, 210, false);
  text('Дерево', x - width / 2 - 0.02, y - 0.04, 0.16, [210, 235, 245, 210], false, false);
  text(`${health}%`, x + width / 2 + 0.016, y - 0.04 * 0.22, 0.22, [255, 255, 255, 255], false, false);
}

function drawLog(x: number, y: number, index: number): void {
  const hp = squats[index] ?? 0;
  const bg = [10, 22, 31, 120];
  const fill = hp > 50 ? [82, 220, 120, 160] : hp > 15 ? [255, 189, 59, 160] : [238, 92, 92, 160];
  const width = 0.065;
  const height = 0.0135;
  const border = 0.0005;
  const barX = x - width / 2;
  const fillWidth = Math.max(0, (width * hp) / 100);
  if (focus === index) {
    bg[3] = 210;
    fill[3] = 210;
    native.drawRect(barX - 0.005, y - 0.004, width + 0.01, height + 0.01, 90, 225, 200, 70, false);
  }
  drawBack(barX, y, width, height, bg);
  native.drawRect(barX + border, y + border, fillWidth, height - border * 2, fill[0], fill[1], fill[2], fill[3], false);
  text(`${hp}%`, x, y - 0.042 * 0.17, 0.17, [255, 255, 255, 220], false, false);
}

function drawChop(): void {
  const ratio = need > 0 ? Math.min(clicks / need, 1) : 0;
  const x = 0.5;
  const y = 0.84;
  const width = 0.34;
  native.drawRect(x, y, width, 0.115, 7, 20, 25, 220, false);
  native.drawRect(x, y - 0.043, width - 0.006, 0.003, 67, 125, 105, 180, false);
  text('РУБКА ДЕРЕВА', x, y - 0.035, 0.32, [220, 241, 225, 255], true, true, 4);
  text('Кликайте ЛКМ по стволу', x, y - 0.006, 0.27, [201, 220, 210, 255], true, true);
  native.drawRect(x, y + 0.027, width - 0.045, 0.012, 3, 12, 16, 220, false);
  if (ratio > 0) {
    native.drawRect(x - ((width - 0.045) * (1 - ratio)) / 2, y + 0.027, (width - 0.045) * ratio, 0.008, 102, 205, 130, 255, false);
  }
  text(`${clicks} / ${need}`, x, y + 0.043, 0.23, [245, 250, 245, 255], true, true);
}

function screenOf(x: number, y: number, z: number): { x: number; y: number } | null {
  try {
    const screen = mint.worldToScreen(x, y, z);
    const size = native.getActualScreenResolution(0, 0);
    const width = size[1];
    const height = size[2];
    if (!(width > 0) || !(height > 0) || !Number.isFinite(screen.x) || !Number.isFinite(screen.y)) return null;
    return { x: screen.x / width, y: screen.y / height };
  } catch {
    // Точка за камерой.
    return null;
  }
}

function dist(local: mint.Player, pos: { x: number; y: number; z: number }): number {
  return Math.hypot(local.pos.x - pos.x, local.pos.y - pos.y, local.pos.z - pos.z);
}

function facing(local: mint.Player): boolean {
  if (!tree || !local.scriptID) return false;
  try {
    const front = native.getOffsetFromEntityInWorldCoords(local.scriptID, 0, 1, tree.z - local.pos.z);
    const here = dist(local, tree);
    const ahead = Math.hypot(front.x - tree.x, front.y - tree.y, front.z - tree.z);
    return here > ahead;
  } catch {
    return false;
  }
}

function stopChop(send: boolean): void {
  if (!chop) return;
  chop = false;
  need = 0;
  clicks = 0;
  if (send) mint.emitServer('crp:wood:cancel');
}

function stopLog(send: boolean): void {
  if (logTimer == null) return;
  mint.clearTimeout(logTimer);
  logTimer = null;
  busyRemove('jobProcess');
  if (send) mint.emitServer('crp:wood:log:stop');
}

function blockAttack(): void {
  native.disableControlAction(0, 24, true);
  native.disableControlAction(0, 25, true);
  native.disableControlAction(0, 140, true);
  native.disableControlAction(0, 257, true);
}

function findLog(): mint.Object | null {
  if (logId == null) return null;
  const remote = mint.Object.getByRemoteID(logId);
  if (remote?.valid) return remote;
  const byId = mint.Object.getByID(logId);
  if (byId?.valid && byId.isRemote && byId.remoteID === logId) return byId;
  return null;
}

function offsetFrom(base: Pose, ox: number, oy: number, oz: number): { x: number; y: number; z: number } {
  const rotX = (base.rx * Math.PI) / 180;
  const rotY = (base.ry * Math.PI) / 180;
  const rotZ = (base.rz * Math.PI) / 180;
  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const cosZ = Math.cos(rotZ);
  const sinZ = Math.sin(rotZ);
  const rightX = cosZ * cosY - sinZ * sinX * sinY;
  const rightY = cosY * sinZ + cosZ * sinX * sinY;
  const rightZ = -cosX * sinY;
  const forwardX = -cosX * sinZ;
  const forwardY = cosZ * cosX;
  const forwardZ = sinX;
  const upX = cosZ * sinY + cosY * sinZ * sinX;
  const upY = sinZ * sinY - cosZ * cosY * sinX;
  const upZ = cosX * cosY;
  return {
    x: ox * rightX + oy * forwardX + oz * upX + base.x,
    y: ox * rightY + oy * forwardY + oz * upY + base.y,
    z: ox * rightZ + oy * forwardZ + oz * upZ + base.z,
  };
}

function sectors(): { x: number; y: number; z: number }[] {
  const entity = findLog();
  if (entity?.isStreamedIn && entity.scriptID) {
    try {
      return ALONG.map((offset) => {
        const pos = native.getOffsetFromEntityInWorldCoords(entity.scriptID, offset, 0, 0);
        return { x: pos.x, y: pos.y, z: pos.z };
      });
    } catch {
      // Объект ещё без матрицы.
    }
  }
  const fallback = pose;
  if (!fallback) return [];
  return ALONG.map((offset) => offsetFrom(fallback, offset, 0, 0));
}

function logDegrees(): number {
  const entity = findLog();
  if (entity?.isStreamedIn && Number.isFinite(entity.rot.z)) return (entity.rot.z * 180) / Math.PI;
  return pose?.rz ?? 0;
}

function itemSlots(): { x: number; y: number; z: number; rZ: number }[] {
  const yaw = logDegrees() + 20;
  return sectors().map((slot) => ({ x: slot.x, y: slot.y, z: slot.z - LOG_HEIGHT / 2, rZ: yaw }));
}

function aimSector(local: mint.Player): number {
  const slots = sectors();
  if (!slots.length || !local.scriptID) return -1;
  try {
    const feet = native.getOffsetFromEntityInWorldCoords(local.scriptID, 0, 0, -1);
    const front = native.getOffsetFromEntityInWorldCoords(local.scriptID, 0, 0.5, -1);
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < slots.length; i += 1) {
      const slot = slots[i];
      const gap = Math.hypot(feet.x - slot.x, feet.y - slot.y, feet.z - slot.z);
      if (gap < bestDist) {
        bestDist = gap;
        best = i;
      }
    }
    const near = slots[best];
    const feetDist = Math.hypot(feet.x - near.x, feet.y - near.y, feet.z - near.z);
    const frontDist = Math.hypot(front.x - near.x, front.y - near.y, front.z - near.z);
    if (feetDist < frontDist) return -1;
    return best;
  } catch {
    return -1;
  }
}

function freeSlot(): { pos: { x: number; y: number; z: number }; rot: { x: number; y: number; z: number } } | null {
  const local = mint.Player.local;
  if (!local?.valid || !local.scriptID) return null;
  try {
    const ped = local.scriptID;
    const left = native.getOffsetFromEntityInWorldCoords(ped, 2, -LOG_WIDTH / 2, 3);
    const right = native.getOffsetFromEntityInWorldCoords(ped, 2, LOG_WIDTH / 2, 3);
    const [leftFound, leftProbe] = native.getGroundZFor3dCoord(left.x, left.y, left.z, null, false, false);
    const [rightFound, rightProbe] = native.getGroundZFor3dCoord(right.x, right.y, right.z, null, false, false);
    const leftZ = leftFound ? leftProbe : local.pos.z;
    const rightZ = rightFound ? rightProbe : local.pos.z;
    const leftDist = Math.hypot(0, 0, left.z - leftZ);
    const rightDist = Math.hypot(0, 0, right.z - rightZ);
    const alpha = -Math.sin((leftDist - rightDist) / LOG_WIDTH) * (180 / Math.PI);
    const obj = native.getOffsetFromEntityInWorldCoords(ped, 2, 0, 3);
    const [found, probe] = native.getGroundZFor3dCoord(obj.x, obj.y, obj.z, null, false, false);
    return {
      pos: { x: obj.x, y: obj.y, z: (found ? probe : local.pos.z) + LOG_HEIGHT / 2 },
      rot: { x: 0, y: alpha, z: native.getEntityHeading(ped) + 90 },
    };
  } catch {
    return null;
  }
}

function hitLog(): void {
  if (logTimer != null || focus < 0 || logId == null) return;
  if (!axe()) return;
  if (!(squats[focus] > 0)) {
    fail('Перейдите к другой части бревна');
    return;
  }
  const slot = focus;
  busyAdd('jobProcess', false);
  mint.emitServer('crp:wood:log:swing');
  logTimer = mint.setTimeout(() => {
    logTimer = null;
    busyRemove('jobProcess');
    if (logId == null || focus < 0 || !(squats[focus] > 0)) {
      mint.emitServer('crp:wood:log:stop');
      return;
    }
    mint.emitServer('crp:wood:log:hit', slot);
  }, 2000);
}

function syncPrompt(hasAxe: boolean): void {
  if (chop) {
    prompt('');
    return;
  }
  if (logId != null) {
    prompt(hasAxe ? 'woodman_log_start_ax' : 'woodman_log_take_ax');
    return;
  }
  if (tree && health > 0) {
    prompt(hasAxe ? 'woodman_start_ax' : 'woodman_take_ax');
    return;
  }
  prompt('');
}

function readLog(raw: unknown): void {
  if (typeof raw !== 'string') return;
  let data: { id?: number; x?: number; y?: number; z?: number; rx?: number; ry?: number; rz?: number; squats?: number[] };
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    return;
  }
  const id = Number(data.id);
  if (!Number.isFinite(id)) return;
  const same = logId === id;
  if (!same) stopLog(true);
  logId = id;
  pose = {
    x: Number(data.x) || 0,
    y: Number(data.y) || 0,
    z: Number(data.z) || 0,
    rx: Number(data.rx) || 0,
    ry: Number(data.ry) || 0,
    rz: Number(data.rz) || 0,
  };
  squats = Array.isArray(data.squats) ? data.squats.map((value) => Number(value) || 0) : [100, 100, 100, 100, 100];
  if (!same) focus = -1;
}

export function installWood(): void {
  mint.onServer('crp:wood:tree', (x, y, z, value) => {
    tree = { x: Number(x), y: Number(y), z: Number(z) };
    health = Math.max(0, Math.trunc(Number(value) || 0));
  });
  mint.onServer('crp:wood:tree:clear', () => {
    stopChop(true);
    tree = null;
    health = 0;
    if (logId == null) prompt('');
  });
  mint.onServer('crp:wood:tree:health', (value) => {
    health = Math.max(0, Math.trunc(Number(value) || 0));
    if (health <= 0) stopChop(true);
  });
  mint.onServer('crp:wood:chop:start', (required, value) => {
    chop = true;
    need = Math.max(0, Math.trunc(Number(required) || 0));
    clicks = 0;
    health = Math.max(0, Math.trunc(Number(value) || 0));
    prompt('');
  });
  mint.onServer('crp:wood:chop:progress', (value) => {
    if (!chop) return;
    clicks = Math.max(0, Math.trunc(Number(value) || 0));
  });
  mint.onServer('crp:wood:chop:end', (flag) => {
    const success = Number(flag) === 1;
    stopChop(false);
    if (!success && tree && health > 0) fail('Рубка прервана');
  });
  mint.onServer('crp:wood:log:ask', () => {
    const slot = freeSlot();
    if (!slot) return;
    mint.emitServer('crp:wood:log:add', JSON.stringify(slot));
  });
  mint.onServer('crp:wood:log', (raw) => readLog(raw));
  mint.onServer('crp:wood:log:clear', () => {
    stopLog(true);
    logId = null;
    pose = null;
    squats = [];
    focus = -1;
    if (!tree || health <= 0) prompt('');
  });
  mint.onServer('crp:wood:log:health', (id, index, value) => {
    const slot = Math.trunc(Number(index));
    if (focus === slot) stopLog(true);
    if (logId !== Number(id) || slot < 0 || slot >= squats.length) return;
    squats[slot] = Math.max(0, Math.trunc(Number(value) || 0));
  });
  mint.onServer('crp:wood:items:ask', () => {
    const slots = itemSlots();
    if (!slots.length) return;
    mint.emitServer('crp:wood:items:add', JSON.stringify(slots));
  });

  mint.everyTick(() => {
    const local = mint.Player.local;
    if (!local?.valid) return;
    const pressed = native.isControlJustPressed(0, 24) || native.isDisabledControlJustPressed(0, 24);
    const pause = native.isPauseMenuActive();
    const hasAxe = axe();
    syncPrompt(hasAxe);
    if (chop) {
      native.disableControlAction(0, 25, true);
      native.disableControlAction(0, 140, true);
      native.disableControlAction(0, 257, true);
      if (!hasAxe || !tree || dist(local, tree) > 4) {
        stopChop(true);
        return;
      }
      drawChop();
      if (pressed && !pause) mint.emitServer('crp:wood:click');
      return;
    }
    if (!hasAxe) return;
    if (tree) {
      if (facing(local)) {
        const point = screenOf(tree.x, tree.y, tree.z);
        if (point) drawTree(point.x, point.y, local.isInMelee);
      }
    } else {
      blockAttack();
    }
    if (logId != null) {
      if (logTimer == null) focus = aimSector(local);
      const slots = sectors();
      for (let i = 0; i < slots.length; i += 1) {
        const point = screenOf(slots[i].x, slots[i].y, slots[i].z);
        if (point) drawLog(point.x, point.y, i);
      }
      blockAttack();
    }
    if (!pressed || pause || busyHas()) return;
    if (logId != null) {
      hitLog();
      return;
    }
    if (!tree || !facing(local) || dist(local, tree) > 4) return;
    if (health > 0) mint.emitServer('crp:wood:hit');
    else fail('Дерево исчерпало свой ресурс');
  });
}
