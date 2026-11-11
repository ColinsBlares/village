import * as mint from 'mint-client';
import * as native from 'natives';
import { pushCef } from '../cef/view.js';
import { busyAdd, busyHas, busyRemove } from '../ui/busy.js';
import { setHudShown, worldHudOn } from './index.js';

let open = false;

export function closePlayerList(): void {
  if (!open) return;
  open = false;
  busyRemove('playersList');
  pushCef(`mp.event.call('players.show', false);`);
}

export function installPlayerList(): void {
  mint.onServer('crp:players:show', () => {
    if (open) return;
    open = true;
    busyAdd('playersList');
    pushCef(`mp.event.call('players.show', true);`);
  });
  mint.on('keydown', (key) => {
    if (!worldHudOn()) return;
    if (key === 116) {
      setHudShown();
      return;
    }
    if (key !== 120 || native.isPauseMenuActive()) return;
    if (open) {
      closePlayerList();
      return;
    }
    if (busyHas()) return;
    mint.emitServer('crp:players:list');
  });
}
