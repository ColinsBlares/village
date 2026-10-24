'use strict';

const fs = require('fs');
const path = require('path');
const request = require('request');
const catalog = require('./catalog');

const FILE = path.join(__dirname, 'state.json');
const API_KEY = 'MsVimSxzjhcKbGui0wX7Fswajppf838q';
const TIME_ZONE = 'America/Los_Angeles';
const REQUEST_TIME = 30 * 60 * 1000;

let state = null;
let customTemperature = null;
let forecast = [];
let clockMode = 'real';
let worldDirty = true;
let panelDirty = false;
let saveTimer = null;
let forecastTimer = null;
let forecastHour = -1;
let beat = 0;
let loop = null;

const api = {
	customWeather: false,
	customWeatherType: 'winter',

	init() {
		state = load();
		armCycles();
		this.requestWeather();
		if (loop) clearInterval(loop);
		loop = setInterval(() => {
			try {
				this.tick();
			} catch (err) {
				console.log('[WEATHER]', err);
			}
		}, 1000);
		console.log(`[WEATHER] Зон: ${state.zones.length}`);
	},

	getCurrentWeather(player) {
		ensure();
		const zone = zoneForPlayer(player) || state.zones[0];
		const meta = resolveWeather(zone);
		const forced = !!(state.settings.globalWeather || api.customWeather);
		let temperature = zone && zone.temperature != null ? zone.temperature : meta.temp[0];
		if (customTemperature != null) temperature = customTemperature;
		if (api.customWeather && api.customWeatherType === 'winter') {
			const hour = new Date().getHours();
			temperature = hour > 6 && hour < 23 ? -4 : -7;
		}
		return {
			summary: forced ? meta.label : ((zone && zone.summary) || meta.label),
			temperature: temperature,
			icon: forced ? meta.icon : ((zone && zone.icon) || meta.icon),
		};
	},

	getGameWeatherByIcon(icon) {
		return catalog.FORECAST_ICON[icon] || 'SMOG';
	},

	setCustomTemperature(temp) {
		customTemperature = parseInt(temp, 10);
		worldDirty = true;
		pushInfo();
	},

	resetCustomTemperature() {
		customTemperature = null;
		worldDirty = true;
		pushInfo();
	},

	requestWeather() {
		request(
			`https://api.pirateweather.net/forecast/${API_KEY}/34,-118?exclude=currently,minutely,daily,alerts,flags&lang=ru&units=si`,
			{ json: true },
			(err, res, body) => {
				if (err || !body || body.error || !body.hourly) {
					console.log('[WEATHER] Прогноз не загрузился, зоны работают своим циклом');
					setTimeout(() => api.requestWeather(), REQUEST_TIME);
					return;
				}
				forecast = [];
				try {
					for (let i = 0; i < body.hourly.data.length && i < 48; i++) {
						const row = body.hourly.data[i];
						let tz = new Date(row.time * 1000).toLocaleString('en-US', { timeZone: TIME_ZONE });
						tz = new Date(tz);
						forecast.push({
							time: tz.getHours(),
							summary: row.summary,
							temperature: row.temperature,
							icon: row.icon,
						});
					}
				} catch (e) {
					console.log('[WEATHER]', e);
					return;
				}
				console.log('[WEATHER] Прогноз Лос-Анджелеса загружен');
				forecastHour = -1;
				scheduleForecast();
			},
		);
	},

	tick() {
		ensure();
		const changed = step();
		if (changed.world) worldDirty = true;
		if (changed.panel) panelDirty = true;
		applyWorldClock();
		if (worldDirty) {
			worldDirty = false;
			broadcastState();
		}
		if (panelDirty) {
			panelDirty = false;
			broadcastPanel();
		}
	},

	openPanel(player) {
		if (!isAdmin(player)) return;
		player.weatherPanel = true;
		player.call('weatherPanel.open', [panelPayload()]);
		player.call('weather.state', [clientPayload()]);
	},

	sendState(player) {
		if (!player || !mp.players.exists(player)) return;
		player.call('weather.state', [clientPayload()]);
		player.call('weather.info.update', [this.getCurrentWeather(player)]);
	},

	handle(player, raw) {
		if (!isAdmin(player)) return;
		const data = read(raw);
		if (!data || !data.action) return;
		if (data.action === 'close') {
			player.weatherPanel = false;
			return;
		}
		if (!applyAction(player, data)) {
			player.call('weatherPanel.data', [panelPayload()]);
			return;
		}
		scheduleSave();
		broadcastState();
		broadcastPanel();
		worldDirty = false;
		panelDirty = false;
	},
};

function ensure() {
	if (!state) state = load();
}

function load() {
	let saved = null;
	try {
		if (fs.existsSync(FILE)) saved = JSON.parse(fs.readFileSync(FILE, 'utf8'));
	} catch (e) {
		saved = null;
	}
	const base = catalog.defaultState();
	if (!saved) return base;
	base.settings = Object.assign(base.settings, saved.settings || {});
	base.settings.globalWeather = base.settings.globalWeather || null;
	if (Array.isArray(saved.zones) && saved.zones.length) {
		base.zones = saved.zones.map(sanitizeZone).filter(Boolean);
	}
	if (!base.zones.length) base.zones = catalog.defaultState().zones;
	base.nextId = Math.max(saved.nextId || 0, maxId(base.zones) + 1);
	if (saved.event && saved.event.endsAt > Date.now()) base.event = saved.event;
	return base;
}

function scheduleSave() {
	if (saveTimer) return;
	saveTimer = setTimeout(() => {
		saveTimer = null;
		try {
			const copy = JSON.parse(JSON.stringify(state));
			fs.writeFileSync(FILE, JSON.stringify(copy));
		} catch (e) {
			console.log('[WEATHER] Не удалось сохранить state.json', e);
		}
	}, 400);
}

function maxId(zones) {
	return zones.reduce((max, zone) => Math.max(max, zone.id || 0), 0);
}

function sanitizeZone(raw) {
	if (!raw || !isFinite(raw.id)) return null;
	const meta = catalog.weatherById(raw.weather) || catalog.WEATHERS[0];
	const points = Array.isArray(raw.points) ? raw.points.slice(0, 64).map(cleanPoint).filter(Boolean) : [];
	return {
		id: raw.id | 0,
		name: String(raw.name || 'Зона').slice(0, 40),
		color: /^#[0-9a-fA-F]{6}$/.test(raw.color || '') ? raw.color : '#7ec8ff',
		enabled: raw.enabled !== false,
		priority: clamp(raw.priority, -100, 1000),
		points: points,
		minZ: isFinite(raw.minZ) ? raw.minZ : -200,
		maxZ: isFinite(raw.maxZ) ? raw.maxZ : 2000,
		weather: meta.id,
		locked: !!raw.locked,
		overrideUntil: raw.overrideUntil || 0,
		nextChangeAt: raw.nextChangeAt || 0,
		transitionSec: clamp(raw.transitionSec == null ? 12 : raw.transitionSec, 0, 180),
		followForecast: !!raw.followForecast,
		temperature: isFinite(raw.temperature) ? raw.temperature : meta.temp[0],
		summary: String(raw.summary || meta.label).slice(0, 48),
		icon: String(raw.icon || meta.icon),
		clock: {
			enabled: !!(raw.clock && raw.clock.enabled),
			hour: normHour(raw.clock && raw.clock.hour),
			minute: clamp(raw.clock && raw.clock.minute, 0, 59),
			frozen: !raw.clock || raw.clock.frozen !== false,
			scale: clamp(raw.clock && raw.clock.scale != null ? raw.clock.scale : 1, 0, 60),
			_acc: raw.clock && raw.clock._acc ? raw.clock._acc : 0,
		},
		cycle: sanitizeCycle(raw.cycle),
	};
}

function sanitizeCycle(rows) {
	if (!Array.isArray(rows) || !rows.length) {
		return [{ id: 'EXTRASUNNY', chance: 1, minMin: 20, maxMin: 40 }];
	}
	return rows.slice(0, 24).map(row => {
		const meta = catalog.weatherById(row.id) || catalog.WEATHERS[0];
		return {
			id: meta.id,
			chance: clamp(row.chance, 0, 100),
			minMin: clamp(row.minMin || 5, 1, 240),
			maxMin: clamp(row.maxMin || 20, 1, 240),
		};
	});
}

function cleanPoint(point) {
	if (!point || !isFinite(point.x) || !isFinite(point.y)) return null;
	if (Math.abs(point.x) > 10000 || Math.abs(point.y) > 10000) return null;
	return {
		x: round(point.x),
		y: round(point.y),
		z: isFinite(point.z) ? round(point.z) : 0,
	};
}

function armCycles() {
	const now = Date.now();
	state.zones.forEach(zone => {
		if (!zone.nextChangeAt) zone.nextChangeAt = now + rand(10, 25) * 60000;
	});
}

function step() {
	const flags = { world: false, panel: false };
	const now = Date.now();
	beat++;
	if (beat >= 20) {
		beat = 0;
		flags.world = true;
	}
	if (syncForecastHour()) {
		flags.world = true;
		flags.panel = true;
	}
	advanceGlobal();
	state.zones.forEach(zone => {
		if (zone.clock && zone.clock.enabled) {
			advance(zone.clock, zone.clock.frozen, zone.clock.scale);
		}
		if (rollZone(zone, now)) {
			flags.world = true;
			flags.panel = true;
		}
	});
	if (state.event) {
		if (now >= state.event.endsAt) {
			stopEvent();
			flags.world = true;
			flags.panel = true;
		} else if (state.event.type === 'tornado') {
			moveTornado();
			flags.world = true;
		}
	}
	return flags;
}

function advanceGlobal() {
	if (state.settings.realtime) {
		const date = new Date();
		state.settings.hour = date.getHours();
		state.settings.minute = date.getMinutes();
		state.settings._acc = date.getSeconds();
		return;
	}
	advance(state.settings, state.settings.frozen, state.settings.scale);
}

function advance(clock, frozen, scale) {
	if (frozen || !scale) return;
	clock._acc = (clock._acc || 0) + scale;
	while (clock._acc >= 60) {
		clock._acc -= 60;
		clock.minute = (clock.minute + 1) % 60;
		if (clock.minute === 0) clock.hour = (clock.hour + 1) % 24;
	}
}

function rollZone(zone, now) {
	if (!state.settings.cycleEnabled || !zone.enabled || zone.locked) return false;
	if (zone.followForecast && state.settings.useForecast) return false;
	if (zone.overrideUntil && zone.overrideUntil > now) return false;
	if (zone.overrideUntil && zone.overrideUntil <= now) zone.overrideUntil = 0;
	if (zone.nextChangeAt && zone.nextChangeAt > now) return false;
	const row = pickCycle(zone);
	if (!row) return false;
	setZoneWeather(zone, row.id, 0);
	return true;
}

function pickCycle(zone) {
	const rows = (zone.cycle || []).filter(row => row.chance > 0 && catalog.weatherById(row.id));
	const total = rows.reduce((sum, row) => sum + row.chance, 0);
	if (!total) return null;
	let shot = Math.random() * total;
	for (let i = 0; i < rows.length; i++) {
		shot -= rows[i].chance;
		if (shot <= 0) return rows[i];
	}
	return rows[rows.length - 1];
}

function setZoneWeather(zone, id, minutes) {
	const meta = catalog.weatherById(id);
	if (!meta || !zone) return false;
	zone.weather = meta.id;
	zone.summary = meta.label;
	zone.icon = meta.icon;
	zone.temperature = rand(meta.temp[0], meta.temp[1]);
	const row = (zone.cycle || []).find(item => item.id === meta.id);
	const min = row ? row.minMin : 15;
	const max = row ? Math.max(row.maxMin, min) : 40;
	zone.nextChangeAt = Date.now() + rand(min, max) * 60000;
	zone.overrideUntil = minutes > 0 ? Date.now() + minutes * 60000 : 0;
	return true;
}

function laHour() {
	try {
		const text = new Date().toLocaleString('en-US', { timeZone: TIME_ZONE });
		return new Date(text).getHours();
	} catch (e) {
		return new Date().getHours();
	}
}

function scheduleForecast() {
	if (forecastTimer) clearTimeout(forecastTimer);
	forecastTimer = setTimeout(() => {
		forecastTimer = null;
		api.requestWeather();
	}, 3 * 60 * 60 * 1000);
}

function syncForecastHour() {
	if (!state.settings.useForecast || !forecast.length) return false;
	const hour = laHour();
	if (hour === forecastHour) return false;
	forecastHour = hour;
	const row = forecast.find(item => item.time === hour) || forecast[0];
	if (!row) return false;
	const weatherId = catalog.FORECAST_ICON[row.icon] || 'CLOUDS';
	const meta = catalog.weatherById(weatherId) || catalog.WEATHERS[0];
	let changed = false;
	state.zones.forEach(zone => {
		if (!zone.followForecast || zone.locked) return;
		if (zone.overrideUntil && zone.overrideUntil > Date.now()) return;
		zone.weather = meta.id;
		zone.summary = row.summary || meta.label;
		zone.icon = row.icon || meta.icon;
		zone.temperature = Math.round(row.temperature);
		zone.nextChangeAt = Date.now() + 60 * 60000;
		changed = true;
	});
	return changed;
}

function applyWorldClock() {
	let time;
	try {
		time = call('time');
	} catch (e) {
		return;
	}
	if (!time || time.isEmpty || !time.setCustomTime) return;
	if (state.settings.realtime) {
		if (clockMode !== 'real') {
			clockMode = 'real';
			time.resetCustomTime();
		}
		return;
	}
	clockMode = 'custom';
	time.setCustomTime(state.settings.hour | 0, state.settings.minute | 0);
}

function zoneForPlayer(player) {
	if (!player || !player.position) return null;
	if (player.dimension) return null;
	return zoneAt(player.position.x, player.position.y, player.position.z);
}

function zoneAt(x, y, z) {
	let best = null;
	let fallback = null;
	state.zones.forEach(zone => {
		if (!zone.enabled) return;
		if (!fallback || zone.priority < fallback.priority) fallback = zone;
		if (z < zone.minZ || z > zone.maxZ) return;
		if (!zone.points || zone.points.length < 3) return;
		if (!inside(x, y, zone.points)) return;
		if (!best || zone.priority > best.priority) best = zone;
	});
	return best || fallback;
}

function zoneById(id) {
	return state.zones.find(zone => zone.id === (id | 0)) || null;
}

function inside(x, y, points) {
	let hit = false;
	for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
		const yi = points[i].y;
		const yj = points[j].y;
		const intersect = (yi > y) !== (yj > y)
			&& x < ((points[j].x - points[i].x) * (y - yi)) / ((yj - yi) || 1e-9) + points[i].x;
		if (intersect) hit = !hit;
	}
	return hit;
}

function resolveWeather(zone) {
	if (api.customWeather) return catalog.weatherById('SNOW');
	if (state.settings.globalWeather && catalog.weatherById(state.settings.globalWeather)) {
		return catalog.weatherById(state.settings.globalWeather);
	}
	if (zone && catalog.weatherById(zone.weather)) return catalog.weatherById(zone.weather);
	return catalog.WEATHERS[0];
}

function counts() {
	const map = {};
	mp.players.forEach(player => {
		if (!player || !player.position || player.dimension) return;
		const zone = zoneAt(player.position.x, player.position.y, player.position.z);
		if (!zone) return;
		map[zone.id] = (map[zone.id] || 0) + 1;
	});
	return map;
}

function clockPayload(clock, realtime) {
	return {
		hour: clock.hour | 0,
		minute: clock.minute | 0,
		second: Math.floor(clock._acc || 0) % 60,
		realtime: !!realtime,
		frozen: !!clock.frozen,
		scale: Number(clock.scale != null ? clock.scale : state.settings.scale) || 0,
		stamp: Date.now(),
	};
}

function clientPayload() {
	ensure();
	const people = counts();
	return {
		now: Date.now(),
		tempOverride: customTemperature,
		blackout: !!state.settings.blackout,
		globalWeather: state.settings.globalWeather,
		transitionSec: state.settings.transitionSec,
		windScale: state.settings.windScale,
		snowGrip: !!state.settings.snowGrip,
		snowBlackout: !!state.settings.snowBlackout,
		eventDamage: state.settings.eventDamage !== false,
		earthquakePower: state.settings.earthquakePower,
		tornadoRadius: state.settings.tornadoRadius,
		time: clockPayload(state.settings, state.settings.realtime),
		event: state.event ? {
			type: state.event.type,
			zoneId: state.event.zoneId,
			startedAt: state.event.startedAt,
			endsAt: state.event.endsAt,
			at: Date.now(),
			x: state.event.x,
			y: state.event.y,
			z: state.event.z,
			vx: state.event.vx,
			vy: state.event.vy,
		} : null,
		zones: state.zones.map(zone => ({
			id: zone.id,
			name: zone.name,
			color: zone.color,
			enabled: zone.enabled,
			priority: zone.priority,
			points: zone.points,
			minZ: zone.minZ,
			maxZ: zone.maxZ,
			weather: zone.weather,
			summary: zone.summary,
			icon: zone.icon,
			temperature: zone.temperature,
			transitionSec: zone.transitionSec,
			locked: zone.locked,
			nextChangeAt: zone.nextChangeAt,
			overrideUntil: zone.overrideUntil,
			players: people[zone.id] || 0,
			clock: {
				enabled: zone.clock.enabled,
				hour: zone.clock.hour,
				minute: zone.clock.minute,
				second: Math.floor(zone.clock._acc || 0) % 60,
				frozen: zone.clock.frozen,
				scale: zone.clock.scale,
			},
		})),
	};
}

function panelPayload() {
	const runtime = clientPayload();
	return {
		now: runtime.now,
		settings: Object.assign({}, state.settings, { globalWeather: state.settings.globalWeather }),
		settingSchema: catalog.SETTINGS,
		weathers: catalog.WEATHERS.map(item => ({
			id: item.id,
			label: item.label,
			category: item.category,
			icon: item.icon,
		})),
		categories: catalog.CATEGORIES,
		events: catalog.EVENTS.map(item => ({
			id: item.id,
			label: item.label,
			text: item.text,
			global: item.global,
			minutes: item.minutes,
		})),
		zones: state.zones.map(zone => {
			const live = runtime.zones.find(item => item.id === zone.id);
			return Object.assign({}, live, {
				followForecast: zone.followForecast,
				cycle: zone.cycle.map(row => Object.assign({}, row)),
				clock: Object.assign({ stamp: runtime.now }, live.clock),
			});
		}),
		time: runtime.time,
		event: runtime.event,
		playersOnline: onlineCount(),
	};
}

function onlineCount() {
	let total = 0;
	mp.players.forEach(player => {
		if (player && player.character) total++;
	});
	return total;
}

function broadcastState() {
	const payload = clientPayload();
	mp.players.forEach(player => {
		if (!player || !mp.players.exists(player)) return;
		player.call('weather.state', [payload]);
	});
}

function broadcastPanel() {
	const payload = panelPayload();
	mp.players.forEach(player => {
		if (!player || !player.weatherPanel || !mp.players.exists(player)) return;
		player.call('weatherPanel.data', [payload]);
	});
}

function pushInfo() {
	mp.players.forEach(player => {
		if (!player || !mp.players.exists(player)) return;
		player.call('weather.info.update', [api.getCurrentWeather(player)]);
	});
}

function applyAction(player, data) {
	if (data.action === 'global') {
		const id = data.weather ? String(data.weather) : null;
		state.settings.globalWeather = id && catalog.weatherById(id) ? id : null;
		return true;
	}
	if (data.action === 'settings') {
		const item = catalog.SETTINGS.find(row => row.key === data.key);
		if (!item) return false;
		if (item.type === 'bool') state.settings[item.key] = !!data.value;
		else state.settings[item.key] = clamp(Number(data.value), item.min, item.max);
		return true;
	}
	if (data.action === 'time') {
		if (data.realtime != null) state.settings.realtime = !!data.realtime;
		if (data.frozen != null) state.settings.frozen = !!data.frozen;
		if (data.scale != null) state.settings.scale = clamp(Number(data.scale), 0, 60);
		if (data.hour != null) {
			state.settings.hour = normHour(data.hour);
			state.settings.realtime = false;
		}
		if (data.minute != null) {
			state.settings.minute = clamp(data.minute, 0, 59);
			state.settings.realtime = false;
		}
		if (data.hour != null || data.minute != null) state.settings._acc = 0;
		return true;
	}
	if (data.action === 'randomizeAll') {
		state.zones.forEach(zone => {
			if (zone.locked) return;
			const row = pickCycle(zone);
			if (row) setZoneWeather(zone, row.id, 0);
		});
		return true;
	}
	if (data.action === 'create') {
		createZone(player);
		return true;
	}
	if (data.action === 'delete') {
		if (state.zones.length <= 1) return false;
		state.zones = state.zones.filter(zone => zone.id !== (data.id | 0));
		return true;
	}
	if (data.action === 'weather') {
		const zone = zoneById(data.id);
		return setZoneWeather(zone, data.weather, clamp(data.minutes || 0, 0, 240));
	}
	if (data.action === 'lock') {
		const zone = zoneById(data.id);
		if (!zone) return false;
		zone.locked = !!data.locked;
		return true;
	}
	if (data.action === 'randomize') {
		const zone = zoneById(data.id);
		if (!zone) return false;
		const row = pickCycle(zone);
		if (!row) return false;
		zone.locked = false;
		return setZoneWeather(zone, row.id, 0);
	}
	if (data.action === 'patch') return patchZone(data);
	if (data.action === 'pointAdd') return addPoint(player, data.id);
	if (data.action === 'pointPop') return popPoint(data.id);
	if (data.action === 'points') return setPoints(data.id, data.points);
	if (data.action === 'event') return startEvent(player, data);
	if (data.action === 'eventStop') {
		if (!state.event) return false;
		stopEvent();
		return true;
	}
	return false;
}

function createZone(player) {
	const pos = player.position;
	const id = state.nextId++;
	const meta = catalog.WEATHERS[0];
	state.zones.push(sanitizeZone({
		id: id,
		name: 'Зона ' + id,
		color: '#f2b544',
		priority: 30,
		weather: meta.id,
		summary: meta.label,
		icon: meta.icon,
		temperature: 24,
		points: [
			{ x: pos.x - 140, y: pos.y - 140, z: pos.z },
			{ x: pos.x + 140, y: pos.y - 140, z: pos.z },
			{ x: pos.x + 140, y: pos.y + 140, z: pos.z },
			{ x: pos.x - 140, y: pos.y + 140, z: pos.z },
		],
		clock: { enabled: false, hour: state.settings.hour, minute: state.settings.minute, frozen: true, scale: 1 },
	}));
}

function patchZone(data) {
	const zone = zoneById(data.id);
	if (!zone) return false;
	if (data.name != null) zone.name = String(data.name || zone.name).slice(0, 40);
	if (data.color != null && /^#[0-9a-fA-F]{6}$/.test(data.color)) zone.color = data.color;
	if (data.priority != null) zone.priority = clamp(data.priority, -100, 1000);
	if (data.enabled != null) zone.enabled = !!data.enabled;
	if (data.minZ != null) zone.minZ = Number(data.minZ) || 0;
	if (data.maxZ != null) zone.maxZ = Number(data.maxZ) || 0;
	if (zone.minZ > zone.maxZ) {
		const swap = zone.minZ;
		zone.minZ = zone.maxZ;
		zone.maxZ = swap;
	}
	if (data.transitionSec != null) zone.transitionSec = clamp(data.transitionSec, 0, 180);
	if (data.followForecast != null) zone.followForecast = !!data.followForecast;
	if (data.cycle) zone.cycle = sanitizeCycle(data.cycle);
		if (data.clock) {
		zone.clock.enabled = !!data.clock.enabled;
		zone.clock.hour = normHour(data.clock.hour);
		zone.clock.minute = clamp(data.clock.minute, 0, 59);
		zone.clock.frozen = !!data.clock.frozen;
		zone.clock.scale = clamp(data.clock.scale != null ? data.clock.scale : 1, 0, 60);
		zone.clock._acc = 0;
	}
	return true;
}

function addPoint(player, id) {
	const zone = zoneById(id);
	if (!zone || zone.points.length >= 64) return false;
	zone.points.push(cleanPoint({
		x: player.position.x,
		y: player.position.y,
		z: player.position.z,
	}));
	return true;
}

function popPoint(id) {
	const zone = zoneById(id);
	if (!zone || !zone.points.length) return false;
	zone.points.pop();
	return true;
}

function setPoints(id, points) {
	const zone = zoneById(id);
	if (!zone || !Array.isArray(points)) return false;
	const next = points.slice(0, 64).map(cleanPoint).filter(Boolean);
	if (next.length < 3) return false;
	zone.points = next;
	return true;
}

function startEvent(player, data) {
	const meta = catalog.eventById(data.type);
	if (!meta) return false;
	const minutes = clamp(data.minutes || meta.minutes, 1, 30);
	const zone = meta.global ? null : zoneById(data.zoneId);
	if (!meta.global && !zone) return false;
	stopEvent();
	const spot = eventSpot(player, zone);
	const heading = Math.random() * Math.PI * 2;
	const speed = state.settings.tornadoSpeed || 9;
	state.event = {
		type: meta.id,
		zoneId: zone ? zone.id : null,
		startedAt: Date.now(),
		endsAt: Date.now() + minutes * 60000,
		x: spot.x,
		y: spot.y,
		z: spot.z,
		vx: Math.sin(heading) * speed,
		vy: Math.cos(heading) * speed,
		restore: null,
	};
	warnAll(meta.warn);
	return true;
}

function eventSpot(player, zone) {
	if (zone && player.position && inside(player.position.x, player.position.y, zone.points)) {
		return { x: player.position.x, y: player.position.y, z: player.position.z };
	}
	if (!zone || !zone.points.length) {
		return { x: player.position.x, y: player.position.y, z: player.position.z };
	}
	let x = 0;
	let y = 0;
	let z = 0;
	zone.points.forEach(point => {
		x += point.x;
		y += point.y;
		z += point.z || 0;
	});
	const count = zone.points.length;
	return { x: x / count, y: y / count, z: z / count };
}

function moveTornado() {
	const event = state.event;
	if (!event) return;
	event.x += event.vx;
	event.y += event.vy;
	const zone = zoneById(event.zoneId);
	if (zone && zone.points.length >= 3 && !inside(event.x, event.y, zone.points)) {
		event.vx = -event.vx + (Math.random() - 0.5) * 4;
		event.vy = -event.vy + (Math.random() - 0.5) * 4;
		const speed = state.settings.tornadoSpeed || 9;
		const len = Math.sqrt(event.vx * event.vx + event.vy * event.vy) || 1;
		event.vx = (event.vx / len) * speed;
		event.vy = (event.vy / len) * speed;
	}
}

function stopEvent() {
	state.event = null;
}

function warnAll(text) {
	let notifs;
	try {
		notifs = call('notifications');
	} catch (e) {
		return;
	}
	if (!notifs || notifs.isEmpty) return;
	mp.players.forEach(player => {
		if (!player || !player.character) return;
		notifs.warning(player, text, 'Погода');
	});
}

function isAdmin(player) {
	return !!(player && player.character && Number(player.character.admin) >= 6);
}

function read(raw) {
	if (!raw) return null;
	if (typeof raw === 'object') return raw;
	try {
		return JSON.parse(raw);
	} catch (e) {
		return null;
	}
}

function clamp(value, min, max) {
	const number = Number(value);
	if (!isFinite(number)) return min;
	return Math.max(min, Math.min(max, number));
}

function normHour(value) {
	const hour = parseInt(value, 10);
	if (!isFinite(hour)) return 12;
	return ((hour % 24) + 24) % 24;
}

function rand(min, max) {
	const a = Math.ceil(min);
	const b = Math.floor(max);
	if (b <= a) return a;
	return Math.floor(Math.random() * (b - a + 1)) + a;
}

function round(value) {
	return Math.round(value * 100) / 100;
}

module.exports = api;
