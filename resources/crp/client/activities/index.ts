import * as mint from 'mint-client';
import * as native from 'natives';
import { focusUi, pushCef } from '../cef/view.js';
import { garageVehicle } from '../vehicles/garage.js';
import { holding } from '../attaches/index.js';
import { busyAdd, busyHas, busyRemove } from '../ui/busy.js';

let fishing = false;
let casting = false;
let water = false;
let prompted = false;
let route: mint.PointBlip | null = null;

const ROD_ANIM = 'amb@world_human_stand_fishing@base';
const WAIT_ANIM = 'amb@world_human_stand_fishing@idle_a';

function fishAnim(dict: string, name: string): void {
  const local = mint.Player.local;
  if (!local?.valid) return;
  native.requestAnimDict(dict);
  if (!native.hasAnimDictLoaded(dict)) {
    mint.setTimeout(() => fishAnim(dict, name), 50);
    return;
  }
  native.taskPlayAnim(local.scriptID, dict, name, 1, 0, -1, 49, 0, false, 0, false);
}

function stopFish(): void {
  const local = mint.Player.local;
  fishing = false;
  casting = false;
  if (local?.valid) {
    native.freezeEntityPosition(local.scriptID, false);
    native.clearPedSecondaryTask(local.scriptID);
  }
  pushCef('fishing.show = false; fishing.clearData();');
}

function closeFishMenu(): void {
  busyRemove('fishing.menu');
  pushCef('selectMenu.loader = false; selectMenu.show = false;');
}

function closeRent(): void {
  const vehicle = mint.Player.local?.vehicle;
  if (vehicle) native.freezeEntityPosition(vehicle.scriptID, false);
  focusUi(false);
  pushCef('carSpecifications.show = false; selectMenu.show = false;');
}

function facingWater(local: mint.Player): boolean {
  const heading = native.getEntityHeading(local.scriptID) + 90;
  const rad = heading * (Math.PI / 180);
  const x = local.pos.x + 15 * Math.cos(rad);
  const y = local.pos.y + 15 * Math.sin(rad);
  const [groundOk, ground] = native.getGroundZFor3dCoord(x, y, local.pos.z, null, false, false);
  const [waterOk, height] = native.getWaterHeight(x, y, local.pos.z);
  const surface = Math.abs(height);
  return waterOk && groundOk && surface > 0 && ground < surface && ground !== 0;
}

function canHoldRod(local: mint.Player): boolean {
  if (!holding('invItem_5') || local.vehicle || fishing) return false;
  const ped = local.scriptID;
  return !native.isPedSwimming(ped)
    && !native.isPedSwimmingUnderWater(ped)
    && !native.isPedFalling(ped)
    && !native.isPedJumping(ped)
    && !native.isPedClimbing(ped);
}

export function handleFishing(name: string): boolean {
  if (name === 'fishing.menu.close') {
    closeFishMenu();
    return true;
  }
  if (name === 'fishing.rod.buy') {
    pushCef('selectMenu.loader = true;');
    mint.emitServer('crp:fish:rod');
    return true;
  }
  if (name === 'fishing.fish.sell') {
    pushCef('selectMenu.loader = true;');
    mint.emitServer('crp:fish:sell');
    return true;
  }
  if (name === 'rent.rentmenu.close') {
    closeRent();
    return true;
  }
  return false;
}

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
  mint.onServer('crp:fish:menu', (price) => {
    const value = Number(price) || 0;
    if (!value) {
      closeFishMenu();
      return;
    }
    if (busyHas()) return;
    busyAdd('fishing.menu', false);
    pushCef(`selectMenu.menus["fishingMenu"].items[0].values = ${JSON.stringify([`${value}$`])};
selectMenu.menu = selectMenu.menus["fishingMenu"];
selectMenu.show = true;`);
  });
  mint.onServer('crp:fish:rod:ans', (code, text) => {
    pushCef('selectMenu.loader = false;');
    const ans = Number(code);
    if (ans === 1) {
      closeFishMenu();
      return;
    }
    const note = ans === 3 ? 'Недостаточно денег' : ans === 2 ? String(text ?? 'Ошибка покупки') : 'Ошибка покупки';
    pushCef(`selectMenu.notification = ${JSON.stringify(note)};`);
  });
  mint.onServer('crp:fish:sell:ans', (code) => {
    pushCef('selectMenu.loader = false;');
    if (Number(code) === 1) closeFishMenu();
  });
  mint.onServer('crp:fish:enter', () => {
    fishing = true;
    prompted = false;
    pushCef('prompt.hide(); fishing.show = true;');
    const local = mint.Player.local;
    if (local) native.freezeEntityPosition(local.scriptID, true);
    fishAnim(ROD_ANIM, 'base');
  });
  mint.onServer('crp:fish:fetch', (speed, zone, weight) => {
    fishAnim(WAIT_ANIM, 'idle_c');
    pushCef(`fishing.fishFetch(${Number(speed) || 1}, ${Number(zone) || 10}, ${Number(weight) || 1});`);
  });
  mint.onServer('crp:fish:exit', () => {
    stopFish();
  });
  mint.onServer('crp:prompt', (name) => {
    if (name == null || name === false || name === '') {
      pushCef('prompt.hide();');
      return;
    }
    if (typeof name !== 'string') return;
    if (name.includes(' ') || name.includes('<')) pushCef(`prompt.show(${JSON.stringify(name)});`);
    else pushCef(`prompt.showByName(${JSON.stringify(name)});`);
  });
  mint.onServer('crp:rent:show', (raw) => {
    const data = JSON.parse(String(raw ?? '{}')) as { name?: string; price?: number; mileage?: number };
    const vehicle = mint.Player.local?.vehicle;
    let maxSpeed = 0;
    if (vehicle) {
      native.freezeEntityPosition(vehicle.scriptID, true);
      maxSpeed = Math.round(native.getVehicleModelEstimatedMaxSpeed(native.getEntityModel(vehicle.scriptID)) * 3.6 * 1.05);
    }
    focusUi(true);
    pushCef(`carSpecifications.body = ${JSON.stringify({
      name: { header: 'Название', value: data.name ?? '', unit: '' },
      maxSpeed: { header: 'Макс. скорость', value: String(maxSpeed), unit: 'км/ч' },
      mileage: { header: 'Пробег', value: String(data.mileage ?? 0), unit: 'км' },
    })};
carSpecifications.price = ${JSON.stringify(String(data.price ?? 0))};
carSpecifications.show = true;
selectMenu.showByName('rentMenu');`);
  });
  mint.onServer('crp:rent:close', () => {
    closeRent();
  });
  mint.setInterval(() => {
    const local = mint.Player.local;
    const next = !!local?.valid && canHoldRod(local) && !busyHas() && facingWater(local);
    if (next === water && (next || !prompted)) return;
    water = next;
    prompted = next;
    pushCef(next ? `prompt.showByName('fishing');` : 'prompt.hide();');
  }, 1000);
  mint.everyTick(() => {
    const local = mint.Player.local;
    if (!local?.valid) return;
    if (fishing) {
      native.disableControlAction(0, 30, true);
      native.disableControlAction(0, 31, true);
      native.disableControlAction(0, 21, true);
      native.disableControlAction(0, 22, true);
    }
    if (busyHas() || !native.isControlJustPressed(0, 24)) return;
    if (fishing) {
      if (casting) return;
      casting = true;
      mint.emitServer('crp:fish:start');
      return;
    }
    if (water) mint.emitServer('crp:fish:enter');
  });
  mint.on('keyup', (key) => {
    if (key === 66 && !busyHas() && !mint.Player.local?.vehicle) {
      mint.emitServer('crp:biz:open');
      return;
    }
    if (key !== 69 || busyHas()) return;
    if (garageVehicle()) return;
    mint.emitServer('crp:job:use');
  });
}