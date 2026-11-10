import * as mint from 'mint-client';
import { pushCef } from '../cef/view.js';
import { worldHudOn } from '../hud/index.js';

let talking = false;
let radio = false;

function voiceIcon(on: boolean): void {
  pushCef(`mp.event.call('hud.setData', { voice: ${on} });`);
}

export function installVoiceKeys(): void {
  mint.on('keydown', (key) => {
    if (!worldHudOn()) return;
    if (key === 78 && !talking) {
      talking = true;
      voiceIcon(true);
      mint.emitServer('crp:voice:talk', true);
    }
    if (key === 20 && !radio) {
      radio = true;
      voiceIcon(true);
      mint.emitServer('crp:voice:radio', true);
    }
  });

  mint.on('keyup', (key) => {
    if (key === 78 && talking) {
      talking = false;
      voiceIcon(radio);
      mint.emitServer('crp:voice:talk', false);
    }
    if (key === 20 && radio) {
      radio = false;
      voiceIcon(talking);
      mint.emitServer('crp:voice:radio', false);
    }
  });
}
