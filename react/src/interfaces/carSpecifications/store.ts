import { create } from 'zustand';
import { bindCefObject, prettyMoney } from '@utils/cefBridge';

export interface SpecRecord {
	header: string;
	value: string | number;
	unit: string;
}

export interface CarSpecificationsState {
	show: boolean;
	body: { [key: string]: SpecRecord };
	price: number | string;
}

const FLAT_KEYS = ['show', 'price'];

export const useCarSpecificationsStore = create<CarSpecificationsState>(() => ({
	show: false,
	body: {
		name: { header: 'Название', value: '0', unit: '' },
		class: { header: 'Класс', value: '0', unit: '' },
		volume: { header: 'Объём бака', value: '0', unit: 'л' },
		consumption: { header: 'Расход топлива', value: '0', unit: 'л' },
		maxSpeed: { header: 'Макс. скорость', value: '0', unit: 'км/ч' },
		count: { header: 'В наличии', value: '0', unit: '' },
	},
	price: 2290000,
}));

export function splitSpecPrice(price: number | string): string {
	return prettyMoney(price);
}

function cloneBody(body: { [key: string]: SpecRecord }) {
	const next: { [key: string]: SpecRecord } = {};
	const keys = Object.keys(body);
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		const record = body[key];
		next[key] = {
			header: record.header,
			value: record.value,
			unit: record.unit,
		};
	}
	return next;
}

function createBodyProxy() {
	return new Proxy(
		{},
		{
			get: function (_target, prop) {
				if (typeof prop !== 'string') {
					return undefined;
				}
				const record = useCarSpecificationsStore.getState().body[prop];
				if (!record || typeof record !== 'object') {
					return record;
				}
				return new Proxy(record, {
					get: function (_rec, field) {
						if (typeof field !== 'string') {
							return undefined;
						}
						const fresh = useCarSpecificationsStore.getState().body[prop];
						if (!fresh) {
							return undefined;
						}
						return (fresh as any)[field];
					},
					set: function (_rec, field, value) {
						if (typeof field !== 'string') {
							return false;
						}
						const current = useCarSpecificationsStore.getState().body;
						const next = cloneBody(current);
						const prev = next[prop] || { header: '', value: '', unit: '' };
						const updated: SpecRecord = {
							header: prev.header,
							value: prev.value,
							unit: prev.unit,
						};
						if (field === 'header' || field === 'value' || field === 'unit') {
							(updated as any)[field] = value;
						}
						next[prop] = updated;
						useCarSpecificationsStore.setState({ body: next });
						return true;
					},
				});
			},
			set: function (_target, prop, value) {
				if (typeof prop !== 'string') {
					return false;
				}
				const next = cloneBody(useCarSpecificationsStore.getState().body);
				next[prop] = value;
				useCarSpecificationsStore.setState({ body: next });
				return true;
			},
		},
	);
}

export function initCarSpecificationsLegacyBridge() {
	bindCefObject(
		'carSpecifications',
		FLAT_KEYS,
		function (key) {
			return (useCarSpecificationsStore.getState() as any)[key];
		},
		function (key, value) {
			if (key === 'show') {
				useCarSpecificationsStore.setState({ show: !!value });
				return;
			}
			useCarSpecificationsStore.setState({ [key]: value } as Partial<CarSpecificationsState>);
		},
	);

	const target = (window as any).carSpecifications;
	Object.defineProperty(target, 'body', {
		configurable: true,
		enumerable: true,
		get: function () {
			return createBodyProxy();
		},
		set: function (value) {
			useCarSpecificationsStore.setState({ body: value || {} });
		},
	});
}
