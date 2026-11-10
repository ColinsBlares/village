import * as mint from 'mint-client';
import * as native from 'natives';
import { selectPed } from '../camera/index.js';
import { fadeIn, fadeOut } from '../fade/index.js';

interface Piece {
  component: number;
  drawable: number;
  texture: number;
}

interface Preview {
  gender: number;
  mother: number;
  father: number;
  similarity: number;
  skin: number;
  hair: number;
  hairColor: number;
  hairHighlightColor: number;
  beardColor: number;
  eyebrowColor: number;
  blushColor: number;
  lipstickColor: number;
  chestHairColor: number;
  features: number[];
  overlays: { value: number; opacity: number }[];
  clothes: Piece[];
  props: Piece[];
}

let waiting: { preview: Preview; index: number }[] | null = null;
const peds: number[] = [];
let tries = 0;

export function lineupActive(): boolean {
  return waiting !== null || peds.length > 0;
}

export function queueLineup(raw: string): void {
  clearLineup();
  fadeOut(350);
  tries = 0;
  try {
    const list = JSON.parse(raw) as Preview[];
    waiting = list.map((preview, index) => ({ preview, index }));
  } catch {
    waiting = [];
    fadeIn(500);
  }
}

export function tickLineup(): void {
  if (!waiting) return;
  for (const entry of waiting) {
    const model = mint.hash(entry.preview.gender === 1 ? 'mp_f_freemode_01' : 'mp_m_freemode_01');
    if (!native.hasModelLoaded(model)) {
      native.requestModel(model);
      return;
    }
  }
  tries += 1;
  const left: { preview: Preview; index: number }[] = [];
  for (const entry of waiting) {
    const spot = selectPed(entry.index);
    native.requestCollisionAtCoord(spot.x, spot.y, spot.z);
    const ground = groundZ(spot.x, spot.y, spot.z);
    if (ground == null && tries < 90) {
      left.push(entry);
      continue;
    }
    spawnPreview(entry.preview, entry.index, ground ?? spot.z);
  }
  waiting = left.length > 0 ? left : null;
  if (!waiting) fadeIn(500);
}

function groundZ(x: number, y: number, z: number): number | null {
  const ignore = mint.Player.local?.scriptID ?? 0;
  const ray = native.startExpensiveSynchronousShapeTestLosProbe(x, y, z + 2, x, y, z - 30, 17, ignore, 7);
  const hit = native.getShapeTestResult(ray);
  if (hit[0] === 2 && hit[1]) return hit[2].z;
  const probe = native.getGroundZFor3dCoord(x, y, z + 1, 0, false, false);
  return probe[0] ? probe[1] : null;
}

export function clearLineup(): void {
  waiting = null;
  for (const ped of peds) native.deletePed(ped);
  peds.length = 0;
}

function mixOf(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  if (value > 1) return Math.max(0, Math.min(1, value / 100));
  return Math.max(0, Math.min(1, value));
}

function spawnPreview(preview: Preview, index: number, z: number): void {
  const spot = selectPed(index);
  const model = mint.hash(preview.gender === 1 ? 'mp_f_freemode_01' : 'mp_m_freemode_01');
  const ped = native.createPed(26, model, spot.x, spot.y, z, spot.heading, false, true);
  if (ped === 0) return;
  native.setEntityInvincible(ped, true, true);
  native.freezeEntityPosition(ped, true);
  native.setPedHeadBlendData(
    ped,
    preview.mother,
    preview.father,
    0,
    0,
    preview.skin,
    0,
    mixOf(preview.similarity),
    1,
    0,
    false,
  );
  native.setPedHairTint(ped, preview.hairColor, preview.hairHighlightColor);
  native.setPedComponentVariation(ped, 2, preview.hair, 0, 2);
  for (let i = 0; i < 11; i += 1) {
    const overlay = preview.overlays[i];
    if (!overlay || overlay.value >= 255) continue;
    native.setPedHeadOverlay(ped, i, overlay.value, overlay.opacity);
    const colorType = i === 5 || i === 8 ? 2 : 1;
    const color = overlayColor(preview, i);
    native.setPedHeadOverlayTint(ped, i, colorType, color, color);
  }
  const male = preview.gender !== 1;
  native.setPedComponentVariation(ped, 3, 15, 0, 0);
  native.setPedComponentVariation(ped, 8, male ? 15 : 3, 0, 0);
  native.setPedComponentVariation(ped, 11, male ? 15 : 18, 0, 0);
  native.setPedComponentVariation(ped, 4, male ? 18 : 17, male ? 2 : 0, 0);
  native.setPedComponentVariation(ped, 6, male ? 34 : 35, 0, 0);
  for (const piece of preview.clothes) {
    native.setPedComponentVariation(ped, piece.component, piece.drawable, piece.texture, 0);
  }
  peds.push(ped);
}

function overlayColor(preview: Preview, index: number): number {
  if (index === 1) return preview.beardColor;
  if (index === 2) return preview.eyebrowColor;
  if (index === 5) return preview.blushColor;
  if (index === 8) return preview.lipstickColor;
  if (index === 10) return preview.chestHairColor;
  return 0;
}
