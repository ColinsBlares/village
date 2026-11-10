import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import type { DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';

const SPOTS = [
  { model: 'a_m_m_bevhills_02', x: -239.12, y: -343.98, z: 30.04, h: 50.67 },
  { model: 'a_m_o_soucent_02', x: 264.57, y: -1119.03, z: 29.34, h: 94.91 },
  { model: 'a_m_m_business_01', x: -192.16, y: -811.55, z: 30.45, h: 47.83 },
  { model: 'ig_trafficwarden', x: 1160.12, y: -484.13, z: 65.71, h: 65.97 },
  { model: 'ig_old_man1a', x: -185.68, y: 6430.36, z: 31.92, h: 281.25 },
  { model: 'ig_russiandrunk', x: 1952.59, y: 3841.8, z: 32.18, h: 296.31 },
];

const here = new WeakSet<mint.Player>();

export async function loadInfoPeds(): Promise<number> {
  const rows = (await table('InfoPoint').findAll()) as DbRow[];
  const points = rows.length
    ? rows.map((row) => ({ x: Number(row.x), y: Number(row.y), z: Number(row.z) }))
    : SPOTS;
  for (const spot of points) {
    const shape = new mint.ColshapeSphere(spot.x, spot.y, spot.z, 1.5, 0, true);
    setColshapeHandlers(shape, {
      onEnter: (player) => {
        if (player.vehicle) return;
        here.add(player);
        cef(player, `prompt.show(${JSON.stringify('Используйте <span>E</span> для того, чтобы поговорить')});`);
      },
      onExit: (player) => {
        here.delete(player);
        cef(player, 'prompt.hide();');
      },
    });
  }
  for (const ped of SPOTS) {
    try {
      const body = new mint.Ped(
        ped.model,
        new mint.Vector3(ped.x, ped.y, ped.z),
        new mint.Vector3(0, 0, ped.h * (Math.PI / 180)),
        200,
        true,
        0,
        true,
      );
      void body;
    } catch {
      continue;
    }
  }
  return points.length;
}

export function installInfoPeds(): void {
  mint.onClient('crp:job:use', (player) => {
    if (!here.has(player) || player.vehicle) return;
    cef(player, `modal.showByName('newbie_help');`);
  });
}
