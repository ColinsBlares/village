import * as mint from 'mint-client';
import * as native from 'natives';
import { pushCef } from '../cef/view.js';
import { busyAdd, busyHas, busyRemove } from '../ui/busy.js';

const MODELS = [1, 2, 3, 4, 5, 6, 7, 8].map((variant) => ({
  variant,
  hash: native.getHashKey(`vw_prop_casino_slot_0${variant}a`),
  reel: native.getHashKey(`vw_prop_casino_slot_0${variant}a_reels`),
  blur: native.getHashKey(`vw_prop_casino_slot_0${variant}b_reels`),
}));
const OFFSETS = [[-0.115, 0.047, 1.106], [0.005, 0.047, 1.106], [0.125, 0.047, 1.106]];
const BETS = [50, 100, 250, 500, 1000];
const ENTER = ['enter_left', 'enter_right', 'enter_left_short', 'enter_right_short'];
const STEP = 60;

interface Machine {
  variant: number;
  hash: number;
  reel: number;
  blur: number;
  handle: number;
}

interface Reel {
  handle: number;
  rest: number;
  blur: boolean;
  pitch: number;
}

interface Spin {
  reels: { start: number; dur: number; symbol: number }[];
  result: { reels: number[]; win: boolean; payout: number };
}

let near: Machine | null = null;
let seated = false;
let ready = false;
let leaving = false;
let reacting = false;
let locked = false;
let side: 'left' | 'right' = 'right';
let phase: 'walk' | 'enter' | null = null;
let since = 0;
let token = 0;
let bet = 1;
let lastWin = 0;
let heading = 0;
let origin: { x: number; y: number; z: number } | null = null;
let enterAt: { x: number; y: number; z: number; h: number; name: string } | null = null;
let reels: Reel[] = [];
let spin: Spin | null = null;
let scaleform: number | null = null;
let screen = -1;
let screenName: string | null = null;
let detectAt = 0;
let idleAt = 0;

function male(): boolean {
  const local = mint.Player.local;
  return !!local && local.model === native.getHashKey('mp_m_freemode_01');
}

function dict(): string {
  return male()
    ? 'anim_casino_a@amb@casino@games@slots@male'
    : 'anim_casino_a@amb@casino@games@slots@female';
}

function note(text: string): void {
  pushCef(`notifications.info(${JSON.stringify(text)}, 'Слоты');`);
}

function place(x: number, y: number, z: number, face: number, ox: number, oy: number, oz: number): { x: number; y: number; z: number } {
  const rad = (face * Math.PI) / 180;
  return {
    x: x + ox * Math.cos(rad) - oy * Math.sin(rad),
    y: y + ox * Math.sin(rad) + oy * Math.cos(rad),
    z: z + oz,
  };
}

function detect(): void {
  const local = mint.Player.local;
  if (!local?.valid) return;
  let best: Machine | null = null;
  let bestDist = 2;
  for (const model of MODELS) {
    const handle = native.getClosestObjectOfType(local.pos.x, local.pos.y, local.pos.z, 2, model.hash, false, false, false);
    if (!handle) continue;
    const coords = native.getEntityCoords(handle, false);
    const dist = Math.hypot(coords.x - local.pos.x, coords.y - local.pos.y, coords.z - local.pos.z);
    if (dist < bestDist) {
      bestDist = dist;
      best = { ...model, handle };
    }
  }
  near = best;
}

function pose(machine: Machine): { x: number; y: number; z: number; h: number } | null {
  const coords = native.getEntityCoords(machine.handle, false);
  const face = native.getEntityHeading(machine.handle);
  if (!Number.isFinite(coords.x) || !Number.isFinite(face)) return null;
  return { x: coords.x, y: coords.y, z: coords.z, h: (face % 360 + 360) % 360 };
}

function play(name: string, x: number, y: number, z: number, face: number, flag: number): void {
  const local = mint.Player.local;
  if (!local?.valid) return;
  native.taskPlayAnimAdvanced(local.scriptID, dict(), name, x, y, z, 0, 0, face, 3, -8, -1, flag, 0, 0, 0);
}

function sit(): void {
  if (seated || !near || busyHas()) return;
  const machine = near;
  const spot = pose(machine);
  const local = mint.Player.local;
  if (!spot || !local?.valid) return note('Не удалось встать к автомату');
  native.requestAnimDict(dict());
  let tries = 0;
  const poll = mint.setInterval(() => {
    if (!native.hasAnimDictLoaded(dict()) && ++tries <= 40) return;
    mint.clearInterval(poll);
    const line = dict();
    let best: { name: string; x: number; y: number; z: number; h: number; dist: number } | null = null;
    for (const name of ENTER) {
      const pos = native.getAnimInitialOffsetPosition(line, name, spot.x, spot.y, spot.z, 0, 0, spot.h, 0.01, 2);
      const rot = native.getAnimInitialOffsetRotation(line, name, spot.x, spot.y, spot.z, 0, 0, spot.h, 0.01, 2);
      const dist = Math.hypot(pos.x - local.pos.x, pos.y - local.pos.y, pos.z - local.pos.z);
      if (dist < 2.5 && (!best || dist < best.dist)) best = { name, x: pos.x, y: pos.y, z: pos.z, h: Number.isFinite(rot.z) ? rot.z : spot.h, dist };
    }
    if (!best) return note('Подойдите ближе к стулу');
    token += 1;
    seated = true;
    ready = false;
    leaving = false;
    locked = false;
    origin = spot;
    heading = spot.h;
    side = best.name.includes('right') ? 'right' : 'left';
    enterAt = best;
    phase = 'walk';
    since = Date.now();
    busyAdd('casino.slots', false);
    mint.emitServer('crp:slots:sit');
    native.taskGoStraightToCoord(local.scriptID, best.x, best.y, best.z, 1, 4000, best.h, 0.35);
    createReels(machine);
    enableScreen(machine);
    note('Стрелки — ставка, Enter — крутить, Backspace — выйти');
  }, 50);
}

function finishExit(): void {
  token += 1;
  seated = false;
  ready = false;
  leaving = false;
  phase = null;
  enterAt = null;
  locked = false;
  spin = null;
  const local = mint.Player.local;
  if (local?.valid) native.clearPedTasksImmediately(local.scriptID);
  for (const reel of reels) if (reel.handle) native.deleteObject(reel.handle);
  reels = [];
  if (scaleform != null) native.setScaleformMovieAsNoLongerNeeded(scaleform);
  scaleform = null;
  if (screenName && native.isNamedRendertargetRegistered(screenName)) native.releaseNamedRendertarget(screenName);
  screenName = null;
  screen = -1;
  origin = null;
  busyRemove('casino.slots');
}

function leave(): void {
  if (!seated || leaving) return;
  if (!ready) return finishExit();
  leaving = true;
  locked = true;
  spin = null;
  const current = token;
  const name = side === 'right' ? 'exit_right' : 'exit_left';
  if (origin) play(name, origin.x, origin.y, origin.z, heading, 512);
  mint.setTimeout(() => {
    if (current === token) finishExit();
  }, 3200);
}

function reelPos(index: number): { x: number; y: number; z: number } | null {
  const off = OFFSETS[index];
  if (!origin || !off) return null;
  return place(origin.x, origin.y, origin.z, heading, off[0], off[1], off[2]);
}

function spawnReel(hash: number, index: number, pitch: number): number {
  const pos = reelPos(index);
  if (!pos) return 0;
  const handle = native.createObject(hash, pos.x, pos.y, pos.z, false, false, false);
  native.freezeEntityPosition(handle, true);
  native.setEntityCollision(handle, false, false);
  native.setEntityRotation(handle, pitch, 0, heading, 2, true);
  return handle;
}

function createReels(machine: Machine): void {
  const current = token;
  native.requestModel(machine.reel);
  let tries = 0;
  const poll = mint.setInterval(() => {
    if (!native.hasModelLoaded(machine.reel) && ++tries <= 60) return;
    mint.clearInterval(poll);
    if (!seated || current !== token) return;
    reels = [0, 1, 2].map((index) => ({ handle: spawnReel(machine.reel, index, 0), rest: 0, blur: false, pitch: 0 }));
    native.setModelAsNoLongerNeeded(machine.reel);
  }, 50);
}

function enableScreen(machine: Machine): void {
  screenName = `machine_0${machine.variant}a`;
  native.registerNamedRendertarget(screenName, false);
  native.linkNamedRendertarget(machine.hash);
  screen = native.getNamedRendertargetRenderId(screenName);
  scaleform = native.requestScaleformMovie('SLOT_MACHINE');
  let tries = 0;
  const poll = mint.setInterval(() => {
    if (scaleform != null && native.hasScaleformMovieLoaded(scaleform)) {
      mint.clearInterval(poll);
      native.beginScaleformMovieMethod(scaleform, 'SET_THEME');
      native.scaleformMovieMethodAddParamInt(machine.variant - 1);
      native.endScaleformMovieMethod();
      paintScreen();
      return;
    }
    if (++tries > 60) mint.clearInterval(poll);
  }, 50);
}

function paintScreen(): void {
  if (scaleform == null) return;
  native.beginScaleformMovieMethod(scaleform, 'SET_BET');
  native.scaleformMovieMethodAddParamInt(BETS[bet]);
  native.endScaleformMovieMethod();
  native.beginScaleformMovieMethod(scaleform, 'SET_LAST_WIN');
  native.scaleformMovieMethodAddParamInt(lastWin);
  native.endScaleformMovieMethod();
}

function text(value: string, y: number): void {
  native.setTextFont(4);
  native.setTextScale(0.45, 0.45);
  native.setTextColour(255, 255, 255, 220);
  native.setTextCentre(true);
  native.setTextOutline();
  native.beginTextCommandDisplayText('STRING');
  native.addTextComponentSubstringPlayerName(value);
  native.endTextCommandDisplayText(0.5, y, 0);
}

function startSpin(result: Spin['result']): void {
  if (!seated || reels.length < 3 || !near) {
    locked = false;
    return;
  }
  const now = Date.now();
  spin = {
    result,
    reels: result.reels.map((symbol, index) => ({ start: now, dur: 2000 * (index + 1), symbol })),
  };
}

export function installSlots(): void {
  mint.onServer('crp:slots:result', (raw) => {
    const data = JSON.parse(String(raw ?? '{}')) as { reels?: number[]; win?: boolean; payout?: number };
    if (!Array.isArray(data.reels)) {
      locked = false;
      return;
    }
    startSpin({ reels: data.reels, win: !!data.win, payout: Number(data.payout) || 0 });
  });
  mint.onServer('crp:slots:fail', () => {
    locked = false;
  });
  mint.on('keyup', (key) => {
    if (key !== 69 || seated) return;
    detect();
    if (!near) return;
    if (busyHas()) return note('Сейчас нельзя сесть');
    sit();
  });
  mint.on('keydown', (key) => {
    if (!seated) return;
    if ((key === 38 || key === 40) && ready && !locked && !leaving) {
      bet = Math.max(0, Math.min(BETS.length - 1, bet + (key === 38 ? 1 : -1)));
      paintScreen();
    }
    if ((key === 13 || key === 32) && ready && !leaving && !locked && !spin) {
      locked = true;
      mint.emitServer('crp:casino:slots', BETS[bet]);
    }
    if (key === 8) leave();
  });
  mint.everyTick(() => {
    const local = mint.Player.local;
    if (!local?.valid) return;
    const now = Date.now();
    if (!seated && now - detectAt > 250) {
      detectAt = now;
      const interior = native.getInteriorAtCoords(local.pos.x, local.pos.y, local.pos.z);
      if (interior === 275201) detect();
      else near = null;
    }
    if (!seated) {
      if (near && !busyHas()) text('E — играть в слоты', 0.82);
      return;
    }
    if (!ready && !leaving && enterAt && phase) {
      const dist = Math.hypot(local.pos.x - enterAt.x, local.pos.y - enterAt.y);
      if (phase === 'walk' && (dist < 0.4 || now - since > 2500)) {
        phase = 'enter';
        since = now;
        play(enterAt.name, enterAt.x, enterAt.y, enterAt.z, enterAt.h, 512);
      } else if (phase === 'enter') {
        const time = native.getEntityAnimCurrentTime(local.scriptID, dict(), enterAt.name);
        if (time > 0.6 || now - since > 3500) {
          ready = true;
          phase = null;
          if (origin) play('base_idle_b', origin.x, origin.y, origin.z, heading, 513);
        }
      }
    }
    for (const control of [21, 22, 24, 25, 30, 31, 32, 33, 34, 35, 44, 140, 141, 142]) native.disableControlAction(0, control, true);
    if (spin) {
      let done = true;
      spin.reels.forEach((reel, index) => {
        const live = reels[index];
        if (!live) return;
        if (now < reel.start + reel.dur) {
          done = false;
          live.pitch += 7;
          if (live.handle) native.setEntityRotation(live.handle, live.pitch, 0, heading, 0, true);
          return;
        }
        const pitch = reel.symbol * STEP + (index === 2 ? 0.28 : 0);
        if (live.handle) native.setEntityRotation(live.handle, pitch, 0, heading, 2, true);
        live.rest = pitch;
        live.pitch = pitch;
      });
      if (done) {
        const result = spin.result;
        spin = null;
        lastWin = result.win ? result.payout : 0;
        paintScreen();
        locked = false;
        reacting = true;
        if (origin) play(result.win ? 'win_a' : 'lose_a', origin.x, origin.y, origin.z, heading, 513);
        mint.setTimeout(() => {
          reacting = false;
          if (seated && origin) play('base_idle_b', origin.x, origin.y, origin.z, heading, 513);
        }, 2200);
        mint.emitServer('crp:slots:done');
      }
    } else if (ready && !leaving && !reacting && now - idleAt > 1000) {
      idleAt = now;
      if (origin && !native.isEntityPlayingAnim(local.scriptID, dict(), 'base_idle_b', 3)) {
        play('base_idle_b', origin.x, origin.y, origin.z, heading, 513);
      }
    }
    if (scaleform != null && screen !== -1) {
      native.setTextRenderId(screen);
      native.setScriptGfxDrawOrder(4);
      native.setScriptGfxDrawBehindPausemenu(true);
      native.drawScaleformMovieFullscreen(scaleform, 255, 255, 255, 255, 0);
      native.setTextRenderId(1);
    }
    text(`Ставка $${BETS[bet]}   Выигрыш $${lastWin}`, 0.86);
    text(spin ? 'Крутится...' : 'Стрелки — ставка, Enter — крутить, Backspace — выйти', 0.9);
  });
}
