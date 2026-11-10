import * as mint from 'mint-client';
import * as native from 'natives';

let effectAt = 30;
let effectName = 'DrugsDrivingOut';
let waitClear = 2 * 60 * 1000;
let value = 0;
let syncedAt = 0;

function intensity(amount: number): number {
  return Math.trunc(amount / 20);
}

function setEffect(on: boolean): void {
  if (on) native.animpostfxPlay(effectName, 60 * 60 * 1000, true);
  else native.animpostfxStop(effectName);
}

export function installDrunk(): void {
  mint.onServer('crp:drunk:init', (walk, effect, name, wait) => {
    if (typeof effect === 'number') effectAt = effect;
    if (typeof name === 'string') effectName = name;
    if (typeof wait === 'number') waitClear = wait;
  });
  mint.onServer('crp:drunk:set', (next) => {
    const amount = Math.max(0, Math.min(100, Number(next) || 0));
    const previous = intensity(value);
    const current = intensity(amount);
    if (value < effectAt && amount >= effectAt) setEffect(true);
    else if (value >= effectAt && amount < effectAt) setEffect(false);
    value = amount;
    if (previous !== current) native.shakeGameplayCam('DRUNK_SHAKE', current);
    syncedAt = Date.now();
  });
  mint.setInterval(() => {
    if (value && Date.now() - syncedAt > waitClear) mint.emitServer('crp:drunk:sync');
  }, 1000);
}
