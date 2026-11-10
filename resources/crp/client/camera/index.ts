import * as mint from 'mint-client';
import * as native from 'natives';

const CAM_POS = { x: -1685.21, y: -1653.46, z: 193.55 };
const CAM_LOOK = { x: -1639.35, y: -1575.13, z: 187.48 };

let cam = 0;
let selectMode = false;
let glideFrom = { x: 0, y: 0, z: 0, lx: 0, ly: 0, lz: 0 };
let glideTo = { x: 0, y: 0, z: 0, lx: 0, ly: 0, lz: 0 };
let glideAt = 0;
let glideMs = 0;
let hasSelect = false;

const BASE = { x: -222.94, y: 6584.72, z: 8 };
const DIST = 2.5;
const GAP = 2.5;
const ANGLE = (70 * Math.PI) / 180;
const LINE = ((225 - 90) * Math.PI) / 180;

function selectView(index: number): {
  cam: { x: number; y: number; z: number };
  look: { x: number; y: number; z: number };
  ped: { x: number; y: number; z: number; heading: number };
} {
  const alongX = Math.sin(LINE);
  const alongY = Math.cos(LINE);
  const faceX = Math.sin(ANGLE);
  const faceY = Math.cos(ANGLE);
  const cam = {
    x: BASE.x + index * GAP * alongX,
    y: BASE.y + index * GAP * alongY,
    z: BASE.z,
  };
  const look = {
    x: cam.x + DIST * faceX,
    y: cam.y + DIST * faceY,
    z: BASE.z - 0.4,
  };
  return { cam, look, ped: { x: look.x, y: look.y, z: BASE.z, heading: 120 } };
}

function ensureCam(): number {
  if (cam !== 0) return cam;
  cam = native.createCam('DEFAULT_SCRIPTED_CAMERA', true);
  if (cam === 0) return 0;
  native.setCamFov(cam, 60);
  native.setCamActive(cam, true);
  native.renderScriptCams(true, false, 0, true, false, 0);
  return cam;
}

export function showPreloadCam(): void {
  if (selectMode) return;
  const handle = ensureCam();
  if (handle === 0) return;
  native.setCamCoord(handle, CAM_POS.x, CAM_POS.y, CAM_POS.z);
  native.pointCamAtCoord(handle, CAM_LOOK.x, CAM_LOOK.y, CAM_LOOK.z);
}

export function showSelectCam(index: number): void {
  selectMode = true;
  const handle = ensureCam();
  if (handle === 0) return;
  const spot = selectView(index);
  const next = { x: spot.cam.x, y: spot.cam.y, z: spot.cam.z, lx: spot.look.x, ly: spot.look.y, lz: spot.look.z };
  if (!hasSelect) {
    glideFrom = next;
    glideTo = next;
    glideMs = 0;
    hasSelect = true;
    applyGlide(1);
    return;
  }
  glideFrom = { ...glideTo };
  glideTo = next;
  glideAt = Date.now();
  glideMs = 500;
}

export function tickSelectCam(): void {
  if (!selectMode || glideMs <= 0) return;
  const t = Math.min(1, (Date.now() - glideAt) / glideMs);
  const eased = t * t * (3 - 2 * t);
  applyGlide(eased);
}

function applyGlide(t: number): void {
  const handle = ensureCam();
  if (handle === 0) return;
  native.setCamCoord(
    handle,
    glideFrom.x + (glideTo.x - glideFrom.x) * t,
    glideFrom.y + (glideTo.y - glideFrom.y) * t,
    glideFrom.z + (glideTo.z - glideFrom.z) * t,
  );
  native.pointCamAtCoord(
    handle,
    glideFrom.lx + (glideTo.lx - glideFrom.lx) * t,
    glideFrom.ly + (glideTo.ly - glideFrom.ly) * t,
    glideFrom.lz + (glideTo.lz - glideFrom.lz) * t,
  );
}

export function selectPed(index: number): { x: number; y: number; z: number; heading: number } {
  return selectView(index).ped;
}

export function hideLocalPlayer(): void {
  const handle = mint.Player.local?.scriptID ?? 0;
  if (handle === 0) return;
  native.setEntityAlpha(handle, 0, false);
}

export function stopPreloadCam(): void {
  if (cam !== 0) {
    native.setCamActive(cam, false);
    native.destroyCam(cam, false);
    cam = 0;
  }
  native.renderScriptCams(false, false, 0, true, false, 0);
  const handle = mint.Player.local?.scriptID ?? 0;
  if (handle !== 0) native.resetEntityAlpha(handle);
  native.displayHud(true);
  native.displayRadar(true);
  selectMode = false;
  hasSelect = false;
}
