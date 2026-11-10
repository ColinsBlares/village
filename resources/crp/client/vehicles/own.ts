import * as mint from 'mint-client';
import * as native from 'natives';
import { focusUi, pushCef } from '../cef/view.js';

interface OwnVehicle {
  id: number;
  name: string;
  plate: string;
}

let list: OwnVehicle[] = [];
let price = 300;
let current: OwnVehicle | null = null;
let pendingDeliverId: number | null = null;
let gpsBlip: mint.PointBlip | null = null;
let gpsMarker: number | null = null;

function clearGps(): void {
  gpsBlip?.destroy();
  gpsBlip = null;
  if (gpsMarker != null) {
    native.deleteCheckpoint(gpsMarker);
    gpsMarker = null;
  }
}

function showList(items: OwnVehicle[], respawnPrice: number): void {
  list = items;
  price = respawnPrice;
  const rows = items.map((entry) => ({ text: entry.name, values: [entry.plate] }));
  rows.push({ text: 'Закрыть', values: [] });
  focusUi(true);
  pushCef(`selectMenu.setItems('ownVehiclesList', ${JSON.stringify(rows)}); selectMenu.showByName('ownVehiclesList');`);
}

function showVehicleMenu(index: number): void {
  const info = list[index];
  if (!info) return;
  current = info;
  const safeName = info.name.replace(/'/g, "\\'");
  const safePlate = info.plate.replace(/'/g, "\\'");
  pushCef(`selectMenu.menus['ownVehicleMenu'].items[0].values = ['${safePlate}'];
selectMenu.menus['ownVehicleMenu'].items[2].values = ['$${price}'];
selectMenu.menus['ownVehicleMenu'].header = '${safeName}';
selectMenu.showByName('ownVehicleMenu');`);
}

export function handleOwnVehicles(name: string, args: unknown[]): boolean {
  if (name === 'vehicles.own.menu.show') {
    showVehicleMenu(Number(args[1]) || 0);
    return true;
  }
  if (name === 'vehicles.own.deliver') {
    if (!current) return true;
    pendingDeliverId = current.id;
    pushCef(`mp.event.call('pay.choose', []);`);
    return true;
  }
  if (name === 'vehicles.own.find') {
    if (!current) return true;
    pushCef('selectMenu.show = false;');
    mint.emitServer('crp:veh:own:find', current.id);
    return true;
  }
  if (name === 'pay.choose.ans' && pendingDeliverId != null) {
    const method = Number(args[1]);
    const id = pendingDeliverId;
    pendingDeliverId = null;
    if (method !== 0 && method !== 1) {
      pushCef('mp.event.call(\'pay.choose.cancel\', []);');
      return true;
    }
    mint.emitServer('crp:veh:own:deliver', id, method);
    pushCef('selectMenu.show = false; selectMenu.loader = true;');
    return true;
  }
  return false;
}

export function installOwnVehiclesClient(): void {
  mint.onServer('crp:veh:own:list', (raw) => {
    if (typeof raw !== 'string') return;
    try {
      const data = JSON.parse(raw) as { list: OwnVehicle[]; price: number };
      showList(data.list ?? [], Number(data.price) || 300);
    } catch {
      return;
    }
  });

  mint.onServer('crp:veh:own:gps', (x, y, z) => {
    clearGps();
    const px = Number(x);
    const py = Number(y);
    const pz = Number(z);
    if (!Number.isFinite(px)) return;
    gpsBlip = new mint.PointBlip(px, py, pz);
    gpsBlip.sprite = 523;
    gpsBlip.color = 71;
    gpsBlip.name = 'Транспорт';
    gpsBlip.shortRange = false;
    gpsMarker = native.createCheckpoint(
      1,
      px,
      py,
      pz - 1,
      px,
      py,
      pz,
      4,
      255,
      234,
      0,
      180,
      0,
    );
  });

  mint.setInterval(() => {
    const local = mint.Player.local;
    if (!local?.valid || !gpsBlip?.valid) return;
    if (local.pos.distanceTo(gpsBlip.pos) < 6) clearGps();
  }, 500);
}
