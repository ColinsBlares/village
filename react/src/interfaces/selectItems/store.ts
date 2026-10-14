import { create } from 'zustand';

const SOUNDS: Record<string, { name: string; setName: string }> = {
	open: {
		name: 'Whoosh_1s_L_to_R',
		setName: 'MP_LOBBY_SOUNDS',
	},
	close: {
		name: 'Whoosh_1s_R_to_L',
		setName: 'MP_LOBBY_SOUNDS',
	},
	focus: {
		name: 'NAV',
		setName: 'HUD_AMMO_SHOP_SOUNDSET',
	},
	select: {
		name: 'WEAPON_SELECT_ARMOR',
		setName: 'HUD_AMMO_SHOP_SOUNDSET',
	},
};

export interface SelectItemsState {
	show: boolean;
	select: number;
	tempFocus: number;
	revision: number;
	inventoryVisible: boolean;
}

export const useSelectItemsStore = create<SelectItemsState>(() => ({
	show: false,
	select: -1,
	tempFocus: -1,
	revision: 0,
	inventoryVisible: true,
}));

let lastShowTime = 0;
let centerX = 0;
let centerY = 0;
let listening = false;

function busyAdd() {
	const busy = (window as any).busy;
	if (busy) {
		busy.add('selectItems', true, true);
	}
}

function busyRemove() {
	const busy = (window as any).busy;
	if (busy) {
		busy.remove('selectItems', true);
	}
}

function playSound(name: string) {
	const sound = SOUNDS[name];
	if (!sound) {
		return;
	}
	mp.trigger('sound', JSON.stringify(sound));
}

function updateCenter() {
	centerX = window.innerWidth / 2;
	centerY = window.innerHeight / 2;
}

export function readInventoryVisible() {
	const inventory = (window as any).inventory;
	return !!(inventory && inventory.enable && !inventory.handsBlock);
}

export function setSelectItemsShow(val: boolean) {
	const show = !!val;
	const prev = useSelectItemsStore.getState().show;
	if (prev === show) {
		return;
	}
	const revision = useSelectItemsStore.getState().revision + 1;
	useSelectItemsStore.setState({
		show: show,
		select: -1,
		tempFocus: -1,
		revision: revision,
		inventoryVisible: readInventoryVisible(),
	});
	if (show) {
		updateCenter();
		busyAdd();
		playSound('open');
	} else {
		busyRemove();
		playSound('close');
	}
	lastShowTime = Date.now();
}

export function setSelectItem(val: number) {
	const state = useSelectItemsStore.getState();
	if (state.select === val) {
		return;
	}
	useSelectItemsStore.setState({
		select: val,
		tempFocus: val,
		revision: state.revision + 1,
	});
	if (val !== -1) {
		playSound('focus');
	}
}

function selectHandler() {
	const select = useSelectItemsStore.getState().select;
	if (select == -1) {
		return;
	}
	playSound('select');
	const inventory = (window as any).inventory;
	if (!inventory) {
		return;
	}
	if (select == 0) {
		if (!inventory.equipment[13]) {
			return;
		}
		inventory.clearHands();
		return;
	}
	const item = inventory.hotkeys[select];
	if (!item || !inventory.getItem(item.sqlId)) {
		return;
	}
	if (inventory.equipment[13] == item) {
		return;
	}
	inventory.moveItemToBody(item, 13);
}

function onMouseMove(event: MouseEvent) {
	if (!useSelectItemsStore.getState().show) {
		return;
	}
	const vectX = event.pageX - centerX;
	const vectY = event.pageY - centerY;
	const len = Math.sqrt(vectX * vectX + vectY * vectY);
	if (len < 0.2 * centerY) {
		setSelectItem(-1);
		return;
	}
	let delta = 0;
	if (vectY < 0 && vectX < 0) {
		delta = 180;
	} else if (vectY > 0 && vectX < 0) {
		delta = 180;
	} else if (vectY < 0 && vectX > 0) {
		delta = 360;
	} else if (vectY > 0 && vectX > 0) {
		delta = 360;
	}
	const angle = (Math.atan(vectY / vectX) * 180) / Math.PI + delta - 70;
	const id = parseInt(String(angle / 36), 10);
	setSelectItem(id == 10 ? 0 : id);
}

function onKeyDown(event: KeyboardEvent) {
	if (event.keyCode != 9 || useSelectItemsStore.getState().show) {
		return;
	}
	const busy = (window as any).busy;
	const inventory = (window as any).inventory;
	if (!inventory) {
		return;
	}
	if ((busy && busy.includes()) || !inventory.enable || inventory.handsBlock) {
		return;
	}
	if (Date.now() - lastShowTime < 2000) {
		return;
	}
	setSelectItemsShow(true);
}

function onKeyUp(event: KeyboardEvent) {
	if (event.keyCode != 9 || !useSelectItemsStore.getState().show) {
		return;
	}
	selectHandler();
	setSelectItemsShow(false);
}

export function initSelectItemsLegacyBridge() {
	if (typeof window === 'undefined') {
		return;
	}

	const win = window as any;
	const target = win.selectItems || {};
	const desc = Object.getOwnPropertyDescriptor(target, 'show');
	const prevShow = desc && !desc.get && 'value' in desc ? desc.value : false;

	Object.defineProperty(target, 'show', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useSelectItemsStore.getState().show;
		},
		set: function (val: boolean) {
			setSelectItemsShow(val);
		},
	});

	Object.defineProperty(target, 'select', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useSelectItemsStore.getState().select;
		},
		set: function (val: number) {
			setSelectItem(val);
		},
	});

	win.selectItems = target;

	if (prevShow) {
		setSelectItemsShow(true);
	}

	if (listening) {
		return;
	}
	listening = true;
	updateCenter();
	window.addEventListener('keydown', onKeyDown);
	window.addEventListener('keyup', onKeyUp);
	window.addEventListener('mousemove', onMouseMove);
	window.addEventListener('resize', updateCenter);
	window.setInterval(function () {
		if (!useSelectItemsStore.getState().show) {
			return;
		}
		const visible = readInventoryVisible();
		const state = useSelectItemsStore.getState();
		useSelectItemsStore.setState({
			inventoryVisible: visible,
			revision: state.revision + 1,
		});
	}, 200);
}
