import * as mint from 'mint-client';
import * as native from 'natives';
import { pushCef } from '../cef/view.js';

let knocked = false;
let timer: number | null = null;

function stopTimer(): void {
  if (timer !== null) mint.clearTimeout(timer);
  timer = null;
  pushCef('timer.stop();');
}

function startTimer(time: number): void {
  stopTimer();
  pushCef(`timer.start('death', ${time});`);
  timer = mint.setTimeout(() => {
    timer = null;
    const local = mint.Player.local;
    let pos = local ? { x: local.pos.x, y: local.pos.y, z: local.pos.z } : null;
    if (local && pos) {
      const [, groundZ] = native.getGroundZFor3dCoord(pos.x, pos.y, pos.z + 2, null, false, false);
      if (Number.isFinite(groundZ)) pos.z = groundZ;
    }
    mint.emitServer('crp:death:spawn', pos ? JSON.stringify(pos) : '');
  }, time);
}

export function tickDeath(): void {
  if (knocked) mint.toggleGameControls(false);
}

export function installDeathClient(): void {
  mint.on('syncedMetaChange', (target, key, value) => {
    if (key !== 'crp:knocked' || target !== mint.Player.local) return;
    const time = typeof value === 'number' ? value : 0;
    knocked = time > 0;
    if (knocked) {
      mint.toggleGameControls(false);
      startTimer(time);
    } else {
      mint.toggleGameControls(true);
      stopTimer();
    }
  });
}
