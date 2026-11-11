import * as mint from 'mint-client';
import * as native from 'natives';
import { pushCef } from '../cef/view.js';
import { worldHudOn } from '../hud/index.js';
import { busyHas } from '../ui/busy.js';

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
    if (key === 20 && !radio && !native.isPauseMenuActive() && !busyHas('chat')) {
      radio = true;
      voiceIcon(true);
      mint.emitServer('crp:voice:radio', true);
    }
  });
  mint.onServer('crp:voice:denied', () => {
    radio = false;
    voiceIcon(talking);
  });
  mint.onServer('crp:voice:hear', () => {
    native.playSoundFrontend(-1, 'Start_Squelch', 'CB_RADIO_SFX', true);
  });
  mint.onServer('crp:voice:silence', () => {
    native.playSoundFrontend(-1, 'End_Squelch', 'CB_RADIO_SFX', true);
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
