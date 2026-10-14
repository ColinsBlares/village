import { create } from 'zustand';
import { bindCefObject } from '@utils/cefBridge';

export interface DriverLicenseState {
	show: boolean;
	header: string;
	number: number | string;
	name: string;
	sex: number | string | boolean;
	catNames: string[];
	categories: Array<number | string | boolean>;
}

const KEYS = ['show', 'header', 'number', 'name', 'sex', 'catNames', 'categories'];

export const useDriverLicenseStore = create<DriverLicenseState>(() => ({
	show: false,
	header: 'Водительское удостоверение',
	number: 332143023,
	name: 'Alexander Woodman',
	sex: 1,
	catNames: ['b', 'p', 'm', 'a', 'air', 'boat'],
	categories: [0, 1, 0, 1, 0, 1],
}));

export function closeDriverLicense() {
	useDriverLicenseStore.setState({ show: false });
	mp.trigger('documents.close');
}

export function initDriverLicenseLegacyBridge() {
	bindCefObject(
		'driverLicense',
		KEYS,
		function (key) {
			return (useDriverLicenseStore.getState() as any)[key];
		},
		function (key, value) {
			if (key === 'show') {
				useDriverLicenseStore.setState({ show: !!value });
				return;
			}
			useDriverLicenseStore.setState({ [key]: value } as Partial<DriverLicenseState>);
		},
		{
			close: closeDriverLicense,
		},
	);
}
