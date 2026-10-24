'use strict';

const WEATHER = {
	EXTRASUNNY: { native: 'EXTRASUNNY', rain: 0, wind: 0.15, label: 'Ясно', icon: 'clear-day' },
	CLEAR: { native: 'CLEAR', rain: 0, wind: 0.2, label: 'Чисто', icon: 'clear-day' },
	CLOUDS: { native: 'CLOUDS', rain: 0, wind: 0.3, label: 'Облачно', icon: 'cloudy' },
	OVERCAST: { native: 'OVERCAST', rain: 0, wind: 0.4, label: 'Пасмурно', icon: 'cloudy' },
	SMOG: { native: 'SMOG', rain: 0, wind: 0.15, label: 'Смог', icon: 'fog' },
	FOGGY: { native: 'FOGGY', rain: 0, wind: 0.1, label: 'Туман', icon: 'fog' },
	CLEARING: { native: 'CLEARING', rain: 0.2, wind: 0.45, label: 'Проясняется', icon: 'partly-cloudy-day' },
	RAIN: { native: 'RAIN', rain: 0.65, wind: 0.75, label: 'Дождь', icon: 'rain' },
	THUNDER: { native: 'THUNDER', rain: 0.9, wind: 1, label: 'Гроза', icon: 'rain' },
	SNOWLIGHT: { native: 'SNOWLIGHT', rain: 0, wind: 0.35, grip: true, label: 'Редкий снег', icon: 'sleet' },
	SNOW: { native: 'SNOW', rain: 0, wind: 0.5, grip: true, label: 'Снег', icon: 'snow' },
	BLIZZARD: { native: 'BLIZZARD', rain: 0, wind: 1.1, grip: true, label: 'Метель', icon: 'snow' },
	XMAS: { native: 'XMAS', rain: 0, wind: 0.25, grip: true, label: 'Рождество', icon: 'snow' },
	SANDSTORM: { native: 'OVERCAST', rain: 0, wind: 1.7, fx: 'sand', label: 'Песчаная буря', icon: 'wind' },
	HEAVYSNOW: { native: 'BLIZZARD', rain: 0, wind: 1.25, grip: true, fx: 'snow', label: 'Сильный снег', icon: 'snow' },
	HALLOWEEN: { native: 'HALLOWEEN', rain: 0, wind: 0.3, fx: 'halloween', label: 'Хэллоуин', icon: 'cloudy' },
};

let world = null;
let blend = { from: 'EXTRASUNNY', to: 'EXTRASUNNY', at: 0, ms: 1 };
let focusId = 0;
let panelOpen = false;
let reopen = false;
let lastPanel = null;
let boundary = null;
let lastHud = '';
let lastFx = '';
let gripped = null;
let fxHandles = [];
let floodOn = false;
let lastPanelTick = 0;
let hurtAt = 0;
let quakeAt = 0;
let flashAt = 0;
let lightsOn = true;

function info(id) {
	return WEATHER[id] || { native: id || 'EXTRASUNNY', rain: 0, wind: 0.2, label: id || 'Ясно', icon: 'cloudy' };
}

function outside() {
	const local = mp.players.local;
	return !!(local && local.position && local.dimension === 0);
}

function insidePoly(x, y, points) {
	let hit = false;
	for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
		const yi = points[i].y;
		const yj = points[j].y;
		const cross = (yi > y) !== (yj > y)
			&& x < ((points[j].x - points[i].x) * (y - yi)) / ((yj - yi) || 1e-9) + points[i].x;
		if (cross) hit = !hit;
	}
	return hit;
}

function pickZone(pos) {
	if (!world) return null;
	let best = null;
	let fallback = null;
	const zones = world.zones || [];
	for (let i = 0; i < zones.length; i++) {
		const zone = zones[i];
		if (!zone.enabled) continue;
		if (!fallback || zone.priority < fallback.priority) fallback = zone;
		if (pos.z < zone.minZ || pos.z > zone.maxZ) continue;
		if (!zone.points || zone.points.length < 3) continue;
		if (!insidePoly(pos.x, pos.y, zone.points)) continue;
		if (!best || zone.priority > best.priority) best = zone;
	}
	return best || fallback;
}

function eventHits(event, zone) {
	if (!event) return false;
	if (event.type === 'bloodmoon' || event.type === 'darkhour' || event.type === 'tsunami') return true;
	if (!event.zoneId) return true;
	return !!(zone && zone.id === event.zoneId);
}

function desired(zone) {
	if (!world) return 'EXTRASUNNY';
	const event = world.event;
	if (event && eventHits(event, zone)) {
		if (event.type === 'supercell' || event.type === 'bloodmoon') return 'THUNDER';
		if (event.type === 'darkhour') return 'FOGGY';
		if (event.type === 'tsunami') return 'RAIN';
	}
	if (world.globalWeather && WEATHER[world.globalWeather]) return world.globalWeather;
	if (zone && zone.weather) return zone.weather;
	return 'EXTRASUNNY';
}

function clockOf(zone) {
	if (zone && zone.clock && zone.clock.enabled) return zone.clock;
	return world ? world.time : null;
}

function readClock(snap) {
	if (!snap) return { hour: 12, minute: 0, second: 0 };
	const elapsed = Math.max(0, (Date.now() - (world && world.now ? world.now : Date.now())) / 1000);
	const speed = snap.realtime ? 1 : snap.frozen ? 0 : Number(snap.scale) || 0;
	let total = ((snap.hour || 0) * 3600) + ((snap.minute || 0) * 60) + (snap.second || 0) + elapsed * speed;
	total = ((total % 86400) + 86400) % 86400;
	return {
		hour: Math.floor(total / 3600),
		minute: Math.floor((total % 3600) / 60),
		second: Math.floor(total % 60),
	};
}

function applyClock(zone) {
	const event = world && world.event;
	if (event && event.type === 'darkhour' && eventHits(event, zone)) {
		mp.game.time.setClockTime(0, 20, 0);
		mp.game.invoke('0x4055E40BD2DBEC1D', true);
		return;
	}
	const time = readClock(clockOf(zone));
	mp.game.time.setClockTime(time.hour, time.minute, time.second);
	mp.game.invoke('0x4055E40BD2DBEC1D', true);
}

function pushHud(zone, id) {
	const meta = info(id);
	const time = readClock(clockOf(zone));
	let icon = zone && zone.weather === id && zone.icon ? zone.icon : meta.icon;
	if ((icon === 'clear-day' || icon === 'partly-cloudy-day') && (time.hour >= 21 || time.hour < 6)) {
		icon = icon === 'clear-day' ? 'clear-night' : 'partly-cloudy-night';
	}
	const temperature = world && world.tempOverride != null
		? world.tempOverride
		: (zone && zone.temperature != null ? zone.temperature : 20);
	const summary = zone && zone.weather === id && zone.summary ? zone.summary : meta.label;
	const key = icon + '|' + temperature + '|' + summary;
	if (key === lastHud) return;
	lastHud = key;
	mp.events.call('hud.setData', {
		temperature: parseInt(temperature, 10) || 0,
		weather: icon,
		summary: summary,
	});
}

function applySky() {
	if (!world || !outside()) {
		setLook(null, 0);
		if (mp.game && mp.game.invoke) mp.game.invoke('0x4055E40BD2DBEC1D', false);
		return;
	}
	const zone = pickZone(mp.players.local.position);
	const id = desired(zone);
	if (blend.to !== id) {
		blend.from = blend.to;
		blend.to = id;
		blend.at = Date.now();
		const sec = zone && zone.transitionSec != null ? zone.transitionSec : world.transitionSec || 12;
		blend.ms = Math.max(1, Number(sec) * 1000);
	}
	const t = Math.max(0, Math.min(1, (Date.now() - blend.at) / blend.ms));
	const from = info(blend.from).native;
	const to = info(id).native;
	mp.game.invoke('0x578C752848ECFA0C', mp.game.joaat(from), mp.game.joaat(to), t + 0);
	applyClock(zone);
	pushHud(zone, id);
}

function setLook(name, strength) {
	const key = (name || '') + ':' + strength;
	if (key === lastFx) return;
	lastFx = key;
	try {
		if (!name) {
			mp.game.graphics.clearTimecycleModifier();
			return;
		}
		mp.game.graphics.setTimecycleModifier(name);
		mp.game.graphics.setTimecycleModifierStrength(strength);
	} catch (e) {}
}

function setLights(off) {
	if (lightsOn === !off) return;
	lightsOn = !off;
	try {
		mp.game.invoke('0x1268615ACE24D504', !!off);
	} catch (e) {}
}

function setRain(level) {
	try {
		mp.game.invoke('0x643E26EA6E024D92', level);
	} catch (e) {}
}

function setWind(speed) {
	try {
		const scale = world && world.windScale != null ? world.windScale : 1;
		mp.game.invoke('0xEE09ECEDBABE47FC', Math.max(0, speed * scale));
	} catch (e) {}
}

function grip(vehicle, on) {
	if (!vehicle || !vehicle.handle) return;
	try {
		mp.game.invoke('0x222FF6A823D122E2', vehicle.handle, !!on);
	} catch (e) {}
}

function holdGrip(on) {
	const vehicle = mp.players.local.vehicle;
	if (gripped && gripped !== vehicle) {
		grip(gripped, false);
		gripped = null;
	}
	if (!vehicle) return;
	if (on) {
		grip(vehicle, true);
		gripped = vehicle;
	} else if (gripped) {
		grip(gripped, false);
		gripped = null;
	}
}

function shake(name, amount) {
	try {
		if (mp.game.cam.shakeGameplayCam) mp.game.cam.shakeGameplayCam(name, amount);
	} catch (e) {}
}

function ragdoll(handle, ms) {
	try {
		mp.game.invoke('0xAE99FB955581844A', handle, ms, ms, 0, true, true, false);
	} catch (e) {}
}

function velocity(handle, x, y, z) {
	try {
		mp.game.invoke('0x1C99BB7B6E96D16F', handle, x, y, z);
	} catch (e) {}
}

function hurt(amount) {
	if (!world || !world.eventDamage) return;
	if (Date.now() - hurtAt < 1800) return;
	hurtAt = Date.now();
	try {
		mp.game.invoke('0x697157CED63F18D4', mp.players.local.handle, amount, true);
	} catch (e) {}
}

function flash() {
	try {
		if (mp.game.gameplay.forceLightningFlash) mp.game.gameplay.forceLightningFlash();
		else mp.game.invoke('0xF6062E089251C898');
	} catch (e) {}
}

function clearFx() {
	fxHandles.forEach(handle => {
		try {
			mp.game.graphics.stopParticleFxLooped(handle, false);
		} catch (e) {}
	});
	fxHandles = [];
}

function puff(dict, name, x, y, z, scale) {
	try {
		if (!mp.game.streaming.hasNamedPtfxAssetLoaded(dict)) {
			mp.game.streaming.requestNamedPtfxAsset(dict);
			return;
		}
		mp.game.graphics.setPtfxAssetNextCall(dict);
		const handle = mp.game.graphics.startParticleFxLoopedAtCoord(
			name, x, y, z, 0, 0, 0, scale, false, false, false, false,
		);
		if (handle) fxHandles.push(handle);
	} catch (e) {}
}

function tornadoPoint(event) {
	const dt = Math.max(0, Math.min(1.4, (Date.now() - (event.at || Date.now())) / 1000));
	return {
		x: event.x + (event.vx || 0) * dt,
		y: event.y + (event.vy || 0) * dt,
		z: event.z || 0,
	};
}

function spin(entity, point, radius) {
	if (!entity || !entity.position || !entity.handle) return false;
	const dx = point.x - entity.position.x;
	const dy = point.y - entity.position.y;
	const dist = Math.sqrt(dx * dx + dy * dy);
	if (dist > radius || dist < 0.4) return false;
	const power = (1 - dist / radius) * 16;
	const tx = -dy / dist;
	const ty = dx / dist;
	velocity(
		entity.handle,
		(dx / dist) * power * 0.55 + tx * power,
		(dy / dist) * power * 0.55 + ty * power,
		5 + power * 0.45,
	);
	return true;
}

function effects() {
	if (!world || !outside()) {
		setLook(null, 0);
		holdGrip(false);
		setLights(!!(world && world.blackout));
		return;
	}
	const zone = pickZone(mp.players.local.position);
	const id = desired(zone);
	const meta = info(id);
	const event = world.event;
	const here = eventHits(event, zone);
	let look = null;
	let strength = 0;
	let rain = meta.rain;
	let wind = meta.wind;
	if (meta.fx === 'sand') {
		look = 'spectator5';
		strength = 0.9;
	} else if (meta.fx === 'halloween') {
		look = 'REDMIST';
		strength = 0.28;
	}
	if (here && event.type === 'bloodmoon') {
		look = 'REDMIST';
		strength = 0.72;
		rain = 0.45;
		wind = 0.8;
	} else if (here && event.type === 'darkhour') {
		look = 'drug_flying_01';
		strength = 0.8;
		wind = 0.2;
	} else if (here && event.type === 'supercell') {
		look = 'lightning';
		strength = 0.35;
		rain = 1;
		wind = 1.4;
	} else if (here && event.type === 'tsunami') {
		rain = Math.max(rain, 0.35);
		wind = Math.max(wind, 1);
	}
	setLook(look, strength);
	setRain(rain);
	setWind(wind);
	holdGrip(!!(meta.grip && world.snowGrip));

	let dark = !!world.blackout;
	if (!dark && meta.fx === 'snow' && world.snowBlackout && Math.floor(Date.now() / 900) % 6 === 0) dark = true;
	setLights(dark);

	if (meta.fx === 'sand' && Date.now() - flashAt > 900) {
		flashAt = Date.now();
		const pos = mp.players.local.position;
		clearFx();
		puff('core', 'ent_amb_smoke_foundry', pos.x, pos.y, pos.z + 1, 0.8);
	}

	if (!here || !event) {
		if (meta.fx !== 'sand') clearFx();
		return;
	}
	if (event.type === 'earthquake') quake();
	else if (event.type === 'tornado') tornado(event);
	else if (event.type === 'supercell' || event.type === 'bloodmoon') storm();
	else if (event.type !== 'tsunami') clearFx();
}

function quake() {
	const power = world.earthquakePower || 1;
	if (Date.now() - quakeAt < 700) return;
	quakeAt = Date.now();
	shake('SMALL_EXPLOSION_SHAKE', 0.22 * power);
	const local = mp.players.local;
	if (!local.vehicle && Math.random() < 0.4 * power) ragdoll(local.handle, 1200);
}

function storm() {
	if (Date.now() - flashAt < 900) return;
	flashAt = Date.now() + Math.random() * 700;
	flash();
	shake('SMALL_EXPLOSION_SHAKE', 0.12);
}

function tornado(event) {
	const point = tornadoPoint(event);
	const radius = world.tornadoRadius || 28;
	if (Date.now() - flashAt > 700) {
		flashAt = Date.now();
		clearFx();
		puff('core', 'ent_amb_smoke_foundry', point.x, point.y, point.z + 2, 2.2);
		puff('core', 'ent_amb_smoke_foundry', point.x, point.y, point.z + 18, 1.6);
	}
	const local = mp.players.local;
	if (local.vehicle) spin(local.vehicle, point, radius);
	else if (spin(local, point, radius * 0.7)) ragdoll(local.handle, 1200);
	let left = 8;
	if (mp.vehicles && mp.vehicles.forEach) {
		mp.vehicles.forEach(vehicle => {
			if (!left || vehicle === local.vehicle) return;
			if (spin(vehicle, point, radius)) left--;
		});
	}
	left = 8;
	if (mp.peds && mp.peds.forEach) {
		mp.peds.forEach(ped => {
			if (!left || !ped || !ped.handle) return;
			if (!spin(ped, point, radius)) return;
			ragdoll(ped.handle, 2000);
			left--;
		});
	}
}

const FLOOD_TOP = 40;
const FLOOD_RADIUS = 1200;
const FLOOD_STEP = 900;

function buildFloodPoints() {
	const points = [];
	for (let x = -4500; x <= 5000; x += FLOOD_STEP) {
		for (let y = -4500; y <= 8500; y += FLOOD_STEP) {
			points.push({ x: x, y: y, base: 0 });
		}
	}
	return points;
}

const floodPoints = buildFloodPoints();

function num(value) {
	const n = Number(value);
	if (!isFinite(n)) return 0.001;
	return n + 0.001;
}

function riseWater(x, y, height) {
	const fx = num(x);
	const fy = num(y);
	const radius = num(FLOOD_RADIUS);
	const level = height ? num(height) : 0;
	try {
		if (mp.game.water && typeof mp.game.water.modifyWater === 'function') {
			mp.game.water.modifyWater(fx, fy, radius, level);
			return;
		}
	} catch (e) {}
	try {
		mp.game.invoke('0xC443FD757C3BA637', fx, fy, radius, level);
	} catch (e) {}
}

function resetOcean() {
	const water = mp.game.water;
	try {
		if (water && typeof water.resetDeepOceanScaler === 'function') {
			water.resetDeepOceanScaler();
			return;
		}
		if (water && typeof water.resetWavesIntensity === 'function') {
			water.resetWavesIntensity();
			return;
		}
	} catch (e) {}
	try {
		mp.game.invoke('0x5E5E99285AE812DB');
	} catch (e) {}
}

function waterBase(x, y) {
	try {
		const read = mp.game.water.getWaterHeightNoWaves || mp.game.water.getWaterHeight;
		const h = read.call(mp.game.water, x, y, 900, 0);
		if (typeof h === 'number' && h > -20 && h < 250) return h;
	} catch (e) {}
	return 0;
}

function floodLevel(event) {
	const duration = Math.max(1, event.endsAt - event.startedAt);
	const progress = Math.max(0, Math.min(1, (Date.now() - event.startedAt) / duration));
	return Math.sqrt(progress) * FLOOD_TOP;
}

function rememberBases() {
	for (let i = 0; i < floodPoints.length; i++) {
		const point = floodPoints[i];
		point.base = waterBase(point.x, point.y);
	}
}

function clearFlood() {
	for (let i = 0; i < floodPoints.length; i++) {
		const point = floodPoints[i];
		riseWater(point.x, point.y, point.base || 0);
	}
	floodOn = false;
	resetOcean();
}

function holdFlood() {
	const event = world && world.event;
	if (!event || event.type !== 'tsunami' || !outside()) {
		if (floodOn) clearFlood();
		return;
	}
	if (!floodOn) {
		floodOn = true;
		resetOcean();
		rememberBases();
	}
	const height = floodLevel(event);
	for (let i = 0; i < floodPoints.length; i++) {
		const point = floodPoints[i];
		riseWater(point.x, point.y, Math.max(point.base, height));
	}
	const pos = mp.players.local.position;
	const surface = Math.max(height, waterBase(pos.x, pos.y));
	if (!mp.players.local.vehicle && surface > 4 && pos.z < surface - 1) hurt(7);
}

function drawTornado() {
	if (!world || !world.event || world.event.type !== 'tornado' || !outside()) return;
	const zone = pickZone(mp.players.local.position);
	if (!eventHits(world.event, zone)) return;
	const point = tornadoPoint(world.event);
	const radius = (world.tornadoRadius || 28) * 2;
	mp.game.graphics.drawMarker(
		1, point.x, point.y, point.z - 2,
		0, 0, 0, 0, 0, 0,
		radius, radius, 70,
		180, 170, 150, 70,
		false, false, 2, false, null, null, false,
	);
}

function hex(color) {
	const value = parseInt(String(color || '#7ec8ff').replace('#', ''), 16);
	if (!isFinite(value)) return [126, 200, 255];
	return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function drawZones() {
	if (!world || (!panelOpen && !boundary)) return;
	const zones = world.zones || [];
	for (let i = 0; i < zones.length; i++) {
		const zone = zones[i];
		const hot = boundary ? boundary.id === zone.id : focusId === zone.id;
		const points = hot && boundary ? boundary.points : zone.points;
		if (!points || points.length < 2) continue;
		const rgb = hex(zone.color);
		const alpha = hot ? 230 : 90;
		for (let p = 0; p < points.length; p++) {
			const a = points[p];
			const b = points[(p + 1) % points.length];
			if (points.length < 3 && p === points.length - 1) break;
			mp.game.graphics.drawLine(a.x, a.y, a.z + 0.4, b.x, b.y, b.z + 0.4, rgb[0], rgb[1], rgb[2], alpha);
			if (hot) {
				mp.game.graphics.drawMarker(
					1, a.x, a.y, a.z - 1,
					0, 0, 0, 0, 0, 0,
					0.7, 0.7, 1.1,
					rgb[0], rgb[1], rgb[2], 180,
					false, false, 2, false, null, null, false,
				);
			}
		}
	}
	if (boundary && mp.utils && mp.utils.drawText2d) {
		mp.utils.drawText2d(
			'H точка    Backspace убрать    Enter сохранить    Esc отмена',
			[0.5, 0.9],
			[231, 242, 246, 230],
			[0.34, 0.34],
		);
	}
}

function showPanel(payload) {
	if (payload) lastPanel = payload;
	panelOpen = true;
	lastPanelTick = Date.now();
	if (!mp.busy.includes('weatherPanel')) mp.busy.add('weatherPanel', true);
	mp.callCEFR('weatherPanel.open', [lastPanel]);
}

function hidePanel() {
	panelOpen = false;
	mp.busy.remove('weatherPanel');
	mp.callCEFR('weatherPanel.hide', []);
}

function edge(code, field) {
	if (!mp.keys.isDown(code)) {
		boundary[field] = false;
		return false;
	}
	if (boundary[field]) return false;
	boundary[field] = true;
	return true;
}

function lite(payload) {
	return {
		now: payload.now,
		blackout: payload.blackout,
		globalWeather: payload.globalWeather,
		time: payload.time,
		event: payload.event,
		zones: (payload.zones || []).map(zone => ({
			id: zone.id,
			weather: zone.weather,
			summary: zone.summary,
			icon: zone.icon,
			temperature: zone.temperature,
			locked: zone.locked,
			nextChangeAt: zone.nextChangeAt,
			overrideUntil: zone.overrideUntil,
			players: zone.players,
		})),
	};
}

mp.events.add({
	'weather.info.update': weather => {
		if (!weather || world) return;
		mp.events.call('hud.setData', {
			temperature: parseInt(weather.temperature, 10) || 0,
			weather: weather.icon,
			summary: weather.summary,
		});
	},
	'weather.state': payload => {
		world = payload;
		lastHud = '';
		if (!panelOpen) return;
		if (Date.now() - lastPanelTick < 15000) return;
		lastPanelTick = Date.now();
		mp.callCEFR('weatherPanel.tick', [lite(payload)]);
	},
	'weatherPanel.open': payload => {
		showPanel(payload);
	},
	'weatherPanel.data': payload => {
		lastPanel = payload;
		if (reopen) {
			reopen = false;
			showPanel(payload);
			return;
		}
		if (panelOpen) mp.callCEFR('weatherPanel.setData', [payload]);
	},
	'weatherPanel.close': () => {
		reopen = false;
		hidePanel();
		mp.events.callRemote('weather.action', JSON.stringify({ action: 'close' }));
	},
	'weather.zone.focus': id => {
		focusId = parseInt(id, 10) || 0;
	},
	'weather.boundary': id => {
		const zoneId = parseInt(id, 10);
		if (!world) return;
		const zone = (world.zones || []).find(item => item.id === zoneId);
		if (!zone) return;
		boundary = {
			id: zoneId,
			points: (zone.points || []).map(point => ({ x: point.x, y: point.y, z: point.z })),
		};
		reopen = false;
		hidePanel();
	},
	'characterInit.done': () => {
		mp.events.callRemote('weather.ready');
	},
	render: () => {
		try {
			holdFlood();
		} catch (e) {}
		try {
			applySky();
		} catch (e) {}
		try {
			drawTornado();
			drawZones();
		} catch (e) {}
		if (!boundary) return;
		if (mp.gui.cursor.visible) return;
		const local = mp.players.local;
		if (edge(0x48, 'h')) {
			boundary.points.push({
				x: Math.round(local.position.x * 100) / 100,
				y: Math.round(local.position.y * 100) / 100,
				z: Math.round(local.position.z * 100) / 100,
			});
		}
		if (edge(0x08, 'back')) boundary.points.pop();
		if (edge(0x0d, 'enter')) {
			const points = boundary.points.slice();
			const id = boundary.id;
			boundary = null;
			if (points.length < 3) {
				if (lastPanel) showPanel(lastPanel);
			} else {
				reopen = true;
				mp.events.callRemote('weather.action', JSON.stringify({ action: 'points', id: id, points: points }));
			}
		}
		if (boundary && edge(0x1b, 'esc')) {
			boundary = null;
			if (lastPanel) showPanel(lastPanel);
		}
	},
});

setInterval(() => {
	try {
		effects();
	} catch (e) {}
}, 250);
