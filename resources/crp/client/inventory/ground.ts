import * as mint from 'mint-client';
import * as native from 'natives';
import { pushCef } from '../cef/view.js';
import { busyHas } from '../ui/busy.js';

const GROUND_DIST = 1.8;

function ahead(local: mint.Player, forward: number, side = 0): { x: number; y: number; z: number } {
  const heading = local.rot.z;
  const fx = -Math.sin(heading);
  const fy = Math.cos(heading);
  const sx = Math.cos(heading);
  const sy = Math.sin(heading);
  return {
    x: local.pos.x + fx * forward + sx * side,
    y: local.pos.y + fy * forward + sy * side,
    z: local.pos.z,
  };
}

function dropPos(): { x: number; y: number; z: number } | null {
  const local = mint.Player.local;
  if (!local?.valid) return null;
  const side = local.vehicle ? (local.seat === 1 || local.seat === 0 ? -1 : 1) : 0;
  const forward = local.vehicle ? 0 : 1;
  const spot = ahead(local, forward, side);
  const [, groundZ] = native.getGroundZFor3dCoord(spot.x, spot.y, spot.z + 8, null, false, false);
  if (Number.isFinite(groundZ) && Math.abs(groundZ - spot.z) <= 8) spot.z = groundZ;
  return spot;
}

function nearestGround(): mint.Object | null {
  const local = mint.Player.local;
  if (!local?.valid) return null;
  let best: mint.Object | null = null;
  let min = GROUND_DIST;
  for (const object of mint.Object.streamedIn) {
    if (!object.valid || object.dimension !== local.dimension) continue;
    if (object.getStreamSyncedMeta('crp:ground') == null) continue;
    const dist = local.pos.distanceTo(object.pos);
    if (dist < min) {
      min = dist;
      best = object;
    }
  }
  return best;
}

let nearGround: number | null = null;

function playPickup(): void {
  const ped = mint.Player.local?.scriptID;
  if (!ped) return;
  native.requestAnimDict('anim@mp_snowball');
  let tries = 0;
  const run = (): void => {
    if (native.hasAnimDictLoaded('anim@mp_snowball')) {
      native.taskPlayAnim(ped, 'anim@mp_snowball', 'pickup_snowball', 1, 1, 1500, 1, 0, false, 0, false);
      return;
    }
    if (++tries < 20) mint.setTimeout(run, 25);
  };
  run();
}

function drawName(text: string): void {
  native.setTextFont(0);
  native.setTextScale(0.32, 0.32);
  native.setTextColour(255, 223, 41, 230);
  native.setTextCentre(true);
  native.setTextOutline();
  native.beginTextCommandDisplayText('STRING');
  native.addTextComponentSubstringPlayerName(text);
  native.endTextCommandDisplayText(0, 0, 0);
}

export function installGroundClient(): void {
  mint.everyTick(() => {
    const local = mint.Player.local;
    if (!local?.valid) return;
    for (const object of mint.Object.streamedIn) {
      if (!object.valid || object.dimension !== local.dimension) continue;
      if (object.getStreamSyncedMeta('crp:ground') == null) continue;
      if (local.pos.distanceTo(object.pos) > 3) continue;
      const name = object.getStreamSyncedMeta('crp:groundName');
      if (typeof name !== 'string' || !name) continue;
      native.setDrawOrigin(object.pos.x, object.pos.y, object.pos.z + 0.15, false);
      drawName(name);
      native.clearDrawOrigin();
    }
    if (local.vehicle) return;
    const near = nearestGround();
    if (!near) return;
    native.drawMarker(
      2,
      near.pos.x, near.pos.y, near.pos.z + 0.5,
      0, 0, 0,
      0, 180, 0,
      0.15, 0.15, 0.15,
      255, 223, 41, 255,
      false, true, 2, false, null, null, false,
    );
  });
  mint.setInterval(() => {
    const obj = nearestGround();
    const id = obj?.id ?? null;
    if (id === nearGround) return;
    nearGround = id;
    pushCef(id != null ? 'prompt.showByName("item_take");' : 'prompt.hide();');
  }, 400);

  mint.on('keyup', (key) => {
    if (key !== 69 || busyHas() || mint.Player.local?.vehicle) return;
    const obj = nearestGround();
    if (!obj) return;
    playPickup();
    mint.emitServer('crp:item:ground:take', obj.id);
  });
}

export function groundPutPos(): string | null {
  const pos = dropPos();
  return pos ? JSON.stringify(pos) : null;
}
