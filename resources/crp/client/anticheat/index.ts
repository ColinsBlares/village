import * as mint from 'mint-client';
import * as native from 'natives';
import { isFlying } from '../admin/fly.js';

const UNARMED = 2725352035;
const flags: Record<string, boolean> = {};
let ready = false;
let serverGod = false;
let lastCheck = 0;
let lastReset = 0;
let dirtyGod = false;
const reported = new Map<string, number>();
let reportFrame = -1;
let frame = 0;

function report(name: string): void {
  if (!ready || !flags[name]) return;
  const now = Date.now();
  if (reportFrame === frame) return;
  const last = reported.get(name) ?? 0;
  if (now - last < 5000) return;
  reported.set(name, now);
  reportFrame = frame;
  mint.emitServer('crp:ac:report', name);
}

function vanished(): boolean {
  return !!mint.Player.local.getStreamSyncedMeta('crp:vanished');
}

function checkAll(): void {
  if (isFlying()) return;
  const local = mint.Player.local;
  const id = local.scriptID;
  if (flags.weapon) {
    const hash = native.getSelectedPedWeapon(id) >>> 0;
    if (hash !== 0 && hash !== UNARMED) report('weapon');
  }
  if (flags.spectate && native.getFakeSpectatorMode()) report('spectate');
  if (flags.invisible && !vanished()) {
    if (native.getEntityAlpha(id) < 200 || !native.isEntityVisible(id)) report('invisible');
  }
  if (flags.godmode && !serverGod && native.getPlayerInvincible(native.playerId())) report('godmode');
  if (flags.freecam && native.getRenderingCam() !== -1) return;
}

function resetNatives(): void {
  const id = mint.Player.local.scriptID;
  const player = native.playerId();
  native.setRunSprintMultiplierForPlayer(player, 1);
  native.setSwimMultiplierForPlayer(player, 1);
  native.setPlayerWeaponDamageModifier(player, 1);
  native.setPlayerMeleeWeaponDamageModifier(player, 1, false);
  native.setPlayerWeaponDefenseModifier(player, 1);
  native.setPlayerHealthRechargeMultiplier(player, 0);
  native.setPedInfiniteAmmo(id, false, 0);
  native.setPedInfiniteAmmoClip(id, false);
  if (serverGod || isFlying()) return;
  const god = native.getPlayerInvincible(player);
  if (god && dirtyGod && flags.modifier) report('modifier');
  dirtyGod = god;
  native.setPlayerInvincible(player, false);
  native.setEntityInvincible(id, false, false);
  native.setEntityProofs(id, false, false, false, false, false, false, false, false);
}

export function installAnticheat(): void {
  mint.onServer('crp:ac:init', (raw) => {
    if (typeof raw !== 'string') return;
    const next = JSON.parse(raw) as Record<string, boolean>;
    for (const key of Object.keys(flags)) delete flags[key];
    Object.assign(flags, next);
    ready = true;
  });
  mint.onServer('crp:ac:ping', (nonce) => {
    if (typeof nonce === 'number') mint.emitServer('crp:ac:pong', nonce);
  });
  mint.onServer('crp:ac:god', (on) => {
    serverGod = on === true;
  });
  mint.everyTick(() => {
    frame += 1;
    if (!ready) return;
    const now = Date.now();
    if (now - lastCheck >= 500) {
      lastCheck = now;
      checkAll();
    }
    if (now - lastReset >= 1000) {
      lastReset = now;
      resetNatives();
    }
  });
}

