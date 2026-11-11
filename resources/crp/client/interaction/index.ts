import * as mint from 'mint-client';
import * as native from 'natives';
import { focusUi, pushCef } from '../cef/view.js';
import { busyHas } from '../ui/busy.js';
import { nearestVehicle, openVehicleInteraction, partPoint, setVehicleTarget } from '../factions/index.js';
import { interactionOpen, setInteractionOpen } from './state.js';
const RANGE_PLAYER = 2;
const RANGE_VEHICLE = 7;
const CASINO = { x: 1100.59, y: 219.76 };

let current: mint.Player | null = null;
let selfDocs = false;
let diceListed = false;

export function setSelfDocuments(on: boolean): void {
  selfDocs = on;
}

export function documentTargetPlayer(): mint.Player | null {
  if (selfDocs) {
    const local = mint.Player.local;
    return local?.valid ? local : null;
  }
  return current?.valid ? current : null;
}

function dist(a: mint.Vector3, b: mint.Vector3): number {
  return a.distanceTo(b);
}

export function currentInteractionPlayer(): mint.Player | null {
  return current?.valid ? current : null;
}

function closestPlayer(local: mint.Player): { player: mint.Player; dist: number } | null {
  let best: mint.Player | null = null;
  let min = RANGE_PLAYER;
  for (const player of mint.Player.streamedIn) {
    if (player === local || !player.valid || player.vehicle) continue;
    if (player.getStreamSyncedMeta('crp:vanished')) continue;
    const gap = dist(local.pos, player.pos);
    if (gap < min) {
      best = player;
      min = gap;
    }
  }
  return best ? { player: best, dist: min } : null;
}

function pickTarget(local: mint.Player): 'player' | 'vehicle' | null {
  const near = closestPlayer(local);
  const vehicle = nearestVehicle(local, RANGE_VEHICLE);
  if (near && !vehicle) return 'player';
  if (!near && vehicle) return 'vehicle';
  if (near && vehicle) return near.dist <= dist(local.pos, vehicle.pos) ? 'player' : 'vehicle';
  return null;
}

function openMenu(): void {
  setInteractionOpen(true);
  focusUi(true);
  pushCef('interactionMenu.show = true;');
}

export function closeInteractionMenu(): void {
  if (!interactionOpen()) return;
  setInteractionOpen(false);
  current = null;
  selfDocs = false;
  setVehicleTarget(null);
  focusUi(false);
  pushCef('interactionMenu.show = false;');
}

function closeMenu(): void {
  closeInteractionMenu();
}

function vehiclePoint(local: mint.Player): { x: number; y: number; z: number } | null {
  const vehicle = nearestVehicle(local, 10);
  if (!vehicle) return null;
  const spots = [vehicle.pos, partPoint(vehicle, 'bonnet'), partPoint(vehicle, 'boot')];
  let best: { x: number; y: number; z: number } | null = null;
  let min = 2.5;
  for (const spot of spots) {
    const gap = dist(local.pos, spot as mint.Vector3);
    if (gap < min) {
      best = spot;
      min = gap;
    }
  }
  return best;
}

function hintPoint(local: mint.Player): { x: number; y: number; z: number } | null {
  const near = closestPlayer(local);
  const vehicleSpot = vehiclePoint(local);
  if (near && !vehicleSpot) return near.player.pos;
  if (!near && vehicleSpot) return vehicleSpot;
  if (near && vehicleSpot) return near.dist <= dist(local.pos, vehicleSpot as mint.Vector3) ? near.player.pos : vehicleSpot;
  return null;
}

function drawHint(point: { x: number; y: number; z: number }): void {
  native.setDrawOrigin(point.x, point.y, point.z + 0.45, false);
  native.setTextFont(0);
  native.setTextScale(0.5, 0.5);
  native.setTextColour(255, 255, 255, 185);
  native.setTextCentre(true);
  native.beginTextCommandDisplayText('STRING');
  native.addTextComponentSubstringPlayerName('G');
  native.endTextCommandDisplayText(0, 0, 0);
  native.clearDrawOrigin();
}

function syncDice(local: mint.Player): void {
  const dx = local.pos.x - CASINO.x;
  const dy = local.pos.y - CASINO.y;
  const inside = local.dimension === 1 && dx * dx + dy * dy < 120 * 120;
  if (inside === diceListed) return;
  diceListed = inside;
  if (inside) {
    pushCef(`interactionMenu.addItems('player_interaction', ${JSON.stringify([{ text: 'Бросить кости', icon: 'dice.svg' }])});`);
    return;
  }
  pushCef(`interactionMenu.deleteItem('player_interaction', 'Бросить кости');`);
}

export function installInteraction(): void {
  mint.everyTick(() => {
    const local = mint.Player.local;
    if (!local?.valid) return;
    syncDice(local);
    if (local.vehicle || interactionOpen()) return;
    const point = hintPoint(local);
    if (point) drawHint(point);
  });
  mint.on('keyup', (key) => {
    if (key === 76) {
      if (interactionOpen()) {
        closeMenu();
        return;
      }
      if (busyHas()) return;
      const local = mint.Player.local;
      if (!local?.valid) return;
      if (local.vehicle && (local.seat === 1 || local.seat === 0)) {
        current = null;
        selfDocs = false;
        pushCef(`interactionMenu.menu = cloneObj(interactionMenu.menus["vehicle_inside"]);
interactionMenu.left = 60;`);
        openMenu();
        return;
      }
      if (local.vehicle) return;
      current = null;
      setSelfDocuments(true);
      setVehicleTarget(null);
      pushCef(`interactionMenu.menu = interactionMenu.menus["player_ownmenu"];
interactionMenu.left = 50;`);
      openMenu();
      return;
    }
    if (key !== 71) return;
    if (interactionOpen()) {
      closeMenu();
      return;
    }
    if (busyHas()) return;
    const local = mint.Player.local;
    if (!local?.valid || local.vehicle) return;

    const kind = pickTarget(local);
    if (!kind) return;

    if (kind === 'vehicle') {
      const vehicle = nearestVehicle(local, RANGE_VEHICLE);
      if (!vehicle) return;
      current = null;
      selfDocs = false;
      openVehicleInteraction(vehicle);
      setInteractionOpen(true);
      return;
    }

    const near = closestPlayer(local);
    if (!near) return;
    current = near.player;
    setSelfDocuments(false);
    setVehicleTarget(null);
    pushCef('interactionMenu.showByName("player_interaction");');
    pushCef('interactionMenu.left = 50;');
    openMenu();
  });
}
