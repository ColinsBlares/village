import { create } from 'zustand';
import { menus } from './menus';
import { isEditing, valuesType } from './view';

declare function setCursor(enable: boolean): void;

declare const busy: {
	add(name: string, mouse?: boolean, client?: boolean): boolean;
	remove(name: string, client?: boolean): void;
	includes(name: any): boolean;
};

export interface SelectMenuState {
	show: boolean;
	menu: any;
	menus: any;
	maxItems: number;
	maxColorValues: number;
	notification: string | null;
	loader: boolean;
	revision: number;
	focusTick: number;
}

const NOTIF_TIME_DEFAULT = 10000;
const LOADER_TIME_DEFAULT = 10 * 1000;

export const useSelectMenuStore = create<SelectMenuState>(() => ({
	show: false,
	menu: null,
	menus: null,
	maxItems: 5,
	maxColorValues: 10,
	notification: null,
	loader: false,
	revision: 0,
	focusTick: 0,
}));

const proxyCache = new WeakMap<object, any>();
let currentMenuRaw: any = null;
let silent = 0;
let touchQueued = false;
let notifTimer: number | null = null;
let loaderTimer: number | null = null;
let focusTimer: number | null = null;
let bridgeReady = false;

function clamp(value: number, min: number, max: number): number {
	const fn = (Math as any).clamp;
	if (typeof fn === 'function') return fn(value, min, max);
	return Math.max(min, Math.min(max, value));
}

function bridge(): any {
	return (window as any).selectMenu;
}

function bumpRevision() {
	const revision = useSelectMenuStore.getState().revision + 1;
	useSelectMenuStore.setState({ revision: revision });
}

function touch() {
	if (silent || touchQueued) return;
	touchQueued = true;
	queueMicrotask(function () {
		touchQueued = false;
		bumpRevision();
	});
}

export function unwrap(value: any): any {
	if (value && value.__smRaw) return value.__smRaw;
	return value;
}

function asProxy(value: any): any {
	if (!value || typeof value !== 'object') return value;
	const raw = value.__smRaw ? value.__smRaw : value;
	const cached = proxyCache.get(raw);
	if (cached) return cached;
	const proxy = new Proxy(raw, {
		get(target, prop) {
			if (prop === '__smRaw') return target;
			const val = target[prop as any];
			if (typeof val === 'function') return val;
			return asProxy(val);
		},
		set(target, prop, val) {
			target[prop as any] = unwrap(val);
			if (!silent) {
				if (prop === 'i' && target === currentMenuRaw) {
					scheduleEditFocus(target.i);
				}
				touch();
			}
			return true;
		},
	});
	proxyCache.set(raw, proxy);
	return proxy;
}

function scheduleEditFocus(index: number) {
	if (focusTimer != null) window.clearTimeout(focusTimer);
	focusTimer = window.setTimeout(function () {
		focusTimer = null;
		const state = useSelectMenuStore.getState();
		if (!state.menu || !state.menu.items || !state.menu.items[index]) {
			if (typeof setCursor !== 'undefined') setCursor(false);
			return;
		}
		if (valuesType(state.menu, index) == 3) {
			if (typeof setCursor !== 'undefined') setCursor(true);
			useSelectMenuStore.setState({ focusTick: state.focusTick + 1 });
		} else if (typeof setCursor !== 'undefined') {
			setCursor(false);
		}
	}, 100);
}

function clearLoaderTimer() {
	if (loaderTimer != null) {
		window.clearTimeout(loaderTimer);
		loaderTimer = null;
	}
}

function applyLoader(val: boolean) {
	const enabled = !!val;
	const state = useSelectMenuStore.getState();
	if (state.loader === enabled) return;
	clearLoaderTimer();
	useSelectMenuStore.setState({
		loader: enabled,
		revision: state.revision + 1,
	});
	if (!enabled) return;
	const host = bridge();
	const maxTime = host && host.loaderMaxTime != null ? host.loaderMaxTime : LOADER_TIME_DEFAULT;
	loaderTimer = window.setTimeout(function () {
		applyLoader(false);
	}, maxTime);
}

function applyNotification(val: any) {
	const state = useSelectMenuStore.getState();
	if (state.notification === val) return;
	if (notifTimer != null) {
		window.clearTimeout(notifTimer);
		notifTimer = null;
	}
	const host = bridge();
	const showTime = host && host.showNotifTime != null ? host.showNotifTime : NOTIF_TIME_DEFAULT;
	notifTimer = window.setTimeout(function () {
		notifTimer = null;
		applyNotification(null);
	}, showTime);
	if (val && state.loader) applyLoader(false);
	useSelectMenuStore.setState({
		notification: val,
		revision: useSelectMenuStore.getState().revision + 1,
	});
}

function applyShow(val: boolean) {
	const show = !!val;
	const state = useSelectMenuStore.getState();
	if (state.show === show) return;
	if (typeof busy !== 'undefined') {
		if (show) busy.add('selectMenu', false, true);
		else busy.remove('selectMenu', true);
	}
	useSelectMenuStore.setState({
		show: show,
		revision: state.revision + 1,
	});
}

function normalizeMenu(raw: any) {
	silent++;
	if (raw.i == null) raw.i = 0;
	if (raw.j == null) raw.j = 0;
	if (raw.items && raw.items.forEach) {
		raw.items.forEach(function (item: any) {
			if (item.i == null) item.i = 0;
			if (item.j == null) item.j = 0;
			if (!item.values) item.values = [''];
		});
	}
	silent--;
}

function applyMenu(val: any) {
	const prev = useSelectMenuStore.getState().menu;
	const prevI = prev ? unwrap(prev).i : null;
	if (!val) {
		currentMenuRaw = null;
		if (useSelectMenuStore.getState().loader) applyLoader(false);
		useSelectMenuStore.setState({
			menu: null,
			revision: useSelectMenuStore.getState().revision + 1,
		});
		return;
	}
	const raw = unwrap(val);
	normalizeMenu(raw);
	currentMenuRaw = raw;
	if (useSelectMenuStore.getState().loader) applyLoader(false);
	useSelectMenuStore.setState({
		menu: asProxy(raw),
		revision: useSelectMenuStore.getState().revision + 1,
	});
	if (!prev || prevI !== raw.i) scheduleEditFocus(raw.i);
}

function play(name: string) {
	if (typeof mp === 'undefined') return;
	mp.trigger(name);
}

function onItemSelected() {
	applyNotification(null);
	const menu = useSelectMenuStore.getState().menu;
	menu.handler('onItemSelected');
	play('selectMenu.selectSound.play');
}

function onItemValueChanged() {
	const menu = useSelectMenuStore.getState().menu;
	menu.handler('onItemValueChanged');
	play('selectMenu.focusSound.play');
}

function onItemFocusChanged() {
	const menu = useSelectMenuStore.getState().menu;
	menu.handler('onItemFocusChanged');
	play('selectMenu.focusSound.play');
}

function onBackspacePressed() {
	const state = useSelectMenuStore.getState();
	if (isEditing(state.show, state.menu)) return;
	state.menu.handler('onBackspacePressed');
	play('selectMenu.backSound.play');
}

function onEscapePressed() {
	const menu = useSelectMenuStore.getState().menu;
	menu.handler('onEscapePressed');
	play('selectMenu.backSound.play');
}

function blockedByBusy(): boolean {
	if (typeof busy === 'undefined') return false;
	return busy.includes(['inventory', 'chat', 'terminal', 'phone']);
}

function onKeyDown(e: KeyboardEvent) {
	const state = useSelectMenuStore.getState();
	if (!state.menu) return;
	if (blockedByBusy()) return;
	if (!state.show || state.loader) return;
	const menu = state.menu;
	if (e.keyCode == 38) {
		if (menu.i == 0) return;
		menu.i = clamp(menu.i - 1, 0, menu.items.length - 1);
		if (menu.i < menu.j) menu.j--;
		onItemFocusChanged();
	} else if (e.keyCode == 40) {
		if (menu.i == menu.items.length - 1) return;
		menu.i = clamp(menu.i + 1, 0, menu.items.length - 1);
		if (menu.i - menu.j == state.maxItems) menu.j++;
		onItemFocusChanged();
	} else if (e.keyCode == 37) {
		const item = menu.items[menu.i];
		if (!item.values || item.i == 0) return;
		item.i = clamp(item.i - 1, 0, item.values.length - 1);
		if (item.i < item.j) item.j--;
		onItemValueChanged();
	} else if (e.keyCode == 39) {
		const item = menu.items[menu.i];
		if (!item.values || item.i == item.values.length - 1) return;
		item.i = clamp(item.i + 1, 0, item.values.length - 1);
		if (item.i - item.j == state.maxColorValues) item.j++;
		onItemValueChanged();
	} else if (e.keyCode == 13) {
		onItemSelected();
	}
}

function onKeyUp(e: KeyboardEvent) {
	const state = useSelectMenuStore.getState();
	if (!state.menu) return;
	if (blockedByBusy()) return;
	if (!state.show || state.loader) return;
	if (e.keyCode == 8) {
		onBackspacePressed();
	} else if (e.keyCode == 27) {
		onEscapePressed();
	}
}

export function getItemByName(name: string, items: any[]): any {
	for (let i = 0; i < items.length; i++) {
		if (items[i].text == name) return items[i];
	}
	return null;
}

function showByName(menuName: string) {
	const menusMap = useSelectMenuStore.getState().menus;
	if (!menusMap) return;
	const menu = menusMap[menuName];
	if (!menu) return;
	applyMenu(menu);
	applyShow(true);
}

function setItemValues(menuName: string, itemName: string, values: any) {
	let next = values;
	if (typeof next == 'string') next = JSON.parse(next);
	const menusMap = useSelectMenuStore.getState().menus;
	if (!menusMap) return;
	const menu = menusMap[menuName];
	if (!menu) return;
	const item = getItemByName(itemName, menu.items);
	if (!item) return;
	item.values = next;
	menu.i = 0;
	menu.j = 0;
}

function setItems(menuName: string, items: any) {
	let next = items;
	if (typeof next == 'string') next = JSON.parse(next);
	const menusMap = useSelectMenuStore.getState().menus;
	if (!menusMap) return;
	const menu = menusMap[menuName];
	if (!menu) return;
	next.forEach(function (item: any) {
		if (item.i == null) item.i = 0;
		if (item.j == null) item.j = 0;
		if (!item.values) item.values = [''];
	});
	menu.items = next;
	menu.i = 0;
	menu.j = 0;
}

function addItem(menuName: string, item: any, index: number) {
	const menusMap = useSelectMenuStore.getState().menus;
	if (!menusMap) return;
	const menu = menusMap[menuName];
	if (!menu) return;
	let next = item;
	if (typeof next == 'string') next = JSON.parse(next);
	if (getItemByName(next.text, menu.items)) return;
	if (next.i == null) next.i = 0;
	if (next.j == null) next.j = 0;
	if (!next.values) next.values = [''];
	menu.items.splice(index, 0, next);
	menu.i = 0;
	menu.j = 0;
}

function deleteItem(menuName: string, itemName: string) {
	const menusMap = useSelectMenuStore.getState().menus;
	if (!menusMap) return;
	const menu = menusMap[menuName];
	if (!menu) return;
	const items = menu.items;
	for (let i = 0; i < items.length; i++) {
		if (items[i].text == itemName) {
			items.splice(i, 1);
			i--;
		}
	}
}

function setProp(menuName: string, propName: string, propValue: any) {
	const menusMap = useSelectMenuStore.getState().menus;
	if (!menusMap) return;
	const menu = menusMap[menuName];
	if (!menu) return;
	let next = propValue;
	if (typeof next == 'string') next = JSON.parse(next);
	menu[propName] = next;
	if (menu.update) menu.update();
}

function bindField(target: any, key: keyof SelectMenuState, apply: (value: any) => void) {
	Object.defineProperty(target, key, {
		configurable: true,
		enumerable: true,
		get() {
			return useSelectMenuStore.getState()[key];
		},
		set(value: any) {
			apply(value);
		},
	});
}

export function initSelectMenuLegacyBridge() {
	if (bridgeReady || typeof window === 'undefined') return;
	bridgeReady = true;

	const win = window as any;
	if (!win.selectMenu) win.selectMenu = { show: false };
	const target = win.selectMenu;
	win.selectMenu = target;

	const proxiedMenus = asProxy(menus);
	useSelectMenuStore.setState({ menus: proxiedMenus });
	Object.defineProperty(target, 'menus', {
		configurable: true,
		enumerable: true,
		get() {
			return useSelectMenuStore.getState().menus;
		},
		set(value: any) {
			const proxied = asProxy(unwrap(value));
			useSelectMenuStore.setState({
				menus: proxied,
				revision: useSelectMenuStore.getState().revision + 1,
			});
		},
	});
	target.showNotifTime = NOTIF_TIME_DEFAULT;
	target.loaderMaxTime = LOADER_TIME_DEFAULT;
	target.showByName = showByName;
	target.setItemValues = setItemValues;
	target.setItems = setItems;
	target.getItemByName = getItemByName;
	target.addItem = addItem;
	target.deleteItem = deleteItem;
	target.setProp = setProp;

	bindField(target, 'show', applyShow);
	bindField(target, 'menu', applyMenu);
	bindField(target, 'loader', function (value: any) {
		applyLoader(!!value);
	});
	bindField(target, 'notification', applyNotification);
	bindField(target, 'maxItems', function (value: any) {
		useSelectMenuStore.setState({
			maxItems: Number(value) || 5,
			revision: useSelectMenuStore.getState().revision + 1,
		});
	});
	bindField(target, 'maxColorValues', function (value: any) {
		useSelectMenuStore.setState({
			maxColorValues: Number(value) || 10,
			revision: useSelectMenuStore.getState().revision + 1,
		});
	});

	window.addEventListener('keydown', onKeyDown);
	window.addEventListener('keyup', onKeyUp);
}
