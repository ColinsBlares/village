import { create } from 'zustand';
import { bindCefObject, prettyMoney } from '@utils/cefBridge';

export interface CheckRecord {
	header: string;
	price: number;
}

export interface CheckState {
	show: boolean;
	checkName: string;
	logo: string;
	records: CheckRecord[];
}

const FLAT_KEYS = ['show', 'checkName', 'logo'];

export const useCheckStore = create<CheckState>(() => ({
	show: false,
	checkName: 'Счет за ремонт',
	logo: 'repairLogo.svg',
	records: [],
}));

export function splitCheckPrice(value: number | string): string {
	return prettyMoney(value);
}

export function totalCheckPrice(records: CheckRecord[]): number {
	let sum = 0;
	for (let i = 0; i < records.length; i++) {
		sum += records[i].price;
	}
	return sum;
}

function createRecordsProxy() {
	return new Proxy([] as CheckRecord[], {
		get: function (_target, prop) {
			const records = useCheckStore.getState().records;
			if (prop === 'push') {
				return function () {
					const args = Array.prototype.slice.call(arguments);
					const next = useCheckStore.getState().records.slice();
					for (let i = 0; i < args.length; i++) {
						next.push(args[i]);
					}
					useCheckStore.setState({ records: next });
					return next.length;
				};
			}
			const value = (records as any)[prop];
			if (typeof value === 'function') {
				return value.bind(records);
			}
			return value;
		},
	});
}

export function hideCheck() {
	useCheckStore.setState({ show: false });
	mp.trigger('callRemote', 'carservice.check.accept', 0);
	mp.trigger('carservice.check.close');
}

export function payCheck() {
	mp.trigger('callRemote', 'carservice.check.accept', 1);
	mp.trigger('carservice.check.close');
}

export function refuseCheck() {
	mp.trigger('callRemote', 'carservice.check.accept', 0);
	mp.trigger('carservice.check.close');
}

export function initCheckLegacyBridge() {
	bindCefObject(
		'check',
		FLAT_KEYS,
		function (key) {
			return (useCheckStore.getState() as any)[key];
		},
		function (key, value) {
			if (key === 'show') {
				useCheckStore.setState({ show: !!value });
				return;
			}
			useCheckStore.setState({ [key]: value } as Partial<CheckState>);
		},
		{
			hide: hideCheck,
			pay: payCheck,
			refuse: refuseCheck,
		},
	);

	const target = (window as any).check;
	Object.defineProperty(target, 'records', {
		configurable: true,
		enumerable: true,
		get: function () {
			return createRecordsProxy();
		},
		set: function (value) {
			useCheckStore.setState({
				records: Array.isArray(value) ? value.slice() : [],
			});
		},
	});
}
