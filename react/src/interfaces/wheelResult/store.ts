import { create } from 'zustand';

interface WheelResultState {
	show: boolean;
	prizeText: string;
	prizeType: string;
}

export const useWheelResultStore = create<WheelResultState>(() => ({
	show: false,
	prizeText: '',
	prizeType: 'cash',
}));

let synced = false;

export function accentName(prizeType: string) {
	if (prizeType === 'cash') return 'cash';
	if (prizeType === 'vehicle') return 'vehicle';
	if (prizeType === 'item') return 'item';
	return 'empty';
}

export function prizeIcon(prizeType: string) {
	if (prizeType === 'cash') return '$';
	if (prizeType === 'vehicle') return '🚗';
	if (prizeType === 'item') return '★';
	return '×';
}

export function headerText(prizeType: string) {
	if (prizeType === 'empty') return 'Без выигрыша';
	return 'Ваш выигрыш';
}

function busyAdd() {
	const busy = (window as any).busy;
	if (busy && busy.add) busy.add('wheelResult', true, true);
}

function busyRemove() {
	const busy = (window as any).busy;
	if (busy && busy.remove) busy.remove('wheelResult', true);
}

export function setWheelShow(val: boolean) {
	const show = !!val;
	const prev = useWheelResultStore.getState().show;
	if (prev === show) return;
	useWheelResultStore.setState({ show: show });
	if (show) busyAdd();
	else busyRemove();
}

export function acceptWheelPrize() {
	setWheelShow(false);
	mp.trigger('casino.wheel.result.close');
}

export function initWheelResultLegacyBridge() {
	if (typeof window === 'undefined' || synced) return;
	synced = true;

	const win = window as any;
	const target = win.wheelResult || {};

	Object.defineProperty(target, 'show', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useWheelResultStore.getState().show;
		},
		set: function (val: boolean) {
			setWheelShow(!!val);
		},
	});

	Object.defineProperty(target, 'prizeText', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useWheelResultStore.getState().prizeText;
		},
		set: function (val: string) {
			useWheelResultStore.setState({ prizeText: val == null ? '' : String(val) });
		},
	});

	Object.defineProperty(target, 'prizeType', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useWheelResultStore.getState().prizeType;
		},
		set: function (val: string) {
			useWheelResultStore.setState({ prizeType: val == null ? 'cash' : String(val) });
		},
	});

	target.accept = acceptWheelPrize;
	win.wheelResult = target;
}
