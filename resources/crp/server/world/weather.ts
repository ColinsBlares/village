import * as mint from 'mint-server';
import { getSession } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyWarning } from '../ui/notify.js';

interface Kind {
  label: string;
  icon: string;
  temp: [number, number];
  type: mint.WeatherType;
}

interface Cycle {
  id: string;
  chance: number;
  min: number;
  max: number;
}

interface Zone {
  id: number;
  name: string;
  color: string;
  priority: number;
  locked: boolean;
  points: { x: number; y: number }[];
  weather: string;
  temperature: number;
  summary: string;
  icon: string;
  next: number;
  cycle: Cycle[];
}

interface SkyEvent {
  type: string;
  zoneId: number | null;
  warn: string;
  endsAt: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
}

const KINDS: Record<string, Kind> = {
  EXTRASUNNY: { label: 'Ясно', icon: 'clear-day', temp: [24, 32], type: mint.WeatherType.ExtraSunny },
  CLEAR: { label: 'Чисто', icon: 'clear-day', temp: [18, 26], type: mint.WeatherType.Clear },
  CLOUDS: { label: 'Облачно', icon: 'cloudy', temp: [16, 22], type: mint.WeatherType.Clouds },
  OVERCAST: { label: 'Пасмурно', icon: 'cloudy', temp: [14, 19], type: mint.WeatherType.Overcast },
  SMOG: { label: 'Смог', icon: 'fog', temp: [18, 27], type: mint.WeatherType.Smog },
  FOGGY: { label: 'Туман', icon: 'fog', temp: [8, 14], type: mint.WeatherType.Foggy },
  CLEARING: { label: 'Проясняется', icon: 'partly-cloudy-day', temp: [15, 21], type: mint.WeatherType.Clearing },
  RAIN: { label: 'Дождь', icon: 'rain', temp: [11, 17], type: mint.WeatherType.Rain },
  THUNDER: { label: 'Гроза', icon: 'rain', temp: [9, 15], type: mint.WeatherType.Thunder },
  SNOWLIGHT: { label: 'Редкий снег', icon: 'sleet', temp: [-2, 2], type: mint.WeatherType.Snowlight },
  SNOW: { label: 'Снег', icon: 'snow', temp: [-8, -2], type: mint.WeatherType.Snow },
  BLIZZARD: { label: 'Метель', icon: 'snow', temp: [-14, -6], type: mint.WeatherType.Blizzard },
  XMAS: { label: 'Рождество', icon: 'snow', temp: [-5, 0], type: mint.WeatherType.Xmas },
  SANDSTORM: { label: 'Песчаная буря', icon: 'wind', temp: [30, 39], type: mint.WeatherType.Overcast },
  HALLOWEEN: { label: 'Хэллоуин', icon: 'cloudy', temp: [8, 14], type: mint.WeatherType.Halloween },
};

const box = (x1: number, y1: number, x2: number, y2: number): { x: number; y: number }[] => [
  { x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 },
];

const EVENTS = [
  { id: 'earthquake', label: 'Землетрясение', global: false, minutes: 1, warn: 'Землетрясение. Держитесь на ногах.' },
  { id: 'bloodmoon', label: 'Кровавая луна', global: true, minutes: 8, warn: 'Небо стало красным.' },
  { id: 'darkhour', label: 'Тёмный час', global: true, minutes: 8, warn: 'Город залило зелёным светом.' },
  { id: 'supercell', label: 'Суперъячейка', global: false, minutes: 6, warn: 'Над районом суперъячейка.' },
  { id: 'tornado', label: 'Торнадо', global: false, minutes: 4, warn: 'По району идёт торнадо.' },
  { id: 'tsunami', label: 'Цунами', global: true, minutes: 6, warn: 'Вода поднимается. Уходите выше.' },
];

const ZONES: Zone[] = [
  {
    id: 1, name: 'Штат', color: '#7ec8ff', priority: 0, locked: false, points: box(-5000, -4500, 5500, 8500),
    weather: 'CLOUDS', temperature: 17, summary: 'Облачно', icon: 'cloudy', next: 0,
    cycle: [
      { id: 'EXTRASUNNY', chance: 40, min: 20, max: 50 },
      { id: 'CLEAR', chance: 30, min: 15, max: 40 },
      { id: 'CLOUDS', chance: 20, min: 10, max: 30 },
      { id: 'RAIN', chance: 10, min: 8, max: 20 },
    ],
  },
  {
    id: 2, name: 'Лос-Сантос', color: '#f2b544', priority: 20, locked: false, points: box(-3200, -3500, 1900, 1400),
    weather: 'CLEAR', temperature: 22, summary: 'Чисто', icon: 'clear-day', next: 0,
    cycle: [
      { id: 'EXTRASUNNY', chance: 34, min: 25, max: 55 },
      { id: 'CLEAR', chance: 24, min: 15, max: 40 },
      { id: 'CLOUDS', chance: 16, min: 10, max: 30 },
      { id: 'OVERCAST', chance: 8, min: 10, max: 25 },
      { id: 'FOGGY', chance: 6, min: 8, max: 18 },
      { id: 'RAIN', chance: 8, min: 8, max: 22 },
      { id: 'THUNDER', chance: 4, min: 6, max: 14 },
    ],
  },
  {
    id: 3, name: 'Сэнди-Шорс', color: '#e0a15a', priority: 20, locked: false, points: box(-100, 2500, 2900, 4500),
    weather: 'EXTRASUNNY', temperature: 31, summary: 'Ясно', icon: 'clear-day', next: 0,
    cycle: [
      { id: 'EXTRASUNNY', chance: 48, min: 30, max: 70 },
      { id: 'CLEAR', chance: 22, min: 20, max: 40 },
      { id: 'SMOG', chance: 12, min: 10, max: 25 },
      { id: 'SANDSTORM', chance: 12, min: 8, max: 18 },
      { id: 'CLOUDS', chance: 6, min: 10, max: 20 },
    ],
  },
  {
    id: 4, name: 'Палето', color: '#9fd6c8', priority: 20, locked: false, points: box(-2200, 5200, 1700, 7400),
    weather: 'CLOUDS', temperature: 16, summary: 'Облачно', icon: 'cloudy', next: 0,
    cycle: [
      { id: 'FOGGY', chance: 22, min: 10, max: 25 },
      { id: 'CLOUDS', chance: 18, min: 12, max: 30 },
      { id: 'OVERCAST', chance: 14, min: 10, max: 25 },
      { id: 'RAIN', chance: 14, min: 8, max: 20 },
      { id: 'SNOWLIGHT', chance: 14, min: 10, max: 25 },
      { id: 'CLEAR', chance: 10, min: 12, max: 30 },
      { id: 'SNOW', chance: 8, min: 10, max: 22 },
    ],
  },
];

let globalWeather: string | null = null;
let customTemp: number | null = null;
let cycleEnabled = true;
let revision = 0;
let skyEvent: SkyEvent | null = null;
const panel = new Set<number>();
const sent = new WeakMap<mint.Player, string>();

function rand(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function kindOf(id: string): Kind {
  return KINDS[id] ?? KINDS.CLOUDS;
}

function inside(x: number, y: number, points: { x: number; y: number }[]): boolean {
  let hit = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const a = points[i];
    const b = points[j];
    const cross = ((a.y > y) !== (b.y > y)) && (x < ((b.x - a.x) * (y - a.y)) / ((b.y - a.y) || 1e-9) + a.x);
    if (cross) hit = !hit;
  }
  return hit;
}

function zoneAt(x: number, y: number): Zone {
  let best = ZONES[0];
  for (const zone of ZONES) {
    if (zone.priority >= best.priority && inside(x, y, zone.points)) best = zone;
  }
  return best;
}

function iconFor(icon: string): string {
  const hour = new Date().getHours();
  if (hour >= 21 || hour < 6) {
    if (icon === 'clear-day') return 'clear-night';
    if (icon === 'partly-cloudy-day') return 'partly-cloudy-night';
  }
  return icon;
}

function eventHits(zone: Zone): boolean {
  if (!skyEvent || skyEvent.endsAt <= Date.now()) return false;
  const meta = EVENTS.find((item) => item.id === skyEvent?.type);
  if (!meta) return false;
  if (meta.global) return true;
  return skyEvent.zoneId === zone.id;
}

function eventWeather(zone: Zone): string | null {
  if (!eventHits(zone) || !skyEvent) return null;
  if (skyEvent.type === 'bloodmoon' || skyEvent.type === 'supercell') return 'THUNDER';
  if (skyEvent.type === 'darkhour') return 'FOGGY';
  if (skyEvent.type === 'tsunami') return 'RAIN';
  return null;
}

export function weatherHere(player: mint.Player): { temperature: number; weather: string; summary: string; type: mint.WeatherType } {
  const zone = zoneAt(player.pos.x, player.pos.y);
  const eventId = eventWeather(zone);
  const forced = globalWeather ? kindOf(globalWeather) : null;
  const kind = forced ?? kindOf(eventId ?? zone.weather);
  return {
    temperature: customTemp ?? (forced || eventId ? kind.temp[0] : zone.temperature),
    weather: iconFor(forced || eventId ? kind.icon : zone.icon),
    summary: forced || eventId ? kind.label : zone.summary,
    type: kind.type,
  };
}

export function setCustomTemperature(value: number): void {
  customTemp = Math.max(-40, Math.min(50, Math.trunc(value)));
  revision += 1;
}

export function resetCustomTemperature(): void {
  customTemp = null;
  revision += 1;
}

export function setGlobalWeather(id: string | null): boolean {
  if (id == null) {
    globalWeather = null;
    revision += 1;
    return true;
  }
  const key = id.toUpperCase();
  if (!KINDS[key]) return false;
  globalWeather = key;
  revision += 1;
  return true;
}

function roll(zone: Zone, now: number): void {
  if (!cycleEnabled || zone.locked || zone.next > now) return;
  const rows = zone.cycle.filter((row) => row.chance > 0 && KINDS[row.id]);
  const total = rows.reduce((sum, row) => sum + row.chance, 0);
  if (!total) return;
  let shot = Math.random() * total;
  let pick = rows[rows.length - 1];
  for (const row of rows) {
    shot -= row.chance;
    if (shot <= 0) {
      pick = row;
      break;
    }
  }
  const kind = kindOf(pick.id);
  zone.weather = pick.id;
  zone.summary = kind.label;
  zone.icon = kind.icon;
  zone.temperature = rand(kind.temp[0], kind.temp[1]);
  zone.next = now + rand(pick.min, Math.max(pick.max, pick.min)) * 60000;
}

function push(player: mint.Player): void {
  if (!player.valid) return;
  const info = weatherHere(player);
  const key = `${revision}|${info.type}|${info.temperature}|${info.weather}|${info.summary}`;
  if (sent.get(player) === key) return;
  sent.set(player, key);
  try {
    player.setWeather(info.type);
  } catch {
    /* тип погоды недоступен этой сборке */
  }
  cef(player, `mp.event.call('hud.setData', ${JSON.stringify({
    temperature: info.temperature,
    weather: info.weather,
    summary: info.summary,
  })});`);
}

function panelPayload(): unknown {
  return {
    now: Date.now(),
    playersOnline: mint.Player.all.length,
    settings: { cycleEnabled, globalWeather, blackout: false, realtime: true, frozen: false, scale: 1, transitionSec: 12, windScale: 1, snowGrip: true, snowBlackout: true, eventDamage: false, earthquakePower: 1, tornadoRadius: 28, tornadoSpeed: 9 },
    weathers: Object.entries(KINDS).map(([id, kind]) => ({ id, label: kind.label, icon: kind.icon, category: kind.icon })),
    categories: [],
    events: EVENTS.map((item) => ({ id: item.id, label: item.label, text: item.warn, global: item.global, minutes: item.minutes })),
    time: { hour: new Date().getHours(), minute: new Date().getMinutes(), second: 0, realtime: true, frozen: false, scale: 1 },
    event: skyEvent,
    zones: ZONES.map((zone) => ({
      id: zone.id,
      name: zone.name,
      color: zone.color,
      enabled: true,
      priority: zone.priority,
      points: zone.points,
      weather: zone.weather,
      summary: zone.summary,
      icon: zone.icon,
      temperature: zone.temperature,
      locked: zone.locked,
      nextChangeAt: zone.next,
      players: 0,
      cycle: zone.cycle,
      clock: { enabled: false, hour: 12, minute: 0, frozen: true, scale: 1 },
    })),
  };
}

function sendPanel(player: mint.Player, open: boolean): void {
  const raw = JSON.stringify(panelPayload());
  mint.emitClient(player, open ? 'crp:weather:open' : 'crp:weather:data', raw);
}

function admin(player: mint.Player): boolean {
  return (Number(getSession(player).character?.admin) || 0) >= 6;
}

export function openWeatherPanel(player: mint.Player): void {
  if (!admin(player)) return;
  panel.add(player.id);
  sendPanel(player, true);
}

function applyAction(player: mint.Player, data: Record<string, unknown>): boolean {
  if (data.action === 'close') {
    panel.delete(player.id);
    return false;
  }
  if (data.action === 'global') return setGlobalWeather(data.weather ? String(data.weather) : null);
  if (data.action === 'settings' && data.key === 'cycleEnabled') {
    cycleEnabled = !!data.value;
    revision += 1;
    return true;
  }
  if (data.action === 'randomizeAll') {
    const now = Date.now();
    for (const zone of ZONES) {
      zone.locked = false;
      zone.next = now;
      roll(zone, now);
    }
    revision += 1;
    return true;
  }
  const zone = ZONES.find((item) => item.id === Number(data.id));
  if (data.action === 'weather' && zone) {
    const kind = kindOf(String(data.weather ?? ''));
    if (!KINDS[String(data.weather ?? '').toUpperCase()]) return false;
    zone.weather = String(data.weather).toUpperCase();
    zone.summary = kind.label;
    zone.icon = kind.icon;
    zone.temperature = kind.temp[0];
    const minutes = Math.max(0, Math.min(240, Number(data.minutes) || 0));
    zone.next = Date.now() + (minutes || 20) * 60000;
    revision += 1;
    return true;
  }
  if (data.action === 'lock' && zone) {
    zone.locked = !!data.locked;
    return true;
  }
  if (data.action === 'randomize' && zone) {
    zone.locked = false;
    zone.next = Date.now();
    roll(zone, Date.now());
    revision += 1;
    return true;
  }
  if (data.action === 'eventStop') {
    skyEvent = null;
    revision += 1;
    mint.emitAllClients('crp:weather:fx', '');
    return true;
  }
  if (data.action === 'event') {
    const meta = EVENTS.find((item) => item.id === String(data.type));
    if (!meta) return false;
    const target = meta.global ? null : ZONES.find((item) => item.id === Number(data.zoneId));
    if (!meta.global && !target) return false;
    const minutes = Math.max(1, Math.min(30, Number(data.minutes) || meta.minutes));
    const heading = Math.random() * Math.PI * 2;
    skyEvent = {
      type: meta.id,
      zoneId: target?.id ?? null,
      warn: meta.warn,
      endsAt: Date.now() + minutes * 60000,
      x: player.pos.x,
      y: player.pos.y,
      z: player.pos.z,
      vx: Math.sin(heading) * 9,
      vy: Math.cos(heading) * 9,
    };
    revision += 1;
    for (const current of mint.Player.all) {
      if (current.valid) notifyWarning(current, meta.warn, 'Погода');
    }
    mint.emitAllClients('crp:weather:fx', meta.id);
    return true;
  }
  return false;
}

function tick(): void {
  const now = Date.now();
  if (skyEvent && skyEvent.endsAt <= now) {
    skyEvent = null;
    revision += 1;
    mint.emitAllClients('crp:weather:fx', '');
  }
  if (skyEvent?.type === 'tornado') {
    skyEvent.x += skyEvent.vx;
    skyEvent.y += skyEvent.vy;
    mint.emitAllClients('crp:weather:tornado', skyEvent.x, skyEvent.y, skyEvent.z);
  }
  if (!globalWeather) for (const zone of ZONES) roll(zone, now);
  for (const player of mint.Player.all) push(player);
}

export function installWeather(): void {
  for (const zone of ZONES) zone.next = Date.now() + rand(8, 20) * 60000;
  tick();
  setInterval(tick, 20000);
  mint.onClient('crp:weather:action', (player, raw) => {
    if (!player?.valid || !admin(player)) return;
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(String(raw ?? '{}')) as Record<string, unknown>;
    } catch {
      return;
    }
    if (!applyAction(player, data)) return;
    tick();
    for (const current of mint.Player.all) {
      if (current.valid && panel.has(current.id)) sendPanel(current, false);
    }
  });
  mint.on('playerDisconnect', (player) => panel.delete(player.id));
}
