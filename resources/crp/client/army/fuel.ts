import * as mint from 'mint-client';
import * as native from 'natives';
import { pushCef } from '../cef/view.js';
import { busyHas } from '../ui/busy.js';

const POS = { x: -2417.09, y: 3310.81, z: 32.83 };
let inside = false;
let label = '';

function draw(text: string, y: number, color: [number, number, number, number]): void {
  native.setTextFont(0);
  native.setTextScale(0.35, 0.35);
  native.setTextColour(color[0], color[1], color[2], color[3]);
  native.setTextCentre(true);
  native.setTextOutline();
  native.beginTextCommandDisplayText('STRING');
  native.addTextComponentSubstringPlayerName(text);
  native.endTextCommandDisplayText(0, y, 0);
}

export function installArmyFuel(): void {
  mint.onServer('crp:army:fuel:enter', (enter) => {
    inside = enter === true;
    if (!inside) label = '';
  });
  mint.onServer('crp:army:fuel:label', (text) => {
    label = typeof text === 'string' ? text : '';
  });
  mint.everyTick(() => {
    if (!inside || !label) return;
    native.setDrawOrigin(POS.x, POS.y, POS.z, false);
    draw(label.replace(/~[a-z]~/gi, ''), 0, [255, 255, 255, 220]);
    native.clearDrawOrigin();
  });
  mint.on('keyup', (key) => {
    if (key !== 69 || busyHas() || !inside) return;
    const local = mint.Player.local;
    const vehicle = local?.vehicle;
    if (vehicle && (local.seat === 1 || local.seat === 0)) mint.emitServer('crp:army:fuel');
    else pushCef(`prompt.show(${JSON.stringify('Чтобы заправить транспортное средство, вы должны находиться в нем')});`);
  });
}
