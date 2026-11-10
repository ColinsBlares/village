import * as mint from 'mint-client';

const LIFE = 60_000;

export function installBackupBlips(): void {
  mint.onServer('crp:backup:blip', (name, x, y, z) => {
    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') return;
    const blip = new mint.PointBlip(x, y, z);
    blip.sprite = 133 as typeof blip.sprite;
    blip.color = 39;
    blip.name = typeof name === 'string' ? name : 'Подкрепление';
    mint.setTimeout(() => {
      if (blip.valid) blip.destroy();
    }, LIFE);
  });
}
