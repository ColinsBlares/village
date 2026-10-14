import GunLicense from './components/GunLicense';
import { initGunLicenseLegacyBridge, useGunLicenseStore } from './store';

export default {
	id: 'gunLicense',
	Component: GunLicense,
	useVisible: () => useGunLicenseStore(state => state.show),
	init: initGunLicenseLegacyBridge,
};

export function readOpen() {
	return !!useGunLicenseStore.getState().show;
}

export function subscribe(listener) {
	const store = useGunLicenseStore;
	return store.subscribe(listener);
}
