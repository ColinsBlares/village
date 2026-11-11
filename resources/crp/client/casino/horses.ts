import * as mint from 'mint-client';
import * as native from 'natives';
import { pushCef } from '../cef/view.js';
import { busyHas } from '../ui/busy.js';

const SCREEN = native.getHashKey('vw_vwint01_betting_screen');
const STYLES = [
  [15553363, 5474797, 9858144, 4671302],
  [16724530, 3684408, 14807026, 16777215],
  [13560920, 15582764, 16770746, 7500402],
  [16558591, 5090807, 10446437, 7493977],
  [5090807, 16558591, 3815994, 9393493],
  [16269415, 16767010, 10329501, 16777215],
];

interface Horse {
  num: number;
  name: string;
  odds: number;
}

interface Race {
  endAt: number;
  order: number[];
  seed: number;
  durationSec: number;
}

let near = false;
let horses: Horse[] = [];
let scaleform: number | null = null;
let target = -1;
let screen = false;
let race: Race | null = null;
let wait: number | null = null;

function call(method: string, params: { t: string; v: number | string | boolean }[]): void {
  if (scaleform == null) return;
  native.beginScaleformMovieMethod(scaleform, method);
  for (const param of params) {
    if (param.t === 'i') native.scaleformMovieMethodAddParamInt(Number(param.v));
    else if (param.t === 'f') native.scaleformMovieMethodAddParamFloat(Number(param.v));
    else if (param.t === 'b') native.scaleformMovieMethodAddParamBool(param.v === true);
    else native.scaleformMovieMethodAddParamTextureNameString(String(param.v));
  }
  native.endScaleformMovieMethod();
}

function paintHorses(): void {
  for (let i = 0; i < 6; i += 1) {
    const horse = horses[i] ?? { num: i + 1, name: `Horse ${i + 1}`, odds: 2 };
    const style = STYLES[i] ?? STYLES[0];
    call('SET_HORSE', [
      { t: 'i', v: horse.num },
      { t: 's', v: horse.name },
      { t: 's', v: `${horse.odds}/1` },
      { t: 'i', v: style[0] },
      { t: 'i', v: style[1] },
      { t: 'i', v: style[2] },
      { t: 'i', v: style[3] },
    ]);
  }
}

function enableScreen(): void {
  if (screen) return;
  native.registerNamedRendertarget('casinoscreen_02', false);
  native.linkNamedRendertarget(SCREEN);
  target = native.getNamedRendertargetRenderId('casinoscreen_02');
  scaleform = native.requestScaleformMovie('HORSE_RACING_WALL');
  let tries = 0;
  const poll = mint.setInterval(() => {
    if (scaleform != null && native.hasScaleformMovieLoaded(scaleform)) {
      mint.clearInterval(poll);
      call('SHOW_SCREEN', [{ t: 'i', v: 0 }]);
      paintHorses();
      screen = true;
      return;
    }
    if (++tries > 100) mint.clearInterval(poll);
  }, 50);
}

function disableScreen(): void {
  screen = false;
  target = -1;
  if (scaleform != null) {
    native.setScaleformMovieAsNoLongerNeeded(scaleform);
    scaleform = null;
  }
}

function runRace(data: { order: number[]; seed: number; durationSec: number }): void {
  if (!race || scaleform == null || !screen) return;
  paintHorses();
  call('SHOW_SCREEN', [{ t: 'i', v: 0 }]);
  const order = data.order;
  call('START_RACE', [
    { t: 'f', v: data.durationSec * 1000 },
    { t: 'i', v: data.seed },
    { t: 'i', v: order[0] },
    { t: 'i', v: order[1] },
    { t: 'i', v: order[2] },
    { t: 'i', v: order[3] },
    { t: 'i', v: order[4] },
    { t: 'i', v: order[5] },
    { t: 'f', v: 0 },
    { t: 'b', v: false },
  ]);
}

export function selectHorse(index: number): void {
  const horse = horses[index];
  if (!horse) return;
  pushCef([
    `inputWindow.name = 'horse_bet';`,
    `inputWindow.horse = ${horse.num};`,
    `inputWindow.header = ${JSON.stringify(`Ставка: ${horse.name} (x${horse.odds})`)};`,
    `inputWindow.hint = "Сумма ставки ($100 - $10 000)";`,
    `inputWindow.inputHint = "Сумма...";`,
    `inputWindow.leftWord = "Поставить";`,
    `inputWindow.rightWord = "Отмена";`,
    `inputWindow.value = "";`,
    `inputWindow.show = true;`,
  ].join('\n'));
}

export function installHorses(): void {
  mint.onServer('crp:horse:zone', (enter) => {
    near = enter === true;
    if (near) {
      enableScreen();
      pushCef(`notifications.info('Нажмите E для ставки', 'Скачки');`);
      return;
    }
    disableScreen();
  });
  mint.onServer('crp:horse:menu', (raw) => {
    horses = JSON.parse(String(raw ?? '[]')) as Horse[];
    const items = horses.map((horse) => ({ text: `${horse.num}. ${horse.name} (x${horse.odds})` }));
    pushCef(`interactionMenu.menus["casino_horses"].items = ${JSON.stringify(items)}; interactionMenu.menu = cloneObj(interactionMenu.menus["casino_horses"]); interactionMenu.show = true;`);
  });
  mint.onServer('crp:horse:race', (raw) => {
    const data = JSON.parse(String(raw ?? '{}')) as { horses?: Horse[]; order?: number[]; seed?: number; durationSec?: number };
    if (!data.order || data.order.length < 6) return;
    if (data.horses) horses = data.horses;
    race = { endAt: Date.now() + (Number(data.durationSec) || 26) * 1000 + 3000, order: data.order, seed: Number(data.seed) || 0, durationSec: Number(data.durationSec) || 26 };
    if (screen && scaleform != null) runRace(race);
    else {
      enableScreen();
      let tries = 0;
      if (wait != null) mint.clearInterval(wait);
      wait = mint.setInterval(() => {
        if (screen && scaleform != null && race) {
          if (wait != null) mint.clearInterval(wait);
          wait = null;
          runRace(race);
        } else if (++tries > 100 && wait != null) {
          mint.clearInterval(wait);
          wait = null;
        }
      }, 50);
    }
  });
  mint.on('keyup', (key) => {
    if (key !== 69 || !near || busyHas() || race) return;
    mint.emitServer('crp:horse:open');
  });
  mint.everyTick(() => {
    if (race && Date.now() >= race.endAt) {
      race = null;
      mint.emitServer('crp:horse:done');
    }
    if (!screen || scaleform == null || target === -1) return;
    native.setTextRenderId(target);
    native.setScriptGfxDrawOrder(4);
    native.setScriptGfxDrawBehindPausemenu(true);
    native.drawScaleformMovieFullscreen(scaleform, 255, 255, 255, 255, 0);
    native.setTextRenderId(1);
  });
}
