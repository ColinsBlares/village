import { create } from 'zustand';
import { bindCefObject } from '@utils/cefBridge';

export interface CarPassState {
	show: boolean;
	header: string;
	id: number | string;
	vehType: string;
	name: string;
	regDate: string;
	price: number | string;
	owners: number | string;
	number: string;
}

const KEYS = ['show', 'header', 'id', 'vehType', 'name', 'regDate', 'price', 'owners', 'number'];

export const useCarPassStore = create<CarPassState>(() => ({
	show: false,
	header: 'Паспорт Т/С',
	id: 3940123342,
	vehType: 'Автомобиль',
	name: 'Felon GT',
	regDate: '06 Дек 2012',
	price: 60000,
	owners: 1,
	number: 'GYP228',
}));

export function closeCarPass() {
	useCarPassStore.setState({ show: false });
	mp.trigger('documents.close');
}

export function initCarPassLegacyBridge() {
	bindCefObject(
		'carPass',
		KEYS,
		function (key) {
			return (useCarPassStore.getState() as any)[key];
		},
		function (key, value) {
			if (key === 'show') {
				useCarPassStore.setState({ show: !!value });
				return;
			}
			useCarPassStore.setState({ [key]: value } as Partial<CarPassState>);
		},
		{
			close: closeCarPass,
		},
	);
}
