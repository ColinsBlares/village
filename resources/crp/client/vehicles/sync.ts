import * as mint from 'mint-client';
import * as native from 'natives';
import { pushCef } from '../cef/view.js';
import { animatorOn } from '../animations/index.js';
import { busyHas } from '../ui/busy.js';
import { bootTarget, partPoint } from '../factions/index.js';

const OFFSETS = [
  [0, 1.5, 0.4], [0, -1.5, 0.4], [-0.9, 0.6, 0.4], [0.9, 0.6, 0.4],
  [-0.9, -0.6, 0.4], [0.9, -0.6, 0.4], [0, 1.2, 0.8], [0, -1.2, 0.7],
  [-0.9, 0, 0.6], [0.9, 0, 0.6], [0, 0.5, 1], [0, -0.5, 1],
];
const WHEELS = [0, 1, 4, 5];
const damageStamp = new WeakMap<mint.Vehicle, string>();
const damageSent = new WeakMap<mint.Vehicle, string>();
let lastLights = -1;
let lastLock = -1;
let mileage = 0;
let lastPos: mint.Vector3 | null = null;
let mileageSent = 0;

function idOf(vehicle: mint.Vehicle): number {
  return vehicle.scriptID;
}

function flag(vehicle: mint.Vehicle, key: string): boolean {
  return !!vehicle.getStreamSyncedMeta(key);
}

function damageOf(vehicle: mint.Vehicle): number[] | null {
  const value = vehicle.getStreamSyncedMeta('damage');
  return Array.isArray(value) ? value.filter((item): item is number => typeof item === 'number') : null;
}

function isDriver(vehicle: mint.Vehicle | null): boolean {
  const local = mint.Player.local;
  if (!local || !vehicle || local.vehicle !== vehicle) return false;
  return native.getPedInVehicleSeat(idOf(vehicle), -1, false) === local.scriptID;
}

function applyEngine(vehicle: mint.Vehicle): void {
  const on = flag(vehicle, 'engine');
  native.setVehicleUndriveable(idOf(vehicle), !on);
  native.setVehicleEngineOn(idOf(vehicle), on, true, true);
}

function applySignals(vehicle: mint.Vehicle): void {
  native.setVehicleIndicatorLights(idOf(vehicle), 1, flag(vehicle, 'leftTurnSignal'));
  native.setVehicleIndicatorLights(idOf(vehicle), 0, flag(vehicle, 'rightTurnSignal'));
}

function applyHood(_vehicle: mint.Vehicle, _doors = 0): void {
}

function applySiren(vehicle: mint.Vehicle): void {
  native.setVehicleSiren(idOf(vehicle), flag(vehicle, 'sirenLights'));
  native.setVehicleHasMutedSirens(idOf(vehicle), !flag(vehicle, 'sirenSound'));
}

function applyLights(vehicle: mint.Vehicle): void {
  if (isDriver(vehicle)) return;
  const state = Number(vehicle.getStreamSyncedMeta('lights'));
  if (!Number.isFinite(state)) return;
  const on = state === 2 || state === 3;
  const high = state === 1 || state === 3;
  native.setVehicleLights(idOf(vehicle), on ? 2 : 1);
  native.setVehicleFullbeam(idOf(vehicle), high);
}

function applyWindows(vehicle: mint.Vehicle): void {
  const bits = Number(vehicle.getStreamSyncedMeta('windowsDown')) || 0;
  for (let i = 0; i < 4; i += 1) {
    if (bits & (1 << i)) native.rollDownWindow(idOf(vehicle), i);
    else native.rollUpWindow(idOf(vehicle), i);
  }
}

function applyDamage(vehicle: mint.Vehicle): void {
  if (flag(vehicle, 'robbed') || isDriver(vehicle)) return;
  const snapshot = damageOf(vehicle);
  const stamp = snapshot ? snapshot.join(',') : '';
  if (damageStamp.get(vehicle) === stamp) return;
  const had = !!damageStamp.get(vehicle);
  damageStamp.set(vehicle, stamp);
  if (!stamp) {
    if (!had) return;
    native.setVehicleFixed(idOf(vehicle));
    applyEngine(vehicle);
    applySignals(vehicle);
    applyHood(vehicle, 0);
    applySiren(vehicle);
    return;
  }
  if (had) native.setVehicleDeformationFixed(idOf(vehicle));
  const doors = snapshot?.[0] ?? 0;
  const windows = snapshot?.[1] ?? 0;
  const wheels = snapshot?.[2] ?? 0;
  const dirt = snapshot?.[3] ?? 0;
  for (let i = 0; i < 6; i += 1) {
    if (doors & (1 << i)) native.setVehicleDoorBroken(idOf(vehicle), i, false);
  }
  for (let i = 0; i < 8; i += 1) {
    if (windows & (1 << i)) native.smashVehicleWindow(idOf(vehicle), i);
  }
  for (let i = 0; i < WHEELS.length; i += 1) {
    if (wheels & (1 << i)) native.setVehicleTyreBurst(idOf(vehicle), WHEELS[i], true, 1000);
  }
  native.setVehicleDirtLevel(idOf(vehicle), dirt);
  for (let i = 4; snapshot && i + 3 < snapshot.length; i += 4) {
    const amount = snapshot[i + 3];
    native.setVehicleDamage(idOf(vehicle), snapshot[i], snapshot[i + 1], snapshot[i + 2], amount < 10 ? amount * 100 : amount, 50, false);
  }
  applyEngine(vehicle);
  applySignals(vehicle);
  applyHood(vehicle, doors);
  applySiren(vehicle);
}

function applyAll(vehicle: mint.Vehicle): void {
  applyEngine(vehicle);
  applySignals(vehicle);
  applySiren(vehicle);
  applyLights(vehicle);
  applyWindows(vehicle);
  if (!flag(vehicle, 'robbed')) {
    applyDamage(vehicle);
    applyHood(vehicle);
  }
}

function collectDamage(vehicle: mint.Vehicle): number[] {
  const handle = idOf(vehicle);
  let doors = 0;
  let windows = 0;
  let wheels = 0;
  for (let i = 0; i < 6; i += 1) {
    if (native.isVehicleDoorDamaged(handle, i)) doors |= 1 << i;
  }
  const rolled = Number(vehicle.getStreamSyncedMeta('windowsDown')) || 0;
  const saved = damageOf(vehicle);
  for (let i = 0; i < 8; i += 1) {
    if (rolled & (1 << i)) continue;
    if (!native.isVehicleWindowIntact(handle, i)) windows |= 1 << i;
  }
  if (saved) windows |= saved[1] ?? 0;
  for (let i = 0; i < WHEELS.length; i += 1) {
    if (native.isVehicleTyreBurst(handle, WHEELS[i], false)) wheels |= 1 << i;
  }
  const snapshot = [doors, windows, wheels, Math.round(native.getVehicleDirtLevel(handle) * 10) / 10];
  for (const offset of OFFSETS) {
    if (snapshot.length >= 52) break;
    const raw = native.getVehicleDeformationAtPos(handle, offset[0], offset[1], offset[2]) as unknown;
    const amount = typeof raw === 'number' ? raw : 0;
    if (!(amount > 0.15)) continue;
    snapshot.push(offset[0], offset[1], offset[2], Math.round(amount * 100) / 100);
  }
  return snapshot;
}

function vehicleFrom(target: mint.BaseObject): mint.Vehicle | null {
  if (!('scriptID' in target)) return null;
  return mint.Vehicle.getByScriptID((target as mint.Vehicle).scriptID);
}

function drawTag(text: string, x: number, y: number, z: number, scale: number, red: number, green: number, blue: number): void {
  text.split('\n').forEach((line, index) => {
    native.setDrawOrigin(x, y, z, false);
    native.setTextFont(0);
    native.setTextScale(scale, scale);
    native.setTextColour(red, green, blue, 255);
    native.setTextOutline();
    native.setTextCentre(true);
    native.beginTextCommandDisplayText('STRING');
    native.addTextComponentSubstringPlayerName(line.trim());
    native.endTextCommandDisplayText(0, index * 0.028, 0);
    native.clearDrawOrigin();
  });
}

export function installVehicleSync(): void {
  mint.everyTick(() => {
    const local = mint.Player.local;
    if (!local?.valid) return;
    for (const vehicle of mint.Vehicle.all) {
      const dx = vehicle.pos.x - local.pos.x;
      const dy = vehicle.pos.y - local.pos.y;
      const dz = vehicle.pos.z - local.pos.z;
      if (dx * dx + dy * dy + dz * dz > 100) continue;
      const cargo = vehicle.getStreamSyncedMeta('crp:cargo');
      if (typeof cargo === 'string' && cargo) drawTag(cargo, vehicle.pos.x, vehicle.pos.y, vehicle.pos.z + 2.7, 0.35, 255, 255, 255);
      if (vehicle.getStreamSyncedMeta('crp:unload') === true) {
        const boot = partPoint(vehicle, 'boot');
        drawTag('Разгрузка...', boot.x, boot.y, boot.z + 1, 0.25, 187, 255, 0);
      }
    }
  });
  mint.onServer('crp:veh:door', (id, door, open) => {
    const vehicle = mint.Vehicle.getByRemoteID(Number(id));
    if (!vehicle?.valid) return;
    const index = Number(door);
    if (open === true) native.setVehicleDoorOpen(idOf(vehicle), index, false, false);
    else native.setVehicleDoorShut(idOf(vehicle), index, false);
    if (index === 5 && bootTarget() === vehicle.id) {
      if (open === true) {
        pushCef(`prompt.showByName('vehicle_items_boot');`);
        mint.emitServer('crp:boot:request', vehicle.remoteID);
      } else {
        mint.emitServer('crp:boot:clear', vehicle.remoteID);
        pushCef(`prompt.showByName('vehicle_open_boot');`);
      }
    }
  });
  mint.on('worldObjectStreamIn', (object) => {
    const vehicle = mint.Vehicle.getByScriptID(object.scriptID);
    if (vehicle) applyAll(vehicle);
  });

  mint.on('streamSyncedMetaChange', (target, key) => {
    const vehicle = vehicleFrom(target);
    if (!vehicle) return;
    if (key === 'engine') applyEngine(vehicle);
    else if (key === 'leftTurnSignal' || key === 'rightTurnSignal') applySignals(vehicle);
    else if (key === 'hood' || key === 'trunk') applyHood(vehicle);
    else if (key === 'sirenLights' || key === 'sirenSound') applySiren(vehicle);
    else if (key === 'lights') applyLights(vehicle);
    else if (key === 'windowsDown') applyWindows(vehicle);
    else if (key === 'damage') applyDamage(vehicle);
  });

  mint.setInterval(() => {
    const vehicle = mint.Player.local?.vehicle ?? null;
    if (!isDriver(vehicle)) return;
    applyEngine(vehicle as mint.Vehicle);
    const speed = Math.floor(native.getEntitySpeed(idOf(vehicle as mint.Vehicle)) * 3.6);
    pushCef(`speedometer.speed = ${speed};`);
    const lights = native.getVehicleLightsState(idOf(vehicle as mint.Vehicle), false, false);
    const low = lights[1] ? 1 : 0;
    const high = lights[2] ? 1 : 0;
    let state = 0;
    if (low === 0 && high === 1) state = 1;
    if (low === 1 && high === 0) state = 2;
    if (low === 1 && high === 1) state = 3;
    if (state !== lastLights) {
      lastLights = state;
      pushCef(`speedometer.headlights = ${state};`);
      mint.emitServer('crp:veh:lights', state);
    }
    const lock = native.getVehicleDoorLockStatus(idOf(vehicle as mint.Vehicle));
    if (lock !== lastLock) {
      lastLock = lock;
      pushCef(`speedometer.lock = ${lock === 1 ? 0 : 1};`);
    }
  }, 100);

  mint.setInterval(() => {
    const vehicle = mint.Player.local?.vehicle ?? null;
    if (!isDriver(vehicle) || flag(vehicle as mint.Vehicle, 'robbed')) return;
    const snapshot = collectDamage(vehicle as mint.Vehicle);
    const clean = snapshot[0] === 0 && snapshot[1] === 0 && snapshot[2] === 0 && snapshot[3] < 0.05 && snapshot.length === 4;
    const key = clean ? '' : snapshot.join(',');
    if (damageSent.get(vehicle as mint.Vehicle) === key) return;
    damageSent.set(vehicle as mint.Vehicle, key);
    mint.emitServer('crp:veh:damage', JSON.stringify(clean ? [0, 0, 0, 0] : snapshot));
  }, 1000);

  mint.setInterval(() => {
    for (const vehicle of mint.Vehicle.all) {
      if (!vehicle.valid) continue;
      const rolled = Number(vehicle.getStreamSyncedMeta('windowsDown')) || 0;
      const bits = damageOf(vehicle)?.[1] ?? 0;
      if (!bits && !rolled) continue;
      for (let n = 0; n < 4; n += 1) {
        if (rolled & (1 << n)) native.rollDownWindow(idOf(vehicle), n);
        else if (bits & (1 << n)) native.smashVehicleWindow(idOf(vehicle), n);
      }
    }
  }, 1000);

  mint.setInterval(() => {
    const vehicle = mint.Player.local?.vehicle ?? null;
    if (!isDriver(vehicle)) {
      lastPos = null;
      return;
    }
    const pos = (vehicle as mint.Vehicle).pos;
    if (!lastPos) {
      lastPos = pos;
      return;
    }
    let dist = Math.hypot(pos.x - lastPos.x, pos.y - lastPos.y, pos.z - lastPos.z);
    if (dist > 200) dist = 50;
    mileage += dist / 1000;
    lastPos = pos;
    pushCef(`speedometer.mileage = ${Math.floor(mileage)};`);
    mileageSent += dist / 1000;
  }, 1000);

  mint.setInterval(() => {
    if (mileageSent < 0.1) return;
    const sent = mileageSent;
    mileageSent = 0;
    mint.emitServer('crp:veh:mileage', sent);
  }, 60000);
}

export function installVehicleSignalKeys(): void {
  mint.on('keyup', (key) => {
    if (busyHas() || animatorOn()) return;
    const vehicle = mint.Player.local?.vehicle ?? null;
    if (!isDriver(vehicle)) return;
    const current = vehicle as mint.Vehicle;
    if (key === 37) {
      const left = flag(current, 'leftTurnSignal');
      mint.emitServer('crp:veh:signal', 'left', !left);
      pushCef(left ? 'speedometer.arrow = 0;' : 'speedometer.arrow = 1;');
    }
    if (key === 39) {
      const right = flag(current, 'rightTurnSignal');
      mint.emitServer('crp:veh:signal', 'right', !right);
      pushCef(right ? 'speedometer.arrow = 0;' : 'speedometer.arrow = 2;');
    }
    if (key === 40) {
      const on = flag(current, 'leftTurnSignal') && flag(current, 'rightTurnSignal');
      mint.emitServer('crp:veh:signal', 'emergency', !on);
      pushCef(on ? 'speedometer.emergency = false; speedometer.arrow = 0;' : 'speedometer.emergency = true; speedometer.arrow = 0;');
    }
  });
}
