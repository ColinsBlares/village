import * as mint from 'mint-client';

const COLORS: Record<number, number> = { 8: 2, 9: 27, 10: 46, 11: 3 };
const MAFIA = [
  { x: 1549.31, y: 2203.41 },
  { x: 1063.95, y: 2357.69 },
  { x: 2953.53, y: 2787.0 },
  { x: 1534.71, y: -2123.95 },
  { x: 2386.09, y: 3092.92 },
];
const blips: mint.RadiusBlip[] = [];
const mafia: mint.RadiusBlip[] = [];
let visible = true;

function square(x: number, y: number, size: number, color: number, alpha: number, flash = false): mint.RadiusBlip {
  const blip = new mint.RadiusBlip(x, y, 50, size);
  blip.sprite = 5 as typeof blip.sprite;
  blip.color = color;
  blip.alpha = alpha;
  blip.flashes = flash;
  blip.shortRange = false;
  blip.isHiddenOnLegend = true;
  return blip;
}

export function setZoneVisible(on: boolean): void {
  visible = on;
  for (const blip of blips) if (blip.valid) blip.alpha = on ? 175 : 0;
  for (const blip of mafia) if (blip.valid) blip.alpha = on ? 120 : 0;
}

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
      blips.push(square(zone.x, zone.y, Number(zone.size) || 100, COLORS[zone.factionId] ?? 0, visible ? 175 : 0, zone.flash === true));
    }
  });
  for (const zone of MAFIA) mafia.push(square(zone.x, zone.y, 150, 4, visible ? 120 : 0));
}
