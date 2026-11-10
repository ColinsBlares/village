import * as mint from 'mint-client';
import * as native from 'natives';

interface Door {
  hash: number;
  x: number;
  y: number;
  z: number;
  locked: boolean;
}

export function installDoors(): void {
  mint.onServer('crp:doors', (raw) => {
    if (typeof raw !== 'string') return;
    const doors = JSON.parse(raw) as Door[];
    for (const door of doors) {
      native.setStateOfClosestDoorOfType(door.hash, door.x, door.y, door.z, door.locked, 0, false);
    }
  });
}
