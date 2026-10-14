import { create } from 'zustand';
import { ChangelistEntry, changelistData } from './data';

export interface ChangelistState {
	show: boolean;
	enable: boolean;
	maxLength: number;
	list: ChangelistEntry[];
	i: number;
}

export const EMPTY_LINES: string[] = [];

export const useChangelistStore = create<ChangelistState>(() => ({
	show: false,
	enable: false,
	maxLength: 90,
	list: changelistData,
	i: changelistData.length - 1,
}));

export function prettyText(text: string, maxLength: number) {
	if (text.length > maxLength) {
		return text.substring(0, maxLength) + '...';
	}

	return text;
}

export function setShow(flag: boolean) {
	const next = !!flag;
	const prev = useChangelistStore.getState().show;

	if (prev === next) {
		return;
	}

	useChangelistStore.setState({ show: next });

	const busy = (window as any).busy;
	if (!busy) {
		return;
	}

	if (next) {
		busy.add('changelist', true, true);
	} else {
		busy.remove('changelist', true);
	}
}

export function setEnable(flag: boolean) {
	useChangelistStore.setState({ enable: !!flag });
}

export function setIndex(index: number) {
	const next = Number(index);
	if (next !== next) {
		return;
	}

	useChangelistStore.setState({ i: next });
}

export function shiftIndex(delta: number) {
	setIndex(useChangelistStore.getState().i + delta);
}

function replaceEntry(index: number, patch: Partial<ChangelistEntry>) {
	const state = useChangelistStore.getState();
	const entry = state.list[index];
	if (!entry) {
		return;
	}

	const nextList = state.list.slice();
	nextList[index] = {
		build: entry.build,
		date: entry.date,
		features: entry.features,
		fixed: entry.fixed,
		improvements: entry.improvements,
		removed: entry.removed,
		likes: entry.likes,
		liked: entry.liked,
	};

	const keys = Object.keys(patch);
	for (let n = 0; n < keys.length; n++) {
		const key = keys[n] as keyof ChangelistEntry;
		(nextList[index] as any)[key] = patch[key];
	}

	useChangelistStore.setState({ list: nextList });
}

export function initLikes(data: any) {
	let source = data;
	if (typeof source === 'string') {
		source = JSON.parse(source);
	}

	if (!source || typeof source !== 'object') {
		return;
	}

	const state = useChangelistStore.getState();
	const nextList = state.list.slice();
	let changed = false;

	for (const id in source) {
		const index = Number(id) - 1;
		const entry = nextList[index];
		if (!entry || !source[id]) {
			continue;
		}

		nextList[index] = {
			build: entry.build,
			date: entry.date,
			features: entry.features,
			fixed: entry.fixed,
			improvements: entry.improvements,
			removed: entry.removed,
			likes: source[id].likes,
			liked: source[id].liked,
		};
		changed = true;
	}

	if (changed) {
		useChangelistStore.setState({ list: nextList });
	}
}

export function setLikes(id: number, likes: number) {
	replaceEntry(Number(id) - 1, { likes: likes });
}

export function likeCurrent() {
	const state = useChangelistStore.getState();
	const index = state.i;
	const entry = state.list[index];
	if (!entry) {
		return;
	}

	const notifications = (window as any).notifications;
	if (entry.liked) {
		notifications.push('error', 'Вы уже оценили');
		return;
	}

	if (!state.enable) {
		notifications.push('error', 'Вы не авторизованы');
		return;
	}

	mp.trigger('callRemote', 'changelist.like', index + 1);
	replaceEntry(index, {
		likes: entry.likes + 1,
		liked: true,
	});
}

function readPlain(target: any, key: string) {
	const descriptor = Object.getOwnPropertyDescriptor(target, key);
	if (!descriptor || descriptor.get) {
		return null;
	}

	return descriptor.value;
}

let bridgeReady = false;

export function initChangelistLegacyBridge() {
	if (typeof window === 'undefined') {
		return;
	}

	const win = window as any;
	const target = win.changelist || {};

	if (!bridgeReady) {
		const enableValue = readPlain(target, 'enable');
		if (enableValue != null) {
			setEnable(!!enableValue);
		}

		const indexValue = readPlain(target, 'i');
		if (indexValue != null) {
			setIndex(Number(indexValue));
		}

		const showValue = readPlain(target, 'show');
		if (showValue != null) {
			setShow(!!showValue);
		}
	}

	Object.defineProperty(target, 'show', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useChangelistStore.getState().show;
		},
		set: function (val: boolean) {
			setShow(!!val);
		},
	});

	Object.defineProperty(target, 'enable', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useChangelistStore.getState().enable;
		},
		set: function (val: boolean) {
			setEnable(!!val);
		},
	});

	Object.defineProperty(target, 'i', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useChangelistStore.getState().i;
		},
		set: function (val: number) {
			setIndex(val);
		},
	});

	Object.defineProperty(target, 'list', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useChangelistStore.getState().list;
		},
		set: function (val: ChangelistEntry[]) {
			if (!val || typeof val.slice !== 'function') {
				return;
			}

			useChangelistStore.setState({ list: val });
		},
	});

	target.initLikes = initLikes;
	target.setLikes = setLikes;

	win.changelist = target;

	if (bridgeReady) {
		return;
	}

	bridgeReady = true;

	window.addEventListener('keyup', function (event) {
		const busy = win.busy;
		if (
			busy &&
			busy.includes([
				'chat',
				'terminal',
				'interaction',
				'mapCase',
				'phone',
				'playerMenu',
				'inventory',
			])
		) {
			return;
		}

		if (event.keyCode === 114 && useChangelistStore.getState().enable) {
			setShow(!useChangelistStore.getState().show);
		}
	});
}
