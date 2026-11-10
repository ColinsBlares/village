import * as mint from 'mint-client';
import * as native from 'natives';

let locked = false;

function vehicleByRemote(id: number): mint.Vehicle | null {
  return mint.Vehicle.getByRemoteID(id);
}

function hoodPoint(vehicle: mint.Vehicle): { x: number; y: number; z: number } | null {
  const bone = native.getEntityBoneIndexByName(vehicle.scriptID, 'bonnet');
  if (bone <= 0) return null;
  const pos = native.getWorldPositionOfEntityBone(vehicle.scriptID, bone);
  if (!pos.x && !pos.y && !pos.z) return null;
  return pos;
}

function animType(vehicle: mint.Vehicle): number {
  const kind = native.getVehicleClass(vehicle.scriptID);
  if (kind === 12) return 1;
  if (kind === 8) return 2;
  if (kind === 7) return 3;
  return 0;
}

export function installServiceClient(): void {
  mint.onServer('crp:service:go', (rawId) => {
    const local = mint.Player.local;
    const vehicle = vehicleByRemote(Number(rawId));
    if (!local || !vehicle) return;
    locked = true;
    const hood = hoodPoint(vehicle);
    const dist = hood ? Math.hypot(hood.x - vehicle.pos.x, hood.y - vehicle.pos.y) : 2;
    const spot = native.getOffsetFromEntityInWorldCoords(vehicle.scriptID, 0, dist + 1, 0);
    native.taskFollowNavMeshToCoord(local.scriptID, spot.x, spot.y, spot.z, 1, -1, 1, 0, 0);
    const wait = mint.everyTick(() => {
      if (native.isPedWalking(local.scriptID)) return;
      mint.clearEveryTick(wait);
      const place = hoodPoint(vehicle) ?? { x: vehicle.pos.x, y: vehicle.pos.y, z: vehicle.pos.z };
      const gap = Math.hypot(place.x - vehicle.pos.x, place.y - vehicle.pos.y);
      const next = native.getOffsetFromEntityInWorldCoords(vehicle.scriptID, 0, (hoodPoint(vehicle) ? gap + 1.8 : 1.5), 0);
      native.setEntityCoords(local.scriptID, next.x, next.y, next.z, false, false, false, false);
      native.setEntityHeading(local.scriptID, native.getEntityHeading(vehicle.scriptID) - 180);
      native.freezeEntityPosition(local.scriptID, true);
      mint.emitServer('crp:service:begin', animType(vehicle));
    });
  });
  mint.onServer('crp:service:done', () => {
    locked = false;
    const local = mint.Player.local;
    if (local) native.freezeEntityPosition(local.scriptID, false);
  });
  mint.everyTick(() => {
    if (!locked) return;
    native.disableControlAction(0, 21, true);
    native.disableControlAction(0, 22, true);
    native.disableControlAction(0, 31, true);
    native.disableControlAction(0, 30, true);
    native.disableControlAction(0, 24, true);
    native.disableControlAction(0, 257, true);
  });
}
