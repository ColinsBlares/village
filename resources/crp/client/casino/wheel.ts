import * as mint from 'mint-client';
import * as native from 'natives';
import { pushCef } from '../cef/view.js';
import { busyAdd, busyHas, busyRemove } from '../ui/busy.js';

const POS = { x: 1109.76, y: 227.89, z: -49.64 };
const HEADING = ((Math.atan2(1111.05 - POS.x, 229.81 - POS.y) * 180) / Math.PI + 360) % 360;
const STEPS = [
  { name: 'enter_right_to_baseidle', duration: 2500 },
  { name: 'enter_to_armraisedidle', duration: 1500 },
  { name: 'armraisedidle_to_spinningidle_high', duration: 2000 },
  { name: 'spinningidle_high', duration: -1, flag: 1 },
];

let near = false;
let prize: { type: string; text: string } | null = null;

function dictOf(): string {
  const local = mint.Player.local;
  const male = native.getHashKey('mp_m_freemode_01');
  return local && local.model === male
    ? 'anim_casino_a@amb@casino@games@lucky7wheel@male'
    : 'anim_casino_a@amb@casino@games@lucky7wheel@female';
}

function play(dict: string, step: number): void {
  const local = mint.Player.local;
  const line = STEPS[step];
  if (!local?.valid || !line) return;
  native.taskPlayAnimAdvanced(
    local.scriptID, dict, line.name,
    POS.x, POS.y, POS.z, 0, 0, HEADING,
    8, -8, line.duration, line.flag ?? 0, 0, 0, 0,
  );
  if (step === STEPS.length - 1) {
    mint.emitServer('crp:wheel:ready');
    return;
  }
  if (line.duration > 0) mint.setTimeout(() => play(dict, step + 1), line.duration);
}

function startAnim(): void {
  const local = mint.Player.local;
  if (!local?.valid) return;
  const dict = dictOf();
  native.requestAnimDict(dict);
  let tries = 0;
  const poll = mint.setInterval(() => {
    if (native.hasAnimDictLoaded(dict) || ++tries > 30) {
      mint.clearInterval(poll);
      native.freezeEntityPosition(local.scriptID, true);
      native.setEntityCoordsNoOffset(local.scriptID, POS.x, POS.y, POS.z, false, false, false);
      native.setEntityHeading(local.scriptID, HEADING);
      play(dict, 0);
    }
  }, 100);
}

function release(): void {
  const local = mint.Player.local;
  if (local?.valid) {
    native.freezeEntityPosition(local.scriptID, false);
    native.clearPedTasksImmediately(local.scriptID);
  }
  busyRemove('casino.wheel');
  prize = null;
}

export function closeWheel(): void {
  release();
  mint.emitServer('crp:wheel:finish');
}

export function installWheelClient(): void {
  mint.onServer('crp:wheel:zone', (enter) => {
    near = enter === true;
    if (near) pushCef(`notifications.info('Нажмите E для прокрутки', 'Колесо удачи');`);
  });
  mint.onServer('crp:wheel:start', (raw) => {
    prize = JSON.parse(String(raw ?? '{}')) as { type: string; text: string };
    if (!busyHas('casino.wheel')) busyAdd('casino.wheel', false);
    startAnim();
  });
  mint.onServer('crp:wheel:done', (raw) => {
    const next = JSON.parse(String(raw ?? '{}')) as { type?: string; text?: string };
    if (next.text) prize = { type: next.type ?? 'empty', text: next.text };
    const local = mint.Player.local;
    if (local?.valid) {
      native.freezeEntityPosition(local.scriptID, false);
      native.clearPedTasksImmediately(local.scriptID);
    }
    pushCef(`wheelResult.prizeText = ${JSON.stringify(prize?.text ?? '')}; wheelResult.prizeType = ${JSON.stringify(prize?.type ?? 'empty')}; wheelResult.show = true;`);
  });
  mint.onServer('crp:wheel:fail', () => release());
  mint.on('keyup', (key) => {
    if (key !== 69 || !near || busyHas() || prize) return;
    busyAdd('casino.wheel', false);
    mint.emitServer('crp:casino:wheel');
  });
}
