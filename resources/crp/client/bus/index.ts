import * as mint from 'mint-client';
import * as native from 'natives';

let checkpoint: mint.Checkpoint | null = null;
let blip: mint.PointBlip | null = null;
let wait: number | null = null;
let inside = false;
let active = false;

function clearPoint(): void {
  if (wait != null) mint.clearTimeout(wait);
  wait = null;
  checkpoint?.destroy();
  checkpoint = null;
  blip?.destroy();
  blip = null;
  inside = false;
}

function drawLabel(text: string, x: number, y: number, z: number): void {
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    native.setDrawOrigin(x, y, z, false);
    native.setTextFont(0);
    native.setTextScale(0.35, 0.35);
    native.setTextColour(255, 255, 255, 255);
    native.setTextOutline();
    native.setTextCentre(true);
    native.beginTextCommandDisplayText('STRING');
    native.addTextComponentSubstringPlayerName(line.trim());
    native.endTextCommandDisplayText(0, index * 0.028, 0);
    native.clearDrawOrigin();
  });
}

export function installBusClient(): void {
  mint.onServer('crp:bus:point', (x, y, z, stop, delay) => {
    clearPoint();
    active = true;
    const px = Number(x);
    const py = Number(y);
    const pz = Number(z);
    const color = Number(stop) ? { r: 30, g: 206, b: 255, a: 255 } : { r: 255, g: 246, b: 0, a: 255 };
    const tint = Number(stop) ? 26 : 71;
    wait = mint.setTimeout(() => {
      wait = null;
      const pos = new mint.Vector3(px, py, pz);
      checkpoint = new mint.Checkpoint(mint.CheckpointType.CylinderWrench, pos, pos, 10, 10, color, color, 2000);
      blip = new mint.PointBlip(px, py, pz);
      blip.sprite = 1 as typeof blip.sprite;
      blip.color = tint;
      blip.name = 'Остановка';
      blip.route = true;
      native.setNewWaypoint(px, py);
    }, Math.max(0, Number(delay) || 0));
  });

  mint.onServer('crp:bus:clear', () => {
    active = false;
    clearPoint();
  });

  mint.on('keydown', (key) => {
    if (key !== 117 || !active) return;
    const local = mint.Player.local;
    if (!local?.vehicle) return;
    mint.emitServer('crp:bus:finish');
  });

  mint.everyTick(() => {
    const local = mint.Player.local;
    if (!local?.valid) return;
    if (checkpoint) {
      const hit = checkpoint.isEntityIn(local);
      if (hit && !inside && local.vehicle) mint.emitServer('crp:bus:point');
      inside = hit;
    }
    for (const vehicle of mint.Vehicle.all) {
      const label = vehicle.getStreamSyncedMeta('crp:busLabel');
      if (typeof label !== 'string' || !label) continue;
      const dx = vehicle.pos.x - local.pos.x;
      const dy = vehicle.pos.y - local.pos.y;
      const dz = vehicle.pos.z - local.pos.z;
      if (dx * dx + dy * dy + dz * dz > 100) continue;
      drawLabel(label, vehicle.pos.x, vehicle.pos.y, vehicle.pos.z + 2.7);
    }
  });
}
