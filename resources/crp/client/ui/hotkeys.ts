import * as mint from 'mint-client';
import * as native from 'natives';
import { pushCef } from '../cef/view.js';
import { busyHas } from './busy.js';

export function installHotkeys(): void {
  mint.on('keydown', (key) => {
    if (key !== 80) return;
    native.setPauseMenuActive(false);
    native.setBigmapActive(false, false);
  });
  mint.on('keyup', (key) => {
    if (key === 80) {
      if (busyHas() && !busyHas('mapCase')) return;
      pushCef('if (window.mapCase && mapCase.enable && !mapCase.inputFocus) mapCase.show = !mapCase.show;');
    }
    if (key === 77) {
      if (busyHas() && !busyHas('playerMenu')) return;
      pushCef('if (window.playerMenu && playerMenu.enable && !playerMenu.inputFocus) playerMenu.show = !playerMenu.show;');
    }
    if (key === 114) {
      if (busyHas() && !busyHas('changelist')) return;
      pushCef('if (window.changelist && changelist.enable) changelist.show = !changelist.show;');
    }
  });
}
