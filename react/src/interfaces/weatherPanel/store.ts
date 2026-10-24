import { create } from 'zustand';

export interface WeatherType {
	id: string;
	label: string;
	category: string;
	icon: string;
}

export interface CycleRow {
	id: string;
	chance: number;
	minMin: number;
	maxMin: number;
}

export interface ZoneClock {
	enabled: boolean;
	hour: number;
	minute: number;
	second: number;
	frozen: boolean;
	scale: number;
	stamp?: number;
}

export interface ZoneView {
	id: number;
	name: string;
	color: string;
	enabled: boolean;
	priority: number;
	points: Array<{ x: number; y: number; z: number }>;
	minZ: number;
	maxZ: number;
	weather: string;
	summary: string;
	icon: string;
	temperature: number;
	locked: boolean;
	nextChangeAt: number;
	overrideUntil: number;
	transitionSec: number;
	followForecast: boolean;
	players: number;
	cycle: CycleRow[];
	clock: ZoneClock;
}

export interface TimeSnap {
	hour: number;
	minute: number;
	second: number;
	realtime: boolean;
	frozen: boolean;
	scale: number;
	stamp: number;
}

export interface SettingField {
	key: string;
	label: string;
	group: string;
	type: string;
	min?: number;
	max?: number;
	step?: number;
}

export interface DisasterInfo {
	id: string;
	label: string;
	text: string;
	global: boolean;
	minutes: number;
}

export interface SkyEvent {
	type: string;
	zoneId: number | null;
	startedAt: number;
	endsAt: number;
	x?: number;
	y?: number;
}

export interface PanelPayload {
	now: number;
	settings: { [key: string]: string | number | boolean | null };
	settingSchema: SettingField[];
	weathers: WeatherType[];
	categories: Array<{ id: string; label: string }>;
	events: DisasterInfo[];
	zones: ZoneView[];
	time: TimeSnap;
	event: SkyEvent | null;
	playersOnline: number;
}

export interface LivePatch {
	now: number;
	blackout: boolean;
	globalWeather: string | null;
	time: TimeSnap;
	event: SkyEvent | null;
	zones: Array<{
		id: number;
		weather: string;
		summary: string;
		icon: string;
		temperature: number;
		locked: boolean;
		nextChangeAt: number;
		overrideUntil: number;
		players: number;
	}>;
}

interface PanelState {
	show: boolean;
	tab: string;
	selectedId: number | null;
	offset: number;
	settings: { [key: string]: string | number | boolean | null };
	settingSchema: SettingField[];
	weathers: WeatherType[];
	categories: Array<{ id: string; label: string }>;
	events: DisasterInfo[];
	zones: ZoneView[];
	time: TimeSnap;
	event: SkyEvent | null;
	playersOnline: number;
}

const emptyTime: TimeSnap = {
	hour: 12,
	minute: 0,
	second: 0,
	realtime: true,
	frozen: false,
	scale: 1,
	stamp: 0,
};

export const useWeatherPanelStore = create<PanelState>(() => ({
	show: false,
	tab: 'overview',
	selectedId: null,
	offset: 0,
	settings: {},
	settingSchema: [],
	weathers: [],
	categories: [],
	events: [],
	zones: [],
	time: emptyTime,
	event: null,
	playersOnline: 0,
}));

let timeLocked = false;

export function lockTime(locked: boolean) {
	timeLocked = locked;
}

function keepId(zones: ZoneView[], selectedId: number | null) {
	if (zones.some(zone => zone.id === selectedId)) return selectedId;
	return zones.length ? zones[0].id : null;
}

function taken(payload: PanelPayload, selectedId: number | null, tab: string) {
	const zones = payload.zones || [];
	return {
		offset: (payload.now || Date.now()) - Date.now(),
		settings: payload.settings || {},
		settingSchema: payload.settingSchema || [],
		weathers: payload.weathers || [],
		categories: payload.categories || [],
		events: payload.events || [],
		zones: zones,
		time: payload.time || emptyTime,
		event: payload.event || null,
		playersOnline: payload.playersOnline || 0,
		selectedId: keepId(zones, selectedId),
		tab: tab,
	};
}

export function openWeatherPanel(payload: PanelPayload) {
	const state = useWeatherPanelStore.getState();
	useWeatherPanelStore.setState({
		show: true,
		...taken(payload, state.selectedId, state.tab),
	});
}

export function setWeatherPanel(payload: PanelPayload) {
	const state = useWeatherPanelStore.getState();
	if (!state.show) return;
	useWeatherPanelStore.setState(taken(payload, state.selectedId, state.tab));
}

export function applyLive(patch: LivePatch) {
	const state = useWeatherPanelStore.getState();
	if (!state.show || !patch) return;
	const rows = patch.zones || [];
	const next: Partial<PanelState> = {
		offset: (patch.now || Date.now()) - Date.now(),
		event: patch.event || null,
		settings: Object.assign({}, state.settings, {
			blackout: patch.blackout,
			globalWeather: patch.globalWeather,
		}),
		zones: state.zones.map(zone => {
			const row = rows.find(item => item.id === zone.id);
			if (!row) return zone;
			return Object.assign({}, zone, {
				weather: row.weather,
				summary: row.summary,
				icon: row.icon,
				temperature: row.temperature,
				locked: row.locked,
				nextChangeAt: row.nextChangeAt,
				overrideUntil: row.overrideUntil,
				players: row.players,
			});
		}),
	};
	if (!timeLocked && patch.time) next.time = patch.time;
	useWeatherPanelStore.setState(next);
}

export function hideWeatherPanel() {
	useWeatherPanelStore.setState({ show: false });
}

export function setTab(tab: string) {
	useWeatherPanelStore.setState({ tab: tab });
}

export function selectZone(id: number) {
	useWeatherPanelStore.setState({ selectedId: id, tab: 'zones' });
}

export function selectZoneOnly(id: number) {
	useWeatherPanelStore.setState({ selectedId: id });
}

export function previewTime(partial: Partial<TimeSnap>) {
	const time = useWeatherPanelStore.getState().time;
	const next = Object.assign({}, time, partial, { stamp: Date.now() });
	if (partial.hour != null || partial.minute != null) next.realtime = false;
	useWeatherPanelStore.setState({ time: next });
}

export function skyFrom(time: TimeSnap, elapsedSec: number) {
	const speed = time.realtime ? 1 : time.frozen ? 0 : time.scale || 0;
	let total = time.hour * 3600 + time.minute * 60 + (time.second || 0) + elapsedSec * speed;
	total = ((total % 86400) + 86400) % 86400;
	return {
		hour: Math.floor(total / 3600),
		minute: Math.floor((total % 3600) / 60),
		second: Math.floor(total % 60),
	};
}

export function initWeatherPanelBridge() {
	Object.defineProperty(window, 'weatherPanel', {
		configurable: true,
		get: function () {
			return { hide: hideWeatherPanel };
		},
	});
}
