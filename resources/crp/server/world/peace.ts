import * as mint from 'mint-server';
import { inPeace, setPeace } from '../anticheat/index.js';
import { getSession } from '../player/session.js';

const ZONES = [
  { x: 2003.69, y: 4951.96, radius: 135 },
  { x: -573.14, y: 5254.02, radius: 135 },
  { x: 2615.76, y: 2776.18, radius: 135 },
  { x: -473, y: -339, radius: 30 },
  { x: 913, y: -1562, radius: 30 },
  { x: 911, y: -175, radius: 20 },
  { x: -630, y: -1653, radius: 20 },
  { x: 421, y: -621, radius: 30 },
];

export function installPeace(): void {
  for (const zone of ZONES) {
    const shape = new mint.ColshapeCircle(zone.x, zone.y, zone.radius, 0, true);
    shape.setMeta('peace', true);
  }
  mint.on('entityEnterColshape', (shape, entity) => {
    if (!shape.hasMeta('peace') || !(entity instanceof mint.Player) || !getSession(entity).character) return;
    setPeace(entity, true);
    entity.emit('crp:peace', true);
  });
  mint.on('entityLeaveColshape', (shape, entity) => {
    if (!shape.hasMeta('peace') || !(entity instanceof mint.Player)) return;
    setPeace(entity, false);
    entity.emit('crp:peace', false);
  });
  mint.on('weaponDamage', (source, target) => {
    if (inPeace(source)) return false;
    if (target instanceof mint.Player && inPeace(target)) return false;
    return undefined;
  });
}
