import * as mint from 'mint-client';
import * as native from 'natives';
import { pushCef } from '../cef/view.js';
import { busyAdd } from '../ui/busy.js';

let fx = '';
let nextShake = 0;

function look(type: string): string {
  if (type === 'bloodmoon') return 'REDMIST';
  if (type === 'darkhour') return 'drug_flying_01';
  if (type === 'supercell') return 'lightning';
  if (type === 'sand') return 'spectator5';
  return '';
}

export function installWeatherClient(): void {
  mint.onServer('crp:weather:open', (raw) => {
    if (typeof raw !== 'string') return;
    busyAdd('weatherPanel');
    pushCef(`mp.event.call('weatherPanel.open', ${raw});`);
  });
  mint.onServer('crp:weather:data', (raw) => {
    if (typeof raw !== 'string') return;
    pushCef(`mp.event.call('weatherPanel.setData', ${raw});`);
  });
  mint.onServer('crp:weather:fx', (type) => {
    fx = typeof type === 'string' ? type : '';
    native.clearTimecycleModifier();
    const name = look(fx);
    if (!name) return;
    native.setTimecycleModifier(name);
    native.setTimecycleModifierStrength(fx === 'darkhour' ? 0.8 : 0.6);
  });
  mint.onServer('crp:weather:tornado', (x, y) => {
    const local = mint.Player.local;
    if (!local?.valid) return;
    const dx = local.pos.x - Number(x);
    const dy = local.pos.y - Number(y);
    if (dx * dx + dy * dy < 40 * 40) native.shakeGameplayCam('SMALL_EXPLOSION_SHAKE', 0.25);
  });
  mint.everyTick(() => {
    if (fx !== 'earthquake' && fx !== 'supercell' && fx !== 'bloodmoon') return;
    if (Date.now() < nextShake) return;
    nextShake = Date.now() + 800;
    native.shakeGameplayCam('SMALL_EXPLOSION_SHAKE', fx === 'earthquake' ? 0.28 : 0.12);
  });
}

