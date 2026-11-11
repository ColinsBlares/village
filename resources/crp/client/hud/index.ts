import * as mint from 'mint-client';
import * as native from 'natives';
import { cefPixels, pushCef } from '../cef/view.js';

let active = false;
let shown = true;
let lastAnchor = -1;
let nextAnchor = 0;

const HIDDEN = [1, 2, 3, 4, 6, 7, 8, 9, 13];

export function worldHudOn(): boolean {
  return active;
}

export function enableWorldHud(): void {
  active = true;
  shown = true;
  lastAnchor = -1;
  pushAnchor();
  native.displayRadar(true);
}

export function setHudShown(): void {
  if (!active) return;
  shown = !shown;
  native.displayRadar(shown);
  pushCef(`mp.event.call('hud.show', ${shown});`);
}

export function disableWorldHud(): void {
  active = false;
}

let lastStreet = '';
let lastRegion = '';

function pushPlace(): void {
  const local = mint.Player.local;
  if (!local?.valid) return;
  const pos = local.pos;
  const [, streetHash] = native.getStreetNameAtCoord(pos.x, pos.y, pos.z);
  const street = native.getStreetNameFromHashKey(streetHash) || '';
  const zone = native.getNameOfZone(pos.x, pos.y, pos.z);
  const region = native.getFilenameForAudioConversation(zone) || zone || '';
  if (street === lastStreet && region === lastRegion) return;
  lastStreet = street;
  lastRegion = region;
  pushCef(`mp.event.call('hud.setData', ${JSON.stringify({ street, region })});`);
}

export function tickHud(): void {
  if (!active) return;
  native.displayRadar(shown);
  for (const id of HIDDEN) native.hideHudComponentThisFrame(id);
  if (Date.now() >= nextAnchor) {
    pushAnchor();
    pushPlace();
  }
}

/** Тот же расчёт, что mp.utils.getMinimapAnchor в Rage: погода и голод садятся справа от радара. */
function pushAnchor(): void {
  nextAnchor = Date.now() + 1000;
  const page = cefPixels();
  const actual = native.getActualScreenResolution(0, 0);
  const resX = page?.x || actual[1];
  const resY = page?.y || actual[2];
  const aspect = native.getScreenAspectRatio() || (resY ? resX / resY : 0);
  if (!resX || !resY || !aspect) return;
  const safe = native.getSafeZoneSize();
  const scaleX = 1 / resX;
  const leftX = scaleX * (resX * (0.05 * (Math.abs(safe - 1) * 10)));
  const width = scaleX * (resX / (4 * aspect));
  const rightX = leftX + width;
  const leftWeather = Math.round(resX * rightX * 1.1);
  if (leftWeather === lastAnchor) return;
  lastAnchor = leftWeather;
  pushCef(`mp.event.call('hud.setData', { leftWeather: ${leftWeather} });`);
}
