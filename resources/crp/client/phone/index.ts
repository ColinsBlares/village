import * as mint from 'mint-client';
import * as native from 'natives';
import { pushCef } from '../cef/view.js';
import { animatorOn } from '../animations/index.js';
import { busyAdd, busyHas, busyRemove } from '../ui/busy.js';

function driving(): boolean {
  const local = mint.Player.local;
  const vehicle = local?.vehicle;
  if (!local || !vehicle) return false;
  return native.getPedInVehicleSeat(vehicle.scriptID, -1, false) === local.scriptID;
}

export function installPhoneKeys(): void {
  mint.on('keyup', (key) => {
    if (animatorOn()) return;
    if (key === 38 && !busyHas()) {
      busyAdd('phone');
      pushCef(`mp.event.call('phone.show', true);`);
      mint.emitServer('crp:phone:hold', true);
    }
    if (key === 40 && !driving() && (!busyHas() || busyHas('phone'))) {
      busyRemove('phone');
      pushCef(`mp.event.call('phone.show', false);`);
      mint.emitServer('crp:phone:hold', false);
    }
  });
}
