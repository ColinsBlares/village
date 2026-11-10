import * as mint from 'mint-client';
import { pushCef } from '../cef/view.js';
import { busyHas } from '../ui/busy.js';

let inside = false;

export function garageVehicle(): boolean {
  return inside;
}

export function installGarageClient(): void {
  mint.onServer('crp:veh:garage', (state) => {
    inside = state === true;
    pushCef(inside ? `prompt.showByName('garage_control');` : 'prompt.hide();');
  });
  mint.on('keyup', (key) => {
    if (key !== 69 || busyHas() || !inside) return;
    inside = false;
    pushCef('prompt.hide();');
    mint.emitServer('crp:veh:garage:leave');
  });
}
