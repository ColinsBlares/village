import * as mint from 'mint-client';
import * as native from 'natives';
import { focusUi, pushCef, uiFocused } from '../cef/view.js';
import { onNearBoot } from '../inventory/boot.js';
import { setInteractionOpen } from '../interaction/state.js';

interface Place {
  name: string;
  sprite: number;
  color: number;
  x: number;
  y: number;
  z: number;
}

let blips: mint.PointBlip[] = [];
let targetId: number | null = null;

export function setVehicleTarget(id: number | null): void {
  targetId = id;
}

export function vehicleTarget(): number | null {
  return targetId;
}

export function bootTarget(): number | null {
  return nearBoot;
}

export function nearestVehicle(local: mint.Player, range: number): mint.Vehicle | null {
  return nearest(local, range);
}

export function openVehicleInteraction(vehicle: mint.Vehicle): void {
  targetId = vehicle.id;
  focusUi(true);
  pushCef('interactionMenu.menu = cloneObj(interactionMenu.menus["vehicle"]); interactionMenu.show = true;');
  pushCef('interactionMenu.left = 50;');
}
let nearBoot: number | null = null;
let nearHood: number | null = null;
const nero = native.getHashKey('nero');

function dist(a: mint.Vector3, b: { x: number; y: number; z: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

const PART_RANGE = 2.2;

export function partPoint(vehicle: mint.Vehicle, bone: 'boot' | 'bonnet'): { x: number; y: number; z: number } {
  const id = vehicle.scriptID;
  const index = native.getEntityBoneIndexByName(id, bone);
  let gap = bone === 'bonnet' ? 2.2 : 2.5;
  if (index > 0) {
    const bonePos = native.getWorldPositionOfEntityBone(id, index);
    const measured = dist(vehicle.pos, bonePos);
    if (measured > 0.4 && measured < 8) gap = measured;
  }
  const swapped = vehicle.model === nero;
  const forward = bone === 'bonnet' ? (swapped ? -gap - 0.4 : gap + 0.4) : (swapped ? gap + 0.4 : -gap - 0.4);
  const pos = native.getOffsetFromEntityInWorldCoords(id, 0, forward, 0);
  return { x: pos.x, y: pos.y, z: pos.z };
}

export function nearPart(local: mint.Player, vehicle: mint.Vehicle, bone: 'boot' | 'bonnet'): boolean {
  const spot = partPoint(vehicle, bone);
  let best = dist(local.pos, spot);
  const index = native.getEntityBoneIndexByName(vehicle.scriptID, bone);
  if (index > 0) {
    const bonePos = native.getWorldPositionOfEntityBone(vehicle.scriptID, index);
    best = Math.min(best, dist(local.pos, bonePos));
  }
  return best < PART_RANGE;
}

function nearest(local: mint.Player, range: number): mint.Vehicle | null {
  let best: mint.Vehicle | null = null;
  let bestDist = range;
  for (const vehicle of mint.Vehicle.streamedIn) {
    const gap = dist(local.pos, vehicle.pos);
    if (gap < bestDist) {
      best = vehicle;
      bestDist = gap;
    }
  }
  return best;
}

function closeMenu(): void {
  setInteractionOpen(false);
  pushCef('interactionMenu.show = false;');
  focusUi(false);
}

export function handleVehicleMenu(name: string): boolean {
  if (name !== 'vehicles.trunk' && name !== 'vehicles.hood' && name !== 'vehicles.lock') return false;
  const id = targetId;
  const local = mint.Player.local;
  const vehicle = id ? mint.Vehicle.getByID(id) : null;
  if (!id || !vehicle || !local?.valid) return true;
  const net = vehicle.remoteID;
  if (name === 'vehicles.lock') mint.emitServer('crp:veh:lock', net);
  else if (name === 'vehicles.trunk') {
    if (!nearPart(local, vehicle, 'boot')) pushCef(`notifications.error('Необходимо находиться у багажника', 'Авто');`);
    else mint.emitServer('crp:veh:trunk', net, native.getVehicleDoorAngleRatio(vehicle.scriptID, 5) < 0.1);
  } else if (!nearPart(local, vehicle, 'bonnet')) pushCef(`notifications.error('Необходимо находиться у капота', 'Авто');`);
  else mint.emitServer('crp:veh:hood', net, native.getVehicleDoorAngleRatio(vehicle.scriptID, 4) < 0.1);
  closeMenu();
  return true;
}

export function installFactions(): void {
  mint.onServer('crp:faction:menu', (menu) => {
    if (typeof menu !== 'string' || !menu) {
      pushCef('selectMenu.show = false;');
      focusUi(false);
      return;
    }
    focusUi(true);
    pushCef(`selectMenu.showByName(${JSON.stringify(menu)});`);
  });
  mint.onServer('crp:faction:places', (raw) => {
    if (typeof raw !== 'string') return;
    for (const blip of blips) blip.destroy();
    blips = [];
    const places = JSON.parse(raw) as Place[];
    for (const place of places) {
      const blip = new mint.PointBlip(place.x, place.y, place.z);
      blip.sprite = place.sprite as typeof blip.sprite;
      blip.color = place.color;
      blip.name = place.name;
      blip.shortRange = true;
      blips.push(blip);
    }
  });
  mint.setInterval(() => {
    const local = mint.Player.local;
    if (!local?.valid || local.vehicle) {
      nearBoot = null;
      nearHood = null;
      return;
    }
    const vehicle = nearest(local, 10);
    if (!vehicle) {
      if (nearBoot != null) {
        const left = mint.Vehicle.getByID(nearBoot);
        if (left) onNearBoot(left, false);
      }
      if (nearBoot != null || nearHood != null) pushCef('prompt.hide();');
      nearBoot = null;
      nearHood = null;
      return;
    }
    const atBoot = nearPart(local, vehicle, 'boot');
    const atHood = nearPart(local, vehicle, 'bonnet');
    if (atBoot && nearBoot !== vehicle.id) {
      nearBoot = vehicle.id;
      mint.emitServer('crp:faction:boot', vehicle.remoteID);
      onNearBoot(vehicle, true);
      if (native.getVehicleDoorAngleRatio(vehicle.scriptID, 5) < 0.1) pushCef(`prompt.showByName('vehicle_open_boot');`);
    } else if (!atBoot && nearBoot === vehicle.id) {
      onNearBoot(vehicle, false);
      nearBoot = null;
    }
    if (atHood && nearHood !== vehicle.id) {
      nearHood = vehicle.id;
      const open = native.getVehicleDoorAngleRatio(vehicle.scriptID, 4) > 0.1;
      pushCef(`prompt.showByName(${JSON.stringify(open ? 'vehicle_close_hood' : 'vehicle_open_hood')});`);
    } else if (!atHood && nearHood === vehicle.id) {
      nearHood = null;
    }
  }, 400);
}
