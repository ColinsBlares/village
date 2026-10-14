import { create } from 'zustand';
import { CraftColumn, Crafter, canCraftItem, clampCount, currentTypeOf, materialCount } from './logic';

interface CraftState {
	show: boolean;
	helpShow: boolean;
	paramsShow: boolean;
	crafter: Crafter | null;
	skill: number;
	firewoodCount: number;
	viewTick: number;
	queueTick: number;
	destroyTick: number;
	inventoryTick: number;
}

export const FIREWOOD_ITEM_ID = 131;

export const useCraftStore = create<CraftState>(() => ({
	show: false,
	helpShow: false,
	paramsShow: false,
	crafter: null,
	skill: 0,
	firewoodCount: 0,
	viewTick: 0,
	queueTick: 0,
	destroyTick: 0,
	inventoryTick: 0,
}));

let synced = false;
let queueTimer: number | null = null;
let destroyTimer: number | null = null;
let queueList: CraftColumn[] = [];

function bumpView() {
	useCraftStore.setState(function (state) {
		return { viewTick: state.viewTick + 1 };
	});
}

function bumpQueue() {
	useCraftStore.setState(function (state) {
		return { queueTick: state.queueTick + 1 };
	});
}

function bumpDestroy() {
	useCraftStore.setState(function (state) {
		return { destroyTick: state.destroyTick + 1 };
	});
}

function clearQueueTimer() {
	if (queueTimer !== null) {
		window.clearInterval(queueTimer);
		queueTimer = null;
	}
}

function clearDestroyTimer() {
	if (destroyTimer !== null) {
		window.clearInterval(destroyTimer);
		destroyTimer = null;
	}
}

function applyShow(show: boolean) {
	mp.trigger('blur', show, 300);
	const hud = (window as any).hud;
	if (hud) hud.keysShow = !show;
	const busy = (window as any).busy;
	const prompt = (window as any).prompt;
	if (show) {
		if (busy && busy.add) busy.add('craft', true, true);
		if (prompt && prompt.showByName) prompt.showByName('craft_exit');
	} else {
		if (busy && busy.remove) busy.remove('craft', true);
		if (prompt && prompt.hide) prompt.hide();
	}
}

export function setCraftShow(val: boolean) {
	const show = !!val;
	const prev = useCraftStore.getState().show;
	if (prev === show) return;
	useCraftStore.setState({ show: show });
	applyShow(show);
}

function callRemote(eventName: string, data?: any) {
	let payload = data;
	if (typeof payload == 'object') payload = JSON.stringify(payload);
	mp.trigger('callRemote', eventName, payload);
}

function startQueueTick(processList: CraftColumn[]) {
	clearQueueTimer();
	queueList = processList;
	if (!processList.length) return;
	queueTimer = window.setInterval(function () {
		for (let i = 0; i < queueList.length; i++) {
			const col = queueList[i];
			if ((col.time || 0) <= 0) {
				callRemote('craft.queue.update');
				queueList.splice(i, 1);
				i--;
				continue;
			}
			col.time = (col.time || 0) - 1;
		}
		bumpQueue();
		if (!queueList.length) clearQueueTimer();
	}, 1000);
}

function startDestroyTick() {
	clearDestroyTimer();
	destroyTimer = window.setInterval(function () {
		const crafter = useCraftStore.getState().crafter;
		if (!crafter || crafter.destroyTime == null) {
			clearDestroyTimer();
			return;
		}
		crafter.destroyTime = crafter.destroyTime - 1;
		bumpDestroy();
		if (crafter.destroyTime <= 0) clearCrafter();
	}, 1000);
}

export function initCrafter(crafter: any) {
	let data = crafter;
	if (typeof data == 'string') data = JSON.parse(data);
	data.typeI = 0;
	if (data.types) {
		data.types.forEach(function (type: any) {
			type.itemI = -1;
		});
	}
	const processList = (data.queue && data.queue.columns ? data.queue.columns : []).filter(function (col: CraftColumn) {
		return col.time;
	});
	useCraftStore.setState(function (state) {
		return {
			crafter: data,
			firewoodCount: 0,
			viewTick: state.viewTick + 1,
			queueTick: state.queueTick + 1,
			destroyTick: state.destroyTick + 1,
		};
	});
	if (processList.length) startQueueTick(processList);
	if (data.destroyTime) startDestroyTick();
}

export function clearCrafter() {
	clearQueueTimer();
	clearDestroyTimer();
	queueList = [];
	useCraftStore.setState(function (state) {
		return { crafter: null, viewTick: state.viewTick + 1 };
	});
	setCraftShow(false);
}

export function addItemToQueue(index: number, item: any) {
	let data = item;
	if (typeof data == 'string') data = JSON.parse(data);
	const crafter = useCraftStore.getState().crafter;
	if (!crafter || !crafter.queue) return;
	crafter.queue.columns[index] = data;
	const processList = crafter.queue.columns.filter(function (col) {
		return col.time;
	});
	bumpQueue();
	if (processList.length) startQueueTick(processList);
}

export function setCraftSkill(exp: number) {
	useCraftStore.setState(function (state) {
		return { skill: exp, viewTick: state.viewTick + 1 };
	});
}

export function setDestroyTime(time: number) {
	const crafter = useCraftStore.getState().crafter;
	if (!crafter) return;
	crafter.destroyTime = time;
	bumpDestroy();
}

export function setCraftType(index: number) {
	const crafter = useCraftStore.getState().crafter;
	if (!crafter) return;
	crafter.typeI = index;
	bumpView();
}

export function onClickCraftItem(itemI: number) {
	const type = currentTypeOf(useCraftStore.getState().crafter);
	if (!type) return;
	type.itemI = type.itemI == itemI ? -1 : itemI;
	bumpView();
}

export function toggleHelp() {
	useCraftStore.setState(function (state) {
		return { helpShow: !state.helpShow };
	});
}

export function toggleParams() {
	useCraftStore.setState(function (state) {
		return { paramsShow: !state.paramsShow };
	});
}

export function onClickCraft() {
	const state = useCraftStore.getState();
	const type = currentTypeOf(state.crafter);
	if (!state.crafter || !type) return;
	const item = type.itemI < 0 ? null : type.items[type.itemI];
	if (!item) return;
	if (!canCraftItem(item, state.skill)) return;
	callRemote('craft.item.craft', {
		typeI: state.crafter.typeI,
		itemI: type.itemI,
	});
	type.itemI = -1;
	bumpView();
}

export function onClickColumn(index: number) {
	const crafter = useCraftStore.getState().crafter;
	if (!crafter) return;
	const col = crafter.queue.columns[index];
	const name = (window as any).playerMenu && (window as any).playerMenu.name;
	if (!col.itemId || col.state == 'process' || col.playerName != name) return;
	callRemote('craft.queue.take', index);
}

export function changeFirewood(delta: number) {
	const max = materialCount(FIREWOOD_ITEM_ID);
	const next = clampCount(useCraftStore.getState().firewoodCount + delta, 0, max);
	useCraftStore.setState({ firewoodCount: next });
}

export function acceptFirewood() {
	const count = useCraftStore.getState().firewoodCount;
	const notifications = (window as any).notifications;
	if (!count) {
		if (notifications && notifications.error) notifications.error('Укажите количество');
		return;
	}
	if (count > materialCount(FIREWOOD_ITEM_ID)) {
		if (notifications && notifications.error) notifications.error('Недостаточно дерева');
		return;
	}
	callRemote('craft.bonfire.addFirewood', count);
	useCraftStore.setState({ firewoodCount: 0 });
}

function crafterProxy(crafter: Crafter) {
	return new Proxy(crafter, {
		set: function (target, prop, value) {
			(target as any)[prop] = value;
			if (prop === 'destroyTime') bumpDestroy();
			else bumpView();
			return true;
		},
	});
}

export function initCraftLegacyBridge() {
	if (typeof window === 'undefined' || synced) return;
	synced = true;

	const win = window as any;
	const target = win.craft || {};

	Object.defineProperty(target, 'show', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useCraftStore.getState().show;
		},
		set: function (val: boolean) {
			setCraftShow(!!val);
		},
	});

	Object.defineProperty(target, 'skill', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useCraftStore.getState().skill;
		},
		set: function (val: number) {
			setCraftSkill(val);
		},
	});

	Object.defineProperty(target, 'crafter', {
		configurable: true,
		enumerable: true,
		get: function () {
			const crafter = useCraftStore.getState().crafter;
			if (!crafter) return crafter;
			return crafterProxy(crafter);
		},
		set: function (val: Crafter | null) {
			useCraftStore.setState({ crafter: val });
			bumpView();
		},
	});

	target.initCrafter = initCrafter;
	target.clearCrafter = clearCrafter;
	target.addItemToQueue = addItemToQueue;
	win.craft = target;

	window.addEventListener('keyup', function (e) {
		if (e.keyCode == 27 && useCraftStore.getState().show) {
			setCraftShow(!useCraftStore.getState().show);
		}
	});
}
