import * as mint from 'mint-client';
import * as native from 'natives';
import { pushCef } from '../cef/view.js';
import { partPoint } from '../factions/index.js';

const COLOR = { r: 255, g: 255, b: 255, a: 100 };
let locked = false;
let checkpoint: mint.Checkpoint | null = null;
let spot = { x: 0, y: 0, z: 0 };
let inside = false;

function dist(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function clearPoint(): void {
  checkpoint?.destroy();
  checkpoint = null;
  inside = false;
  native.setWaypointOff();
}

export function installWinter(): void {
  mint.onServer('crp:winter:lock', (value) => {
    locked = value === true || value === 1;
  });

  mint.onServer('crp:winter:clear', () => {
    clearPoint();
  });

  mint.onServer('crp:winter:point', (x, y, z, nx, ny, nz) => {
    clearPoint();
    const px = Number(x);
    const py = Number(y);
    const pz = Number(z);
    const [found, ground] = native.getGroundZFor3dCoord(px, py, pz, null, false, false);
    const pos = new mint.Vector3(px, py, found ? ground : pz);
    const next = new mint.Vector3(Number(nx) || px, Number(ny) || py, Number(nz) || pz);
    spot = { x: pos.x, y: pos.y, z: pos.z };
    checkpoint = new mint.Checkpoint(
      mint.CheckpointType.CylinderDoubleArrow,
      pos,
      next,
      4,
      4,
      COLOR,
      COLOR,
      2000,
    );
    native.setNewWaypoint(px, py);
  });

  mint.everyTick(() => {
    const local = mint.Player.local;
    if (locked && local?.vehicle) {
      native.disableControlAction(0, 59, true);
      native.disableControlAction(0, 60, true);
      native.disableControlAction(0, 71, true);
      native.disableControlAction(0, 72, true);
    }
    if (!checkpoint || !local) return;
    const hit = checkpoint.isEntityIn(local);
    if (!hit) {
      inside = false;
      return;
    }
    if (inside) return;
    inside = true;
    const vehicle = local.vehicle;
    if (vehicle) {
      const hood = partPoint(vehicle, 'bonnet');
      if (dist(hood, spot) > dist(local.pos, spot)) {
        pushCef(`notifications.warning('Заезжайте капотом вперед');`);
        return;
      }
    }
    mint.emitServer('crp:winter:next');
  });
}
