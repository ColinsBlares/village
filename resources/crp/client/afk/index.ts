import * as mint from 'mint-client';
import * as native from 'natives';

const WAIT = 15 * 60 * 1000;
const ALPHA = 200;
let lastActive = Date.now();

function localAfk(): boolean {
  return mint.Player.local?.getStreamSyncedMeta('crp:afk') === true;
}

export function touchAfk(): void {
  lastActive = Date.now();
  if (localAfk()) mint.emitServer('crp:afk', false);
}

function apply(player: mint.Player, enable: boolean): void {
  if (!player.valid || player.getStreamSyncedMeta('crp:vanished')) return;
  native.setEntityAlpha(player.scriptID, enable ? ALPHA : 255, false);
  const local = mint.Player.local;
  if (local?.valid) {
    native.setEntityNoCollisionEntity(player.scriptID, local.scriptID, false);
    native.setEntityNoCollisionEntity(local.scriptID, player.scriptID, false);
    for (const vehicle of mint.Vehicle.streamedIn) {
      if (!vehicle.valid) continue;
      native.setEntityNoCollisionEntity(player.scriptID, vehicle.scriptID, false);
      native.setEntityNoCollisionEntity(vehicle.scriptID, player.scriptID, false);
    }
  }
  const vehicle = player.vehicle;
  if (vehicle && (player.seat === 1 || player.seat === 0)) {
    native.setEntityAlpha(vehicle.scriptID, enable ? ALPHA : 255, false);
  }
  if (player === local) {
    native.setEntityProofs(player.scriptID, enable, enable, enable, enable, enable, enable, enable, enable);
    if (vehicle && (player.seat === 1 || player.seat === 0)) {
      native.setEntityProofs(vehicle.scriptID, enable, enable, enable, enable, enable, enable, enable, enable);
    }
  }
}

export function installAfk(): void {
  mint.on('keydown', (key) => {
    if (key === 87 || key === 65 || key === 83 || key === 68 || key === 70) touchAfk();
  });
  mint.on('playerWeaponShoot', () => {
    if (localAfk()) mint.emitServer('crp:afk', false);
  });
  mint.setInterval(() => {
    if (localAfk()) return;
    if (Date.now() - lastActive > WAIT) mint.emitServer('crp:afk', true);
  }, 60 * 1000);
  mint.on('worldObjectStreamIn', (object) => {
    const player = mint.Player.getByScriptID(object.scriptID);
    if (!player) return;
    apply(player, player.getStreamSyncedMeta('crp:afk') === true);
  });
  mint.on('streamSyncedMetaChange', (target, key, value) => {
    if (key !== 'crp:afk') return;
    const player = mint.Player.getByScriptID((target as { scriptID?: number }).scriptID ?? -1);
    if (player) apply(player, value === true);
  });
}
