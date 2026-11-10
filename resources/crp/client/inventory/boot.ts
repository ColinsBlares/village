import * as mint from 'mint-client';
import * as native from 'natives';
import { pushCef } from '../cef/view.js';

let nearBootId: number | null = null;

function vehicleById(id: number): mint.Vehicle | null {
  return mint.Vehicle.getByID(id);
}

function enterBoot(vehicle: mint.Vehicle): void {
  if (mint.Player.local?.vehicle) return;
  if (native.getVehicleDoorAngleRatio(vehicle.scriptID, 5) < 0.1) return;
  pushCef(`prompt.showByName('vehicle_items_boot');`);
  mint.emitServer('crp:boot:request', vehicle.remoteID);
}

function exitBoot(vehicle: mint.Vehicle | null): void {
  if (vehicle?.remoteID) mint.emitServer('crp:boot:clear', vehicle.remoteID);
  pushCef('prompt.hide();');
}

export function onNearBoot(vehicle: mint.Vehicle, entered: boolean): void {
  if (entered) {
    nearBootId = vehicle.id;
    enterBoot(vehicle);
    return;
  }
  if (nearBootId === vehicle.id) {
    exitBoot(vehicle);
    nearBootId = null;
  }
}

export function installBootInventory(): void {
  mint.on('streamSyncedMetaChange', (target, key, value) => {
    if (key !== 'trunk' || nearBootId == null) return;
    const vehicle = target as mint.Vehicle;
    if (!vehicle?.valid || vehicle.id !== nearBootId) return;
    if (value === true) {
      pushCef(`prompt.showByName('vehicle_items_boot');`);
      mint.emitServer('crp:boot:request', vehicle.remoteID);
    } else {
      mint.emitServer('crp:boot:clear', vehicle.remoteID);
      pushCef(`prompt.showByName('vehicle_open_boot');`);
    }
  });

  mint.on('disconnect', () => {
    if (nearBootId == null) return;
    const vehicle = vehicleById(nearBootId);
    if (vehicle?.remoteID) mint.emitServer('crp:boot:clear', vehicle.remoteID);
    nearBootId = null;
  });
}
