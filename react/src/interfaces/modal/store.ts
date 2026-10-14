import { create } from 'zustand';
import { MODAL_ITEMS, ModalItem } from './modals';

export interface ModalState {
	show: boolean;
	activeName: string | null;
	modals: Record<string, ModalItem>;
}

export const useModalStore = create<ModalState>(() => ({
	show: false,
	activeName: null,
	modals: MODAL_ITEMS,
}));

function busyAdd() {
	const busy = (window as any).busy;
	if (busy) {
		busy.add('modal', true, true);
	}
}

function busyRemove() {
	const busy = (window as any).busy;
	if (busy) {
		busy.remove('modal', true);
	}
}

function updateModalField(name: string, key: 'header' | 'content', value: string) {
	const modals = useModalStore.getState().modals;
	const current = modals[name];
	if (!current) {
		return;
	}
	const nextModal = Object.assign({}, current);
	nextModal[key] = value;
	const nextModals = Object.assign({}, modals);
	nextModals[name] = nextModal;
	useModalStore.setState({ modals: nextModals });
}

export function setModalShow(val: boolean) {
	const show = !!val;
	const prev = useModalStore.getState().show;
	if (prev === show) {
		return;
	}
	useModalStore.setState({ show: show });
	if (show) {
		busyAdd();
	} else {
		busyRemove();
	}
}

export function showModalByName(name: string) {
	if (!useModalStore.getState().modals[name]) {
		return;
	}
	useModalStore.setState({ activeName: name });
	setModalShow(true);
}

function createModalProxy(name: string) {
	const proxy: any = {};
	Object.defineProperty(proxy, 'header', {
		configurable: true,
		enumerable: true,
		get: function () {
			const modal = useModalStore.getState().modals[name];
			return modal ? modal.header : '';
		},
		set: function (val: string) {
			updateModalField(name, 'header', val);
		},
	});
	Object.defineProperty(proxy, 'content', {
		configurable: true,
		enumerable: true,
		get: function () {
			const modal = useModalStore.getState().modals[name];
			return modal ? modal.content : '';
		},
		set: function (val: string) {
			updateModalField(name, 'content', val);
		},
	});
	return proxy;
}

export function initModalLegacyBridge() {
	if (typeof window === 'undefined') {
		return;
	}

	const win = window as any;
	const target = win.modal || {};
	const modalsProxy: Record<string, any> = {};
	Object.keys(useModalStore.getState().modals).forEach(function (name) {
		modalsProxy[name] = createModalProxy(name);
	});

	Object.defineProperty(target, 'show', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useModalStore.getState().show;
		},
		set: function (val: boolean) {
			setModalShow(val);
		},
	});

	Object.defineProperty(target, 'modals', {
		configurable: true,
		enumerable: true,
		get: function () {
			return modalsProxy;
		},
	});

	target.showByName = showModalByName;
	win.modal = target;

	const desc = Object.getOwnPropertyDescriptor(win.modal, 'show');
	if (desc && desc.get) {
		return;
	}
}
