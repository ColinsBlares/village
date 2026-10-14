import { create } from 'zustand';

export interface KillPlayer {
	name: string;
	factionId: number;
}

export interface KillEntry {
	target: KillPlayer;
	killer?: KillPlayer;
	reason?: string;
}

const KILL_COLORS: Record<number, string> = {
	1: '#e13b3b',
	2: '#00b500',
	8: '#00b500',
	9: '#da30ff',
	10: '#fff629',
	11: '#4a97d1',
	12: '#a7ff50',
	13: '#cbae8c',
	14: '#0b0b0b',
};

const KILL_TYPES = ['car', 'hand'];
const MAX_COUNT = 5;

interface KillListState {
	list: KillEntry[];
	selectMenuShow: boolean;
}

export const useKillListStore = create<KillListState>(() => ({
	list: [],
	selectMenuShow: false,
}));

let synced = false;

export function playerColor(player: KillPlayer) {
	return KILL_COLORS[player.factionId] || '#fff';
}

export function isWeaponReason(reason: string) {
	return KILL_TYPES.indexOf(reason) === -1;
}

function parsePlayer(value: any) {
	if (typeof value == 'string') return JSON.parse(value);
	return value;
}

export function addKill(target: any, killer?: any, reason?: string) {
	const entry: KillEntry = {
		target: parsePlayer(target),
		killer: killer == null ? undefined : parsePlayer(killer),
		reason: reason,
	};
	const list = useKillListStore.getState().list.concat([entry]);
	if (list.length > MAX_COUNT) list.shift();
	useKillListStore.setState({ list: list });
}

export function setKillList(list: KillEntry[]) {
	useKillListStore.setState({ list: Array.isArray(list) ? list : [] });
}

function syncSelectMenu() {
	const selectMenu = (window as any).selectMenu;
	const selectMenuShow = !!(selectMenu && selectMenu.show);
	if (useKillListStore.getState().selectMenuShow !== selectMenuShow) {
		useKillListStore.setState({ selectMenuShow: selectMenuShow });
	}
}

export function initKillListLegacyBridge() {
	if (typeof window === 'undefined' || synced) return;
	synced = true;

	const win = window as any;
	const target = win.killList || {};

	Object.defineProperty(target, 'list', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useKillListStore.getState().list;
		},
		set: function (val: KillEntry[]) {
			setKillList(val);
		},
	});

	target.add = addKill;
	target.playerColor = playerColor;
	target.isWeapon = isWeaponReason;
	win.killList = target;

	syncSelectMenu();
	window.setInterval(syncSelectMenu, 300);
}
