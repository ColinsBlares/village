import { create } from 'zustand';
import { setLoaderShow } from '../loader/store';

export interface AcceptWindowState {
	show: boolean;
	name: string;
	header: string;
	text: string;
	leftWord: string;
	rightWord: string;
	value: string;
}

export const useAcceptWindowStore = create<AcceptWindowState>(() => ({
	show: false,
	name: '',
	header: '',
	text: '',
	leftWord: 'Принять',
	rightWord: 'Отменить',
	value: '',
}));

const FIELDS: Array<keyof AcceptWindowState> = [
	'show',
	'name',
	'header',
	'text',
	'leftWord',
	'rightWord',
	'value',
];

export function setAcceptField(key: string, val: any) {
	if (key === 'show') {
		useAcceptWindowStore.setState({ show: !!val });
		return;
	}
	useAcceptWindowStore.setState({ [key]: val } as Partial<AcceptWindowState>);
}

export function acceptOfferWindow() {
	const name = useAcceptWindowStore.getState().name;
	if (name == 'carsell') {
		mp.trigger('vehicles.sell.seller.accept', 1);
	}
	if (name == 'taxi_rent') {
		mp.trigger('callRemote', 'taxi.rent.accept', 1);
		mp.trigger('taxi.rent.close');
	}
	if (name == 'bus_rent') {
		setLoaderShow(true);
		mp.trigger('callRemote', 'busdriver.rent.accept', 1);
		mp.trigger('busdriver.rent.close');
	}
}

export function declineOfferWindow() {
	const name = useAcceptWindowStore.getState().name;
	if (name == 'carsell') {
		mp.trigger('vehicles.sell.seller.accept', 0);
	}
	if (name == 'bus_rent') {
		setLoaderShow(true);
		mp.trigger('callRemote', 'busdriver.rent.accept', 0);
		mp.trigger('busdriver.rent.close');
	}
	if (name == 'taxi_rent') {
		mp.trigger('callRemote', 'taxi.rent.accept', 0);
		mp.trigger('taxi.rent.close');
	}
}

export function initAcceptWindowLegacyBridge() {
	if (typeof window === 'undefined') {
		return;
	}

	const win = window as any;
	const target = win.acceptWindow || {};
	const saved: Record<string, any> = {};

	FIELDS.forEach(function (key) {
		const desc = Object.getOwnPropertyDescriptor(target, key);
		if (desc && !desc.get && 'value' in desc) {
			saved[key] = desc.value;
		}
		Object.defineProperty(target, key, {
			configurable: true,
			enumerable: true,
			get: function () {
				return (useAcceptWindowStore.getState() as any)[key];
			},
			set: function (val: any) {
				setAcceptField(key, val);
			},
		});
	});

	target.accept = acceptOfferWindow;
	target.decline = declineOfferWindow;
	win.acceptWindow = target;

	Object.keys(saved).forEach(function (key) {
		if (key === 'show') {
			if (saved[key]) {
				setAcceptField(key, saved[key]);
			}
			return;
		}
		if (saved[key] !== undefined && saved[key] !== '') {
			setAcceptField(key, saved[key]);
		}
	});
}
