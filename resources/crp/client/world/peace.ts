import * as mint from 'mint-client';
import * as native from 'natives';

let inside = false;

export function inPeace(): boolean {
  return inside;
}

export function installPeace(): void {
  mint.onServer('crp:peace', (value) => {
    inside = value === true;
  });
  mint.everyTick(() => {
    if (!inside) return;
    native.disablePlayerFiring(mint.Player.local.scriptID, true);
    for (const control of [24, 25, 140, 141, 142, 257]) native.disableControlAction(0, control, true);
  });
}
