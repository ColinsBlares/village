import * as mint from 'mint-client';
import * as native from 'natives';
import { pushCef } from '../cef/view.js';
import { busyHas } from '../ui/busy.js';

let nextSpeed = 0;
let ctrl = false;

export function tickVehicle(): void {
  const local = mint.Player.local;
  const vehicle = local?.vehicle;
  if (!local || !vehicle || (local.seat !== 1 && local.seat !== 0)) return;
  if (Date.now() < nextSpeed) return;
  nextSpeed = Date.now() + 200;
  const speed = Math.floor(native.getEntitySpeed(vehicle.scriptID) * 3.6);
  pushCef(`speedometer.speed = ${speed};`);
}

function seatIndex(vehicle: mint.Vehicle, local: mint.LocalPlayer): number {
  const handle = local.scriptID;
  if (native.getPedInVehicleSeat(vehicle.scriptID, -1, false) === handle) return -1;
  for (let i = 0; i < 3; i += 1) {
    if (native.getPedInVehicleSeat(vehicle.scriptID, i, false) === handle) return i;
  }
  return -2;
}

export function installVehicleKeys(): void {
  mint.on('keydown', (key) => {
    if (key === 17) ctrl = true;
  });
  mint.on('keyup', (key) => {
    if (key === 17) ctrl = false;
    if (busyHas()) return;
    const local = mint.Player.local;
    const vehicle = local?.vehicle;
    if (!local || !vehicle) return;
    if (key === 50) {
      if (native.getPedInVehicleSeat(vehicle.scriptID, -1, false) !== local.scriptID) return;
      mint.emitServer('crp:veh:engine');
    }
    if (key === 90) {
      const seat = seatIndex(vehicle, local);
      if (seat < -1) return;
      let index = seat === -1 ? 0 : seat + 1;
      if (seat === -1 && ctrl) index = -1;
      mint.emitServer('crp:veh:window', index);
    }
  });
}
