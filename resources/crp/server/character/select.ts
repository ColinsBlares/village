import * as mint from 'mint-server';

const BASE = { x: -222.94, y: 6584.72, z: 8 };
const DIST = 2.5;
const GAP = 2.5;
const ANGLE = (70 * Math.PI) / 180;
const LINE = ((225 - 90) * Math.PI) / 180;

export function selectSpot(index: number): { x: number; y: number; z: number } {
  const alongX = Math.sin(LINE);
  const alongY = Math.cos(LINE);
  const faceX = Math.sin(ANGLE);
  const faceY = Math.cos(ANGLE);
  return {
    x: BASE.x + index * GAP * alongX + DIST * faceX,
    y: BASE.y + index * GAP * alongY + DIST * faceY,
    z: BASE.z + 10,
  };
}

/** Игрок стоит рядом с линейкой, чтобы прогрузился участок. Сам он скрыт, видны клоны. */
export function placeForSelect(player: mint.Player): void {
  const spot = selectSpot(0);
  player.pos = new mint.Vector3(spot.x, spot.y, spot.z);
  player.frozen = true;
  player.visible = false;
}
