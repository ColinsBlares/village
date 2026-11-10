import * as mint from 'mint-client';
import * as native from 'natives';

const MODEL = native.getHashKey('prop_haybale_01');
const TRACTOR = 0xaa699bb6;
const PICKUP = 0xb802dd46;

type Bale = [number, number, number, number, number, number, number];

const LAYOUTS: Record<number, Bale[][]> = {
  [TRACTOR]: [
    [[5, 0.01, -2.88, -0.26, 0, 0, 90]],
    [[5, 0.01, -2.88, -0.26, 0, 0, 90], [5, 0.27, -2, -0.26, 0, 0, 0]],
    [[5, 0.01, -2.88, -0.26, 0, 0, 90], [5, 0.27, -2, -0.26, 0, 0, 0], [5, -0.2, -2, -0.26, 0, 0, 0]],
    [[5, 0.01, -2.88, -0.26, 0, 0, 90], [5, 0.27, -2, -0.26, 0, 0, 0], [5, -0.2, -2, -0.26, 0, 0, 0], [5, 0.01, -3.4, -0.26, 0, 0, 90]],
    [[5, 0.01, -2.88, -0.26, 0, 0, 90], [5, 0.27, -2, -0.26, 0, 0, 0], [5, -0.2, -2, -0.26, 0, 0, 0], [5, 0.01, -3.4, -0.26, 0, 0, 90], [5, 0.6, -2.6, 0.2, 0, 30, 0]],
    [[5, 0.01, -2.88, -0.26, 0, 0, 90], [5, 0.27, -2, -0.26, 0, 0, 0], [5, -0.2, -2, -0.26, 0, 0, 0], [5, 0.01, -3.4, -0.26, 0, 0, 90], [5, 0.6, -2.6, 0.2, 0, 30, 0], [5, -0.53, -2.6, 0.2, 0, 150, 0], [5, 0.01, -2.6, 0.3, 0, 0, 0], [5, 0.03, -3.5, 0.3, 0, 0, 90]],
  ],
  [PICKUP]: [
    [[3, 0.13, -1.6, 0.1, 0, 0, 0]],
    [[3, 0.13, -1.6, 0.1, 0, 0, 0], [3, 0.67, -1.6, 0.1, 0, 0, 0]],
    [[3, 0.13, -1.6, 0.1, 0, 0, 0], [3, 0.67, -1.6, 0.1, 0, 0, 0], [3, 0.4, -2.41, 0.1, 0, 0, 90]],
    [[3, 0.13, -1.6, 0.1, 0, 0, 0], [3, 0.67, -1.6, 0.1, 0, 0, 0], [3, 0.4, -2.41, 0.1, 0, 0, 90], [3, 0.4, -1.3, 0.63, 0, 0, 90]],
    [[3, 0.13, -1.6, 0.1, 0, 0, 0], [3, 0.67, -1.6, 0.1, 0, 0, 0], [3, 0.4, -2.41, 0.1, 0, 0, 90], [3, 0.4, -1.3, 0.63, 0, 0, 90], [3, 0.75, -2.1, 0.63, 0, 0, 0], [3, 0.1, -2.1, 0.63, 0, 0, 0]],
    [[3, 0.13, -1.6, 0.1, 0, 0, 0], [3, 0.67, -1.6, 0.1, 0, 0, 0], [3, 0.4, -2.41, 0.1, 0, 0, 90], [3, 0.4, -1.3, 0.63, 0, 0, 90], [3, 0.75, -2.1, 0.63, 0, 0, 0], [3, 0.1, -2.1, 0.63, 0, 0, 0], [3, 0.4, -2.1, 1.1, 0, 0, 0], [3, 0.4, -1.2, 1.1, 0, 0, 90]],
  ],
};

const objects = new Map<number, number[]>();

function vehicleOf(target: object): mint.Vehicle | null {
  const id = (target as { scriptID?: number }).scriptID ?? -1;
  return mint.Vehicle.getByScriptID(id);
}

function clear(vehicle: mint.Vehicle): void {
  const list = objects.get(vehicle.id);
  if (!list) return;
  for (const handle of list) {
    native.detachEntity(handle, true, true);
    native.deleteObject(handle);
  }
  objects.delete(vehicle.id);
}

function attach(vehicle: mint.Vehicle): void {
  clear(vehicle);
  if (!vehicle.valid) return;
  const hash = native.getEntityModel(vehicle.scriptID) >>> 0;
  const state = Math.max(0, Math.min(6, Number(vehicle.getStreamSyncedMeta('crp:farmBales')) || 0));
  const layout = LAYOUTS[hash]?.[state - 1];
  if (!state || !layout) return;
  native.requestModel(MODEL);
  let tries = 0;
  const run = (): void => {
    if (!vehicle.valid) return;
    if (!native.hasModelLoaded(MODEL)) {
      if (++tries < 40) mint.setTimeout(run, 50);
      return;
    }
    const handles: number[] = [];
    const pos = vehicle.pos;
    for (const bale of layout) {
      const handle = native.createObject(MODEL, pos.x, pos.y, pos.z, false, false, false);
      native.attachEntityToEntity(handle, vehicle.scriptID, bale[0], bale[1], bale[2], bale[3], bale[4], bale[5], bale[6], false, false, false, false, 2, true, false);
      handles.push(handle);
    }
    objects.set(vehicle.id, handles);
    native.setModelAsNoLongerNeeded(MODEL);
  };
  mint.setTimeout(run, 200);
}

export function installFarmBales(): void {
  mint.on('streamSyncedMetaChange', (target, key) => {
    if (key !== 'crp:farmBales') return;
    const vehicle = vehicleOf(target);
    if (vehicle) attach(vehicle);
  });
  mint.on('worldObjectStreamIn', (object) => {
    const vehicle = vehicleOf(object);
    if (vehicle?.getStreamSyncedMeta('crp:farmBales')) attach(vehicle);
  });
  mint.on('worldObjectStreamOut', (object) => {
    const vehicle = vehicleOf(object);
    if (vehicle) clear(vehicle);
  });
}
