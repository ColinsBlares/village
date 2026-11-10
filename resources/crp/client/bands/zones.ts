import * as mint from 'mint-client';

const COLORS: Record<number, number> = { 8: 2, 9: 27, 10: 46, 11: 3 };
const blips: mint.RadiusBlip[] = [];

interface Zone {
  x: number;
  y: number;
  size: number;
  factionId: number;
  flash?: boolean;
}

function clear(): void {
  for (const blip of blips) if (blip.valid) blip.destroy();
  blips.length = 0;
}

export function installBandZones(): void {
  mint.onServer('crp:bands:zones', (raw) => {
    if (typeof raw !== 'string') return;
    clear();
    const zones = JSON.parse(raw) as Zone[];
    for (const zone of zones) {
      const blip = new mint.RadiusBlip(zone.x, zone.y, 50, Number(zone.size) || 100);
      blip.sprite = 5 as typeof blip.sprite;
      blip.color = COLORS[zone.factionId] ?? 0;
      blip.alpha = 175;
      blip.flashes = zone.flash === true;
      blips.push(blip);
    }
  });
}
