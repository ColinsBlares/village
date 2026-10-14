import { create } from 'zustand';
import { InteractionMenuDef, InteractionMenuItem, createMenus } from './menus';

interface InteractionMenuState {
	show: boolean;
	enable: boolean;
	left: number;
	menu: InteractionMenuDef | null;
	menus: Record<string, InteractionMenuDef>;
	faction: number | null;
	family: number | null;
	familyCanInvite: boolean;
	hasHeadBag: boolean;
	revision: number;
}

export const useInteractionMenuStore = create<InteractionMenuState>(() => ({
	show: false,
	enable: true,
	left: 80,
	menu: null,
	menus: createMenus(),
	faction: null,
	family: null,
	familyCanInvite: false,
	hasHeadBag: false,
	revision: 0,
}));

let synced = false;

function bump() {
	useInteractionMenuStore.setState(function (state) {
		return { revision: state.revision + 1 };
	});
}

function busyAdd() {
	const busy = (window as any).busy;
	if (busy && busy.add) busy.add('interaction', true, true);
}

function busyRemove() {
	const busy = (window as any).busy;
	if (busy && busy.remove) busy.remove('interaction', true);
}

export function setInteractionShow(val: boolean) {
	const show = !!val;
	const prev = useInteractionMenuStore.getState().show;
	if (prev === show) return;
	useInteractionMenuStore.setState({ show: show });
	if (show) busyAdd();
	else busyRemove();
}

export function setInteractionEnable(val: boolean) {
	const enable = !!val;
	useInteractionMenuStore.setState({ enable: enable });
	if (!enable) setInteractionShow(false);
}

export function setInteractionLeft(left: number) {
	useInteractionMenuStore.setState({ left: left });
}

export function setInteractionMenu(menu: InteractionMenuDef | null) {
	useInteractionMenuStore.setState({ menu: menu });
	bump();
}

export function deleteItem(menuName: string, itemText: string) {
	const menu = useInteractionMenuStore.getState().menus[menuName];
	if (!menu) return;
	for (let i = 0; i < menu.items.length; i++) {
		if (menu.items[i].text == itemText) {
			menu.items.splice(i, 1);
			i--;
		}
	}
	bump();
}

export function addItems(menuName: string, items: any) {
	let list = items;
	if (typeof list == 'string') list = JSON.parse(list);
	if (!Array.isArray(list)) list = [list];
	const menu = useInteractionMenuStore.getState().menus[menuName];
	if (!menu) return;
	list.forEach(function (item: InteractionMenuItem) {
		deleteItem(menuName, item.text);
		menu.items.push(item);
	});
	bump();
}

export function onClickItem(index: number) {
	const menu = useInteractionMenuStore.getState().menu;
	if (!menu || !menu.handler) return;
	menu.handler.call(menu, index);
}

function applyFaction(val: number | null) {
	if (!val) {
		deleteItem('player_interaction', 'Организация');
		deleteItem('player_interaction', 'Government');
		deleteItem('player_interaction', 'Police');
		deleteItem('player_interaction', 'FIB');
		deleteItem('player_interaction', 'Hospital');
		deleteItem('player_interaction', 'Army');
		deleteItem('player_interaction', 'Weazel News');
		deleteItem('player_interaction', 'Band');
		deleteItem('player_interaction', 'Mafia');
		deleteItem('player_ownmenu', 'Организация');
		deleteItem('player_ownmenu', 'Учения');
		deleteItem('player_ownmenu', 'Захват');
		deleteItem('player_ownmenu', 'Захват биз.');
		deleteItem('player_ownmenu', 'Эфир');
		deleteItem('vehicle', 'FIB');
		deleteItem('vehicle', 'Ограбить');
		return;
	}

	addItems('player_interaction', { text: 'Организация', icon: 'faction.svg' });
	addItems('player_ownmenu', { text: 'Организация', icon: 'faction.svg' });

	if (val == 1) addItems('player_interaction', { text: 'Government', icon: 'government.svg' });
	else deleteItem('player_interaction', 'Government');

	if (val == 2 || val == 3) addItems('player_interaction', { text: 'Police', icon: 'police.svg' });
	else deleteItem('player_interaction', 'Police');

	if (val == 4) {
		addItems('player_interaction', { text: 'FIB', icon: 'fib.svg' });
		addItems('vehicle', { text: 'FIB', icon: 'fib.svg' });
	} else {
		deleteItem('player_interaction', 'FIB');
		deleteItem('vehicle', 'FIB');
	}

	if (val == 5) addItems('player_interaction', { text: 'Hospital', icon: 'hospital.svg' });
	else deleteItem('player_interaction', 'Hospital');

	if (val == 6) {
		addItems('player_interaction', { text: 'Army', icon: 'army.svg' });
		addItems('player_ownmenu', { text: 'Учения', icon: 'war.svg' });
	} else {
		deleteItem('player_interaction', 'Army');
		deleteItem('player_ownmenu', 'Учения');
	}

	if (val == 7) {
		addItems('player_interaction', { text: 'Weazel News', icon: 'news.svg' });
		addItems('player_ownmenu', { text: 'Эфир', icon: 'stream.svg' });
	} else {
		deleteItem('player_interaction', 'Weazel News');
		deleteItem('player_ownmenu', 'Эфир');
	}

	if (val >= 8 && val <= 11) {
		addItems('player_interaction', { text: 'Band', icon: 'band.svg' });
		addItems('player_ownmenu', { text: 'Захват', icon: 'war.svg' });
		addItems('vehicle', { text: 'Ограбить', icon: 'rob.svg' });
	} else {
		deleteItem('player_interaction', 'Band');
		deleteItem('player_ownmenu', 'Захват');
		deleteItem('vehicle', 'Ограбить');
	}

	if (val >= 12 && val <= 14) {
		addItems('player_interaction', { text: 'Mafia', icon: 'mafia.svg' });
		addItems('player_ownmenu', { text: 'Захват биз.', icon: 'war.svg' });
	} else {
		deleteItem('player_interaction', 'Mafia');
		deleteItem('player_ownmenu', 'Захват биз.');
	}
}

function applyFamily(val: number | null) {
	deleteItem('player_ownmenu', 'Семья');
	deleteItem('player_interaction', 'Пригласить в семью');
	if (!val) return;
	addItems('player_ownmenu', { text: 'Семья', icon: 'faction.svg' });
	if (useInteractionMenuStore.getState().familyCanInvite) {
		addItems('player_interaction', { text: 'Пригласить в семью', icon: 'faction.svg' });
	}
}

function applyFamilyInvite(val: boolean) {
	deleteItem('player_interaction', 'Пригласить в семью');
	if (val && useInteractionMenuStore.getState().family) {
		addItems('player_interaction', { text: 'Пригласить в семью', icon: 'faction.svg' });
	}
}

function applyHeadBag(val: boolean) {
	if (val) {
		const item = { text: 'Снять мешок', icon: 'hide.svg' };
		addItems('police', item);
		addItems('fib', item);
	} else {
		deleteItem('police', 'Снять мешок');
		deleteItem('fib', 'Снять мешок');
	}
}

function wrapItems(items: InteractionMenuItem[]) {
	return new Proxy(items, {
		get: function (target, prop) {
			if (prop === 'push' || prop === 'splice' || prop === 'pop' || prop === 'shift' || prop === 'unshift') {
				return function () {
					const fn = (Array.prototype as any)[prop as string];
					const result = fn.apply(target, arguments);
					bump();
					return result;
				};
			}
			return (target as any)[prop];
		},
		set: function (target, prop, value) {
			(target as any)[prop] = value;
			if (prop !== 'length') bump();
			return true;
		},
	});
}

function wrapMenu(menu: InteractionMenuDef) {
	return new Proxy(menu, {
		get: function (target, prop) {
			if (prop === 'items') return wrapItems(target.items);
			return (target as any)[prop];
		},
		set: function (target, prop, value) {
			(target as any)[prop] = value;
			bump();
			return true;
		},
	});
}

function showByNameSafe(name: string) {
	const wasShown = useInteractionMenuStore.getState().show;
	const menu = useInteractionMenuStore.getState().menus[name];
	if (!menu) return;
	useInteractionMenuStore.setState({ menu: menu, show: true });
	bump();
	if (!wasShown) busyAdd();
}

export function initInteractionMenuLegacyBridge() {
	if (typeof window === 'undefined' || synced) return;
	synced = true;

	const win = window as any;
	const target = win.interactionMenu || {};

	Object.defineProperty(target, 'show', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useInteractionMenuStore.getState().show;
		},
		set: function (val: boolean) {
			setInteractionShow(!!val);
		},
	});

	Object.defineProperty(target, 'enable', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useInteractionMenuStore.getState().enable;
		},
		set: function (val: boolean) {
			setInteractionEnable(!!val);
		},
	});

	Object.defineProperty(target, 'left', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useInteractionMenuStore.getState().left;
		},
		set: function (val: number) {
			setInteractionLeft(val);
		},
	});

	Object.defineProperty(target, 'menu', {
		configurable: true,
		enumerable: true,
		get: function () {
			const menu = useInteractionMenuStore.getState().menu;
			if (!menu) return menu;
			return wrapMenu(menu);
		},
		set: function (val: InteractionMenuDef | null) {
			setInteractionMenu(val);
		},
	});

	Object.defineProperty(target, 'menus', {
		configurable: true,
		enumerable: true,
		get: function () {
			const menus = useInteractionMenuStore.getState().menus;
			return new Proxy(menus, {
				get: function (obj, prop) {
					const menu = (obj as any)[prop];
					if (!menu || typeof menu !== 'object') return menu;
					return wrapMenu(menu);
				},
			});
		},
	});

	Object.defineProperty(target, 'faction', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useInteractionMenuStore.getState().faction;
		},
		set: function (val: number | null) {
			const prev = useInteractionMenuStore.getState().faction;
			if (prev === val) return;
			useInteractionMenuStore.setState({ faction: val });
			applyFaction(val);
		},
	});

	Object.defineProperty(target, 'family', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useInteractionMenuStore.getState().family;
		},
		set: function (val: number | null) {
			const prev = useInteractionMenuStore.getState().family;
			if (prev === val) return;
			useInteractionMenuStore.setState({ family: val });
			applyFamily(val);
		},
	});

	Object.defineProperty(target, 'familyCanInvite', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useInteractionMenuStore.getState().familyCanInvite;
		},
		set: function (val: boolean) {
			const next = !!val;
			const prev = useInteractionMenuStore.getState().familyCanInvite;
			if (prev === next) return;
			useInteractionMenuStore.setState({ familyCanInvite: next });
			applyFamilyInvite(next);
		},
	});

	Object.defineProperty(target, 'hasHeadBag', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useInteractionMenuStore.getState().hasHeadBag;
		},
		set: function (val: boolean) {
			const next = !!val;
			const prev = useInteractionMenuStore.getState().hasHeadBag;
			if (prev === next) return;
			useInteractionMenuStore.setState({ hasHeadBag: next });
			applyHeadBag(next);
		},
	});

	target.showByName = showByNameSafe;
	target.addItems = addItems;
	target.deleteItem = deleteItem;
	target.onClick = onClickItem;
	win.interactionMenu = target;
}
