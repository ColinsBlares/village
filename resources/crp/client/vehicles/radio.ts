import * as mint from 'mint-client';
import * as native from 'natives';

let holdUntil = 0;
let timer: ReturnType<typeof mint.setInterval> | null = null;

function stationName(index: number): string | null {
  if (index === 255) return 'OFF';
  const name = native.getRadioStationName(index);
  return name || null;
}

function applyVehicle(vehicle: mint.Vehicle, index: number | null): void {
  if (!vehicle.valid || index == null) return;
  const station = stationName(index);
  if (!station) return;
  native.setVehRadioStation(vehicle.scriptID, station);
}

function applyFrontend(index: number | null): void {
  if (index == null) return;
  const current = native.getPlayerRadioStationIndex();
  if (index === current) return;
  if (index === 255) {
    native.setRadioToStationName('OFF');
    native.setFrontendRadioActive(false);
    return;
  }
  native.setFrontendRadioActive(true);
  native.setRadioToStationIndex(index);
}

function indexOf(vehicle: mint.Vehicle): number | null {
  const value = vehicle.getStreamSyncedMeta('crp:radio');
  const index = Number(value);
  return Number.isInteger(index) ? index : null;
}

function driving(vehicle: mint.Vehicle): boolean {
  const local = mint.Player.local;
  if (!local?.valid) return false;
  return native.getPedInVehicleSeat(vehicle.scriptID, -1, false) === local.scriptID;
}

function sync(): void {
  const local = mint.Player.local;
  const vehicle = local?.vehicle;
  if (!local?.valid || !vehicle?.valid) return;
  if (vehicle.getStreamSyncedMeta('crp:musicUrl')) {
    native.setFrontendRadioActive(false);
    native.setVehicleRadioEnabled(vehicle.scriptID, false);
    return;
  }
  native.setVehicleRadioEnabled(vehicle.scriptID, true);
  const saved = indexOf(vehicle);
  const current = native.getPlayerRadioStationIndex();
  if (driving(vehicle)) {
    if (Date.now() < holdUntil) return;
    if (saved !== current) mint.emitServer('crp:veh:radio', current);
    return;
  }
  if (saved == null) mint.emitServer('crp:veh:radio', current);
  else applyFrontend(saved);
}

export function installVehicleRadio(): void {
  mint.on('enteredVehicle', (vehicle) => {
    const local = mint.Player.local;
    if (!local?.valid || local.vehicle !== vehicle) return;
    if (timer != null) mint.clearInterval(timer);
    const current = vehicle?.valid ? indexOf(vehicle) : null;
    if (vehicle?.valid && current != null) {
      applyVehicle(vehicle, current);
      applyFrontend(current);
      holdUntil = Date.now() + 2000;
    }
    timer = mint.setInterval(sync, 1000);
  });
  mint.on('leftVehicle', () => {
    if (mint.Player.local?.vehicle) return;
    if (timer != null) mint.clearInterval(timer);
    timer = null;
  });
  mint.on('streamSyncedMetaChange', (target, key) => {
    if (key !== 'crp:radio') return;
    const vehicle = mint.Vehicle.getByScriptID((target as mint.Vehicle).scriptID);
    if (!vehicle?.valid) return;
    const index = indexOf(vehicle);
    applyVehicle(vehicle, index);
    const local = mint.Player.local;
    if (local?.vehicle === vehicle && !driving(vehicle)) applyFrontend(index);
  });
  mint.on('worldObjectStreamIn', (object) => {
    const vehicle = mint.Vehicle.getByScriptID(object.scriptID);
    if (!vehicle?.valid) return;
    applyVehicle(vehicle, indexOf(vehicle));
  });
}
