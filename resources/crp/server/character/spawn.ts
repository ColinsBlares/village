import * as mint from 'mint-server';
import { writeCrash } from '../core/log.js';
import { randomInteger } from '../core/utils.js';
import { endPreload } from '../player/gate.js';
import { getSession, type DbRow } from '../player/session.js';
import { applyAppearance } from './appearance.js';
import { cef } from '../ui/send.js';
import { sendInventory } from '../inventory/index.js';
import { joinVoice } from '../voice/index.js';
import { openFaction } from '../factions/index.js';
import { placesFor } from '../factions/warehouse.js';
import { startSatiety, stopSatiety } from '../world/satiety.js';
import { takeMinutes, touchClock } from '../world/time.js';
import { sendAttachCatalog, syncWornGuns } from '../attaches/index.js';
import { spawnOwnedVehicles } from '../vehicles/garage.js';
import { sendPhone } from '../phone/index.js';
import { armPlayer } from '../anticheat/index.js';
import { initJobSkills } from '../jobs/index.js';
import { pushPlayerMenu } from '../player/menu.js';
import { announcePlayer, loadPlayerList, pushOnline } from '../hud/players.js';
import { resumeArrest } from '../police/index.js';
import { sendFamiliarList } from '../familiar/index.js';
import { syncFamily } from '../family/control.js';
import { resumeQuests } from '../quests/index.js';
import { sendChangelist } from '../changelist/index.js';
import { sendBandZones } from '../war/index.js';
import { syncSpouse } from '../wedding/index.js';
import { checkPromocode } from '../promocodes/index.js';
import { syncDoors } from '../world/doors.js';
import { applySettings } from '../settings/index.js';
import { sendDrunkInit } from '../clubs/drunk.js';
import { warnTaxes } from '../world/tax.js';

const STREETS = [
  [-252.915, -338.68, 29.706],
  [258.905, -1112.866, 29.438],
  [-197.68, -804.042, 30.454],
  [1155.053, -470.556, 66.54],
  [-164.787, 6426.599, 31.886],
  [1958.814, 3844.359, 31.985],
];

export function streetSpawn(): { x: number; y: number; z: number; h: number } {
  const index = Math.min(STREETS.length - 1, Math.max(0, randomInteger(0, STREETS.length - 1)));
  const point = STREETS[index];
  return { x: point[0], y: point[1], z: point[2], h: randomInteger(0, 359) };
}

function pointOf(character: DbRow): { x: number; y: number; z: number; h: number } {
  const x = Number(character.x);
  const y = Number(character.y);
  const z = Number(character.z);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || (x === 0 && y === 0 && z === 0)) {
    return streetSpawn();
  }
  return { x, y, z, h: Number(character.h) || 0 };
}

/** Снимает прелоад и ставит спавн в очереди. dimension пишется только пока спавн не летит. */
export function enterWorld(player: mint.Player, character: DbRow): void {
  const session = getSession(player);
  session.character = character;
  const point = pointOf(character);
  const male = Number(character.gender) !== 1;
  if (player.isSpawned) player.despawn();
  player.model = male ? 'mp_m_freemode_01' : 'mp_f_freemode_01';
  if (!player.isSpawned) player.dimension = 0;
  player.maxHealth = 100;
  player.maxArmour = 100;
  player.invincible = true;
  player.frozen = true;
  player.visible = false;
  player.setSyncedMeta('crp:phase', 'enter');
  player.spawn(point.x, point.y, point.z);
  character.h = point.h;
}

export async function finishEnter(player: mint.Player): Promise<void> {
  const character = getSession(player).character;
  if (!character) return;
  const health = Number(character.health);
  player.health = Number.isFinite(health) ? Math.max(0, Math.min(player.maxHealth, health)) : player.maxHealth;
  player.armour = 0;
  try {
    await applyAppearance(player, character);
  } catch (err) {
    writeCrash('character.appearance', err);
  }
  const heading = (Number(character.h) || 0) * (Math.PI / 180);
  try {
    player.rot = new mint.Vector3(0, 0, heading);
  } catch (err) {
    writeCrash('character.heading', err);
  }
  getSession(player).spawnedAt = Date.now();
  const satiety = Number(character.satiety) || 0;
  const thirst = Number(character.thirst) || 0;
  cef(player, `inventory.satiety = ${satiety}; inventory.thirst = ${thirst}; mp.event.call('hud.show', true); mp.event.call('hud.setData', ${JSON.stringify({
    cash: Number(character.cash) || 0,
    bank: Number(character.bank) || 0,
    playerId: player.id,
    satiety,
    thirst,
    wanted: Number(character.wanted) || 0,
  })}); playerMenu.enable = true;`);
  touchClock(player);
  startSatiety(player);
  endPreload(player);
  joinVoice(player);
  void sendInventory(player).catch((err: unknown) => writeCrash('inventory.open', err));
  void import('../inventory/holder.js').then((mod) => mod.initHolderItems(player)).catch((err: unknown) => writeCrash('inventory.holder', err));
  void openFaction(player).catch((err: unknown) => writeCrash('factions.open', err));
  void sendAttachCatalog(player).then(() => syncWornGuns(player)).catch((err: unknown) => writeCrash('attaches.catalog', err));
  void spawnOwnedVehicles(player).catch((err: unknown) => writeCrash('vehicles.private', err));
  void sendPhone(player, true).catch((err: unknown) => writeCrash('phone.send', err));
  resumeArrest(player);
  player.emit('crp:faction:places', JSON.stringify(placesFor(Number(character.factionId) || 0)));
  player.setStreamSyncedMeta('crp:name', String(character.name ?? ''));
  player.setStreamSyncedMeta('crp:faction', Number(character.factionId) || 0);
  armPlayer(player);
  void applySettings(player)
    .then(() => pushPlayerMenu(player))
    .then(() => initJobSkills(player))
    .catch((err: unknown) => writeCrash('player.menu', err));
  void sendFamiliarList(player).catch((err: unknown) => writeCrash('familiar.list', err));
  void syncFamily(player).catch((err: unknown) => writeCrash('family.sync', err));
  void resumeQuests(player).catch((err: unknown) => writeCrash('quests.resume', err));
  sendChangelist(player);
  void syncSpouse(player).catch((err: unknown) => writeCrash('wedding.sync', err));
  void checkPromocode(player).catch((err: unknown) => writeCrash('promo.check', err));
  warnTaxes(player);
  syncDoors(player);
  sendDrunkInit(player);
  sendBandZones(player);
  const admin = Number(character.admin) || 0;
  pushOnline();
  announcePlayer(player);
  if (admin > 0) loadPlayerList(player);
  if (admin > 0) {
    player.emit('crp:admin:level', admin);
    cef(player, 'terminal.enable = true;');
  }
}

export async function saveQuit(player: mint.Player, snapshot: mint.PlayerDisconnectSnapshot): Promise<void> {
  const session = getSession(player);
  const character = session.character;
  if (session.account && player.valid) {
    session.account.lastIp = player.ip;
    session.account.lastDate = new Date();
    await session.account.save();
  }
  if (!character || session.spawnedAt === 0) return;
  stopSatiety(player);
  const played = takeMinutes(player);
  if (played > 0) character.minutes = (Number(character.minutes) || 0) + played;
  character.health = Math.max(0, Math.min(100, Math.round(snapshot.health)));
  if (snapshot.dimension === 0) {
    character.x = snapshot.position.x;
    character.y = snapshot.position.y;
    character.z = snapshot.position.z;
    character.h = snapshot.rotation.z * (180 / Math.PI);
  }
  await character.save();
}
