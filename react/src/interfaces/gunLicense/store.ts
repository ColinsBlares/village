import { create } from 'zustand';
import { bindCefObject } from '@utils/cefBridge';

export interface GunLicenseState {
	show: boolean;
	header: string;
	name: string;
	number: number | string;
	sex: number | string | boolean;
	date: string;
}

const KEYS = ['show', 'header', 'name', 'number', 'sex', 'date'];

export const useGunLicenseStore = create<GunLicenseState>(() => ({
	show: false,
	header: 'State of San Andreas License To Carry Handgun',
	name: 'Carter Slade',
	number: 1121,
	sex: 1,
	date: '18.08.2020',
}));

export function closeGunLicense() {
	useGunLicenseStore.setState({ show: false });
	mp.trigger('documents.close');
}

export function initGunLicenseLegacyBridge() {
	bindCefObject(
		'gunLicense',
		KEYS,
		function (key) {
			return (useGunLicenseStore.getState() as any)[key];
		},
		function (key, value) {
			if (key === 'show') {
				useGunLicenseStore.setState({ show: !!value });
				return;
			}
			useGunLicenseStore.setState({ [key]: value } as Partial<GunLicenseState>);
		},
		{
			close: closeGunLicense,
		},
	);
}
