import * as mint from 'mint-server';
import { setColshapeHandlers } from '../core/colshapes.js';
import { addJobExp, assignJob, clearJob, onJobClear, payJob } from '../jobs/index.js';
import { getSession } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifySuccess } from '../ui/notify.js';
import { parkStored, vehicleState } from '../vehicles/index.js';
import { removeCash } from '../world/money.js';
import { TRACTOR_POINTS } from './route.js';

const JOB = 8;
const RENT = 100;
const PAY = 5;
const EXP = 0.2;
const HEADER = 'Уборка снега';

const rentByVehicle = new WeakMap<mint.Vehicle, number>();
const rentByCharacter = new Map<number, mint.Vehicle>();
const rentByPlayer = new Map<number, number>();
const route = new Map<number, number>();

function tractor(player: mint.Player): mint.Vehicle | null {
  const vehicle = player.vehicle;
  if (!vehicle || (player.seat !== 1 && player.seat !== 0)) return null;
  const state = vehicleState(vehicle);
  if (!state || state.key !== 'job' || state.owner !== JOB) return null;
  return vehicle;
}

function lockDrive(player: mint.Player, locked: boolean): void {
  mint.emitClient(player, 'crp:winter:lock', locked);
}

function sendPoint(player: mint.Player, index: number): void {
  const point = TRACTOR_POINTS[index];
  const next = TRACTOR_POINTS[index + 1] ?? point;
  if (!point || !next) return;
  mint.emitClient(player, 'crp:winter:point', point[0], point[1], point[2], next[0], next[1], next[2]);
}

function dropRoute(player: mint.Player): void {
  if (!route.delete(player.id)) return;
  if (player.valid) mint.emitClient(player, 'crp:winter:clear');
}

function startRoute(player: mint.Player): void {
  route.set(player.id, 0);
  sendPoint(player, 0);
}

function releaseRent(characterId: number, playerId: number): mint.Vehicle | null {
  const vehicle = rentByCharacter.get(characterId);
  rentByCharacter.delete(characterId);
  rentByPlayer.delete(playerId);
  if (vehicle) rentByVehicle.delete(vehicle);
  return vehicle ?? null;
}

function playerByCharacter(characterId: number): mint.Player | null {
  for (const player of mint.Player.all) {
    if (Number(getSession(player).character?.id) === characterId) return player;
  }
  return null;
}

function offerRent(player: mint.Player): void {
  cef(player, `offerDialog.show('winter_job', ${JSON.stringify({ price: RENT })});`);
}

export function installWinter(): void {
  const pedPos = new mint.Vector3(-629.31494140625, -1635.0389404296875, 25.974966049194336);
  new mint.Ped(
    'u_m_m_promourn_01',
    pedPos,
    new mint.Vector3(0, 0, (201.21652221679688 * Math.PI) / 180),
    200,
    true,
    0,
    true,
  );
  new mint.Marker(
    mint.MarkerType.MarkerCylinder,
    -629.153564453125,
    -1635.9073486328125,
    25.974946975708008 - 1,
    0, 0, 0, 0, 0, 0,
    0.4, 0.4, 0.4,
    128, 255, 255, 125,
    0,
  );
  new mint.PointBlip(599, pedPos.x, pedPos.y, pedPos.z, 4, 0.8, true, 0, 'Уборщик');
  const shape = new mint.ColshapeSphere(-629.153564453125, -1635.9073486328125, 25.974946975708008, 0.7, 0, true);
  setColshapeHandlers(shape, {
    onEnter: (player) => cef(player, `selectMenu.showByName('winterJob');`),
    onExit: (player) => cef(player, 'selectMenu.show = false;'),
  });

  onJobClear((player) => {
    dropRoute(player);
    const characterId = Number(getSession(player).character?.id) || rentByPlayer.get(player.id) || 0;
    if (characterId) releaseRent(characterId, player.id);
  });

  mint.onClient('crp:winter:job', (player) => {
    const character = getSession(player).character;
    if (!character) return;
    if (!character.carLicense) {
      notifyError(player, 'Необходимо водительское удостоверение', 'Уборщик');
      return;
    }
    assignJob(player, JOB, 'Устройство на работу');
  });

  mint.onClient('crp:winter:leave', (player) => {
    clearJob(player);
  });

  mint.onClient('crp:winter:rent', async (player) => {
    const character = getSession(player).character;
    const vehicle = tractor(player);
    if (!character || !vehicle) {
      notifyError(player, 'Не в тракторе', 'Аренда трактора');
      return;
    }
    if (Number(character.job) !== JOB) {
      notifyError(player, 'Не на работе', 'Аренда трактора');
      return;
    }
    if (rentByVehicle.has(vehicle)) {
      notifyError(player, 'Уже арендован', 'Аренда трактора');
      return;
    }
    if ((Number(character.cash) || 0) < RENT) {
      notifyError(player, `Необходимо $${RENT}`, 'Аренда трактора');
      return;
    }
    lockDrive(player, false);
    const paid = await removeCash(player, RENT);
    if (!player.valid) return;
    if (!paid) {
      lockDrive(player, true);
      notifyError(player, 'Ошибка списания наличных', 'Аренда трактора');
      return;
    }
    const characterId = Number(character.id);
    const previous = rentByCharacter.get(characterId);
    if (previous && previous !== vehicle) releaseRent(characterId, player.id);
    dropRoute(player);
    rentByVehicle.set(vehicle, characterId);
    rentByCharacter.set(characterId, vehicle);
    rentByPlayer.set(player.id, characterId);
    setTimeout(() => {
      if (player.valid) cef(player, `prompt.showByName('winter_job');`);
    }, 5000);
    startRoute(player);
    notifySuccess(player, 'Удачной работы!', 'Аренда трактора');
  });

  mint.onClient('crp:winter:next', (player) => {
    const index = route.get(player.id);
    const point = index == null ? undefined : TRACTOR_POINTS[index];
    if (index == null || !point) return;
    const dx = player.pos.x - point[0];
    const dy = player.pos.y - point[1];
    if (dx * dx + dy * dy > 12 * 12) return;
    const character = getSession(player).character;
    if (!tractor(player)) {
      notifyError(player, 'Необходимо находиться в тракторе', HEADER);
      return;
    }
    if (!character || Number(character.job) !== JOB) {
      notifyError(player, 'Вы не работаете уборщиком', HEADER);
      return;
    }
    character.pay = (Number(character.pay) || 0) + PAY;
    void character.save();
    if (index >= TRACTOR_POINTS.length - 1) {
      dropRoute(player);
      notifySuccess(player, 'Снега стало меньше!', HEADER);
      void payJob(player);
      void addJobExp(player, EXP, JOB);
      return;
    }
    const next = index + 1;
    route.set(player.id, next);
    sendPoint(player, next);
  });

  mint.on('playerEnteredVehicle', (player, vehicle, seat) => {
    if (seat !== 1 && seat !== 0) return;
    const state = vehicleState(vehicle);
    if (!state || state.key !== 'job' || state.owner !== JOB) return;
    const character = getSession(player).character;
    if (!character || Number(character.job) !== JOB) return;
    const characterId = Number(character.id);
    let holder = rentByVehicle.get(vehicle) ?? 0;
    lockDrive(player, !holder || holder !== characterId);
    if (!holder) {
      offerRent(player);
      return;
    }
    if (holder !== characterId) {
      if (!playerByCharacter(holder)) {
        rentByVehicle.delete(vehicle);
        for (const [id, rented] of rentByCharacter) {
          if (rented === vehicle) rentByCharacter.delete(id);
        }
        holder = 0;
        lockDrive(player, true);
        offerRent(player);
        return;
      }
      player.pos = new mint.Vector3(vehicle.pos.x + 2, vehicle.pos.y, vehicle.pos.z);
      notifyError(player, 'Трактор арендован другим игроком', 'Аренда трактора');
      return;
    }
    if (!route.has(player.id)) startRoute(player);
  });

  mint.on('playerDisconnect', (player) => {
    route.delete(player.id);
    const characterId = rentByPlayer.get(player.id) ?? 0;
    if (!characterId) return;
    const rented = releaseRent(characterId, player.id);
    if (rented?.valid) parkStored(rented);
  });
}
