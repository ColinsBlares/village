import { create } from 'zustand';
import { useVisibilityStore } from '@utils/visibility/store';

export interface HudKeyItem {
	key: string;
	name: string;
}

export interface HudLocalPos {
	x: number;
	y: number;
}

export interface HudState {
	players: number;
	maxPlayers: number;
	build: number;
	branch: string;
	wanted: number;
	cash: number;
	bank: number;
	time: string;
	date: string;
	region: string;
	street: string;
	temperature: number;
	city: string;
	weather: string;
	mute: boolean;
	voice: boolean;
	showOnline: boolean;
	leftWeather: number;
	summary: string;
	keysShow: boolean;
	satiety: number;
	thirst: number;
	playerId: number;
	cold: boolean;
	heat: boolean;
	arrestTime: number;
	arrestTimeMax: number;
	keys: HudKeyItem[];
	localPos: HudLocalPos;
	factionId: number;
	selectMenuShow: boolean;
	promptText: string | null;
}

export function convertToMoscowDate(date: Date): Date {
	const offsetMs = date.getTimezoneOffset() * 60 * 1000;
	const moscowOffsetMs = 3 * 60 * 60 * 1000;
	return new Date(date.getTime() + offsetMs + moscowOffsetMs);
}

export function getMoscowTimeString(): string {
	return convertToMoscowDate(new Date())
		.toTimeString()
		.replace(/(\d{2}:\d{2}).*/, '$1');
}

export function getMoscowDateString(): string {
	const date = convertToMoscowDate(new Date());
	const day = date.getDate();
	const month = date.getMonth() + 1;
	const year = date.getUTCFullYear();
	const dayStr = day < 10 ? '0' + day : String(day);
	const monthStr = month < 10 ? '0' + month : String(month);
	return `${dayStr}.${monthStr}.${year}`;
}

export function prettyMoney(val: number | string): string {
	return String(val).replace(/(\d)(?=(\d{3})+(\D|$))/g, '$1 ');
}

const DEFAULT_KEYS: HudKeyItem[] = [
	{ key: 'I', name: 'Инвентарь' },
	{ key: 'T', name: 'Чат' },
	{ key: 'P', name: 'Планшет' },
	{ key: "<i class='fas fa-arrow-up'></i>", name: 'Телефон' },
	{ key: 'N', name: 'Войс-чат' },
	{ key: 'L', name: 'Действия' },
	{ key: 'M', name: 'Меню' },
	{ key: 'F3', name: 'Обновления' },
];

export const useHudStore = create<HudState>(() => ({
	players: 0,
	maxPlayers: 1500,
	build: 0,
	branch: '',
	wanted: 0,
	cash: 100000,
	bank: 100000,
	time: getMoscowTimeString(),
	date: getMoscowDateString(),
	region: 'Палето-Бэй',
	street: 'Санни Стрит',
	temperature: 17,
	city: 'San Andreas',
	weather: 'clear-day',
	mute: false,
	voice: false,
	showOnline: true,
	leftWeather: 300,
	summary: 'Облачно',
	keysShow: true,
	satiety: 0,
	thirst: 0,
	playerId: -1,
	cold: false,
	heat: false,
	arrestTime: 0,
	arrestTimeMax: 0,
	keys: DEFAULT_KEYS,
	localPos: { x: 0, y: 0 },
	factionId: 0,
	selectMenuShow: false,
	promptText: null,
}));

let coldTimer: number | null = null;
let heatTimer: number | null = null;
let arrestTimer: number | null = null;

export function showHud(flag: boolean) {
	useVisibilityStore.setState({ hud: !!flag });
}

export function setHudData(data: Record<string, any>) {
	if (!data || typeof data !== 'object') {
		return;
	}

	const current = useHudStore.getState();
	const partial: Partial<HudState> = {};
	let nextLocalPos: HudLocalPos | null = null;

	Object.keys(data).forEach(key => {
		const val = data[key];

		if (key === 'show') {
			showHud(!!val);
			return;
		}

		if (key === 'localPos.x') {
			nextLocalPos = {
				...(nextLocalPos || current.localPos),
				x: Number(val) || 0,
			};
			return;
		}

		if (key === 'localPos.y') {
			nextLocalPos = {
				...(nextLocalPos || current.localPos),
				y: Number(val) || 0,
			};
			return;
		}

		if (key === 'cold') {
			partial.cold = !!val;
			if (val) {
				if (coldTimer !== null) {
					window.clearTimeout(coldTimer);
				}
				coldTimer = window.setTimeout(() => {
					useHudStore.setState({ cold: false });
				}, 10000);
			}
			return;
		}

		if (key === 'heat') {
			partial.heat = !!val;
			if (val) {
				if (heatTimer !== null) {
					window.clearTimeout(heatTimer);
				}
				heatTimer = window.setTimeout(() => {
					useHudStore.setState({ heat: false });
				}, 10000);
			}
			return;
		}

		if (key === 'arrestTimeMax') {
			const maxVal = Number(val) || 0;
			partial.arrestTimeMax = maxVal;
			partial.arrestTime = maxVal;
			if (arrestTimer !== null) {
				window.clearInterval(arrestTimer);
				arrestTimer = null;
			}
			if (maxVal > 0) {
				arrestTimer = window.setInterval(() => {
					const nextTime = useHudStore.getState().arrestTime - 1;
					if (nextTime <= 0) {
						useHudStore.setState({ arrestTime: 0 });
						if (arrestTimer !== null) {
							window.clearInterval(arrestTimer);
							arrestTimer = null;
						}
					} else {
						useHudStore.setState({ arrestTime: nextTime });
					}
				}, 1000);
			}
			return;
		}

		(partial as any)[key] = val;
	});

	if (nextLocalPos) {
		partial.localPos = nextLocalPos;
	}

	if (Object.keys(partial).length > 0) {
		useHudStore.setState(partial);
	}
}

export function syncLegacyHudState() {
	const win = window as any;
	const selectMenuShow = !!(win.selectMenu && win.selectMenu.show);
	const promptText =
		win.prompt && win.prompt.text ? String(win.prompt.text) : null;
	const factionId =
		win.playerMenu && typeof win.playerMenu.factionId === 'number'
			? win.playerMenu.factionId
			: useHudStore.getState().factionId;

	const state = useHudStore.getState();
	const nextTime = getMoscowTimeString();
	const nextDate = nextTime === '00:00' ? getMoscowDateString() : state.date;

	if (
		state.time !== nextTime ||
		state.date !== nextDate ||
		state.selectMenuShow !== selectMenuShow ||
		state.promptText !== promptText ||
		state.factionId !== factionId
	) {
		useHudStore.setState({
			time: nextTime,
			date: nextDate,
			selectMenuShow,
			promptText,
			factionId,
		});
	}
}

export function initHudLegacyBridge() {
	if (typeof window === 'undefined') {
		return;
	}

	const win = window as any;
	const target = win.hud || {};

	const localPosProxy = {
		get x() {
			return useHudStore.getState().localPos.x;
		},
		set x(val: number) {
			setHudData({ 'localPos.x': val });
		},
		get y() {
			return useHudStore.getState().localPos.y;
		},
		set y(val: number) {
			setHudData({ 'localPos.y': val });
		},
	};

	Object.defineProperty(target, 'show', {
		configurable: true,
		enumerable: true,
		get() {
			return useVisibilityStore.getState().hud;
		},
		set(val: boolean) {
			showHud(!!val);
		},
	});

	Object.defineProperty(target, 'localPos', {
		configurable: true,
		enumerable: true,
		get() {
			return localPosProxy;
		},
		set(val: HudLocalPos) {
			if (val && typeof val === 'object') {
				setHudData({ 'localPos.x': val.x, 'localPos.y': val.y });
			}
		},
	});

	const stateKeys: Array<keyof HudState> = [
		'players',
		'maxPlayers',
		'build',
		'branch',
		'wanted',
		'cash',
		'bank',
		'time',
		'date',
		'region',
		'street',
		'temperature',
		'city',
		'weather',
		'mute',
		'voice',
		'showOnline',
		'leftWeather',
		'keysShow',
		'satiety',
		'thirst',
		'playerId',
		'cold',
		'heat',
		'arrestTime',
		'arrestTimeMax',
		'factionId',
	];

	stateKeys.forEach(key => {
		Object.defineProperty(target, key, {
			configurable: true,
			enumerable: true,
			get() {
				return useHudStore.getState()[key];
			},
			set(val: any) {
				setHudData({ [key]: val });
			},
		});
	});

	win.hud = target;
}
