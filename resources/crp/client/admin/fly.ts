import * as mint from 'mint-client';
import * as native from 'natives';
import { pushCef, uiFocused } from '../cef/view.js';

let level = 0;
let cam = 0;
let nextSync = 0;

export function isFlying(): boolean {
  return cam !== 0;
}

function finite(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value) < 20000;
}

function direction(rot: { x: number; z: number }): { x: number; y: number; z: number } {
  const pitch = rot.x * (Math.PI / 180);
  const yaw = rot.z * (Math.PI / 180);
  const cos = Math.abs(Math.cos(pitch));
  return { x: -Math.sin(yaw) * cos, y: Math.cos(yaw) * cos, z: Math.sin(pitch) };
}

function cross(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function unit(v: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const mag = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
}

function hold(local: mint.Player, on: boolean): void {
  native.freezeEntityPosition(local.scriptID, on);
  native.setEntityInvincible(local.scriptID, on, false);
  native.setEntityVisible(local.scriptID, !on, false);
  native.setEntityCollision(local.scriptID, !on, false);
}

function start(): void {
  const local = mint.Player.local;
  if (!local?.valid) return;
  const rot = native.getGameplayCamRot(2);
  if (!finite(rot.x) || !finite(rot.z)) return;
  const created = native.createCamWithParams('DEFAULT_SCRIPTED_CAMERA', local.pos.x, local.pos.y, local.pos.z, rot.x, rot.y, rot.z, 45, false, 2);
  if (!created) return;
  cam = created;
  native.setCamActive(cam, true);
  native.renderScriptCams(true, false, 0, true, false, 0);
  hold(local, true);
  nextSync = Date.now() + 250;
  mint.emitServer('crp:admin:fly', 1);
  pushCef(`notifications.success('Режим полета включен', 'Fly mode');`);
}

function stop(): void {
  const local = mint.Player.local;
  const coord = cam ? native.getCamCoord(cam) : null;
  const rot = cam ? native.getCamRot(cam, 2) : null;
  if (cam) {
    native.setCamActive(cam, false);
    native.destroyCam(cam, true);
    cam = 0;
  }
  native.renderScriptCams(false, false, 0, true, false, 0);
  if (local?.valid) {
    hold(local, false);
    if (coord && rot && finite(coord.x) && finite(coord.y) && finite(coord.z)) {
      mint.emitServer('crp:admin:fly', 0, coord.x, coord.y, coord.z, rot.z * (Math.PI / 180));
    } else mint.emitServer('crp:admin:fly', 0);
  }
  pushCef(`notifications.success('Режим полета отключен', 'Fly mode');`);
}

export function installFly(): void {
  mint.onServer('crp:admin:level', (value) => {
    level = Number(value) || 0;
    if (level <= 0 && cam) stop();
  });
  mint.on('keyup', (key) => {
    if (key !== 0x71) return;
    if (level <= 0) return;
    if (cam) stop();
    else start();
  });
  mint.everyTick(() => {
    if (!cam || uiFocused()) return;
    const local = mint.Player.local;
    if (!local?.valid) return;
    hold(local, true);
    const fast = mint.isKeyDown(16) ? 3 : 1;
    const slow = mint.isKeyDown(17) ? 0.5 : 1;
    const rot = native.getCamRot(cam, 2);
    const lookX = native.getDisabledControlNormal(0, 220);
    const lookY = native.getDisabledControlNormal(0, 221);
    const moveX = native.getDisabledControlNormal(0, 218);
    const moveY = native.getDisabledControlNormal(0, 219);
    const pos = native.getCamCoord(cam);
    if (!finite(pos.x) || !finite(pos.y) || !finite(pos.z)) return;
    const forward = direction(rot);
    const scale = moveY * fast * slow;
    const side = unit(cross(unit(forward), { x: 0, y: 0, z: 1 }));
    const strafe = moveX * 0.5;
    const up = mint.isKeyDown(69) ? 0.5 : 0;
    const down = mint.isKeyDown(81) ? 0.5 : 0;
    native.setCamCoord(
      cam,
      pos.x - forward.x * scale + side.x * strafe,
      pos.y - forward.y * scale + side.y * strafe,
      pos.z - forward.z * scale + side.z * strafe + up - down,
    );
    native.setCamRot(cam, rot.x + lookY * -5, 0, rot.z + lookX * -5, 2);
    const now = Date.now();
    if (now < nextSync) return;
    nextSync = now + 250;
    const here = native.getCamCoord(cam);
    if (!finite(here.x) || !finite(here.y) || !finite(here.z) || here.z < -200 || here.z > 3000) return;
    mint.emitServer('crp:admin:fly:pos', here.x, here.y, here.z);
  });
}
