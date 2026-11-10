import * as mint from 'mint-client';
import * as native from 'natives';
import { focusUi, pushCef } from '../cef/view.js';
import { garageVehicle } from '../vehicles/garage.js';
import { busyHas } from '../ui/busy.js';

let fishing = false;
let fishingZone = false;
let route: mint.PointBlip | null = null;

export function installActivities(): void {
  mint.onServer('crp:ui:focus', (on) => {
    focusUi(on === true);
  });
  mint.onServer('crp:waypoint', (x, y) => {
    if (route) {
      route.destroy();
      route = null;
    }
    const px = Number(x);
    const py = Number(y);
    if (!px && !py) return;
    route = new mint.PointBlip(px, py, 0);
    route.sprite = 1 as typeof route.sprite;
    route.color = 5;
    route.name = 'Точка';
    route.route = true;
  });
  mint.onServer('crp:fish:zone', (on) => {
    fishingZone = on === true;
    if (fishingZone) pushCef(`prompt.showByName('fishing');`);
    else pushCef('prompt.hide();');
  });
  mint.onServer('crp:fish:enter', () => {
    fishing = true;
    focusUi(false);
    pushCef('fishing.show = true;');
  });
  mint.onServer('crp:fish:fetch', (speed, zone, weight) => {
    pushCef(`fishing.fishFetch(${Number(speed) || 1}, ${Number(zone) || 10}, ${Number(weight) || 1});`);
  });
  mint.onServer('crp:fish:exit', () => {
    fishing = false;
    pushCef('fishing.show = false;');
  });
  mint.onServer('crp:prompt', (name) => {
    if (typeof name === 'string' && name) pushCef(`prompt.showByName(${JSON.stringify(name)});`);
  });
  mint.onServer('crp:rent:show', (raw) => {
    const data = JSON.parse(String(raw ?? '{}')) as { name?: string; price?: number; mileage?: number };
    const vehicle = mint.Player.local?.vehicle;
    if (vehicle) native.freezeEntityPosition(vehicle.scriptID, true);
    focusUi(true);
    pushCef(`carSpecifications.body = ${JSON.stringify({
      name: { header: 'Название', value: data.name ?? '', unit: '' },
      mileage: { header: 'Пробег', value: String(data.mileage ?? 0), unit: 'км' },
    })};
carSpecifications.price = ${JSON.stringify(String(data.price ?? 0))};
carSpecifications.show = true;
selectMenu.showByName('rentMenu');`);
  });
  mint.onServer('crp:rent:close', () => {
    const vehicle = mint.Player.local?.vehicle;
    if (vehicle) native.freezeEntityPosition(vehicle.scriptID, false);
    focusUi(false);
    pushCef('carSpecifications.show = false; selectMenu.show = false;');
  });
  mint.on('keyup', (key) => {
    if (key === 66 && !busyHas() && !mint.Player.local?.vehicle) {
      mint.emitServer('crp:biz:open');
      return;
    }
    if (key !== 69 || busyHas()) return;
    if (garageVehicle()) return;
    if (fishingZone) {
      if (!fishing) mint.emitServer('crp:fish:enter');
      else mint.emitServer('crp:fish:start');
      return;
    }
    mint.emitServer('crp:job:use');
  });
}