import DriverLicense from './components/DriverLicense';
import { initDriverLicenseLegacyBridge, useDriverLicenseStore } from './store';

export default {
	id: 'driverLicense',
	Component: DriverLicense,
	useVisible: () => useDriverLicenseStore(state => state.show),
	init: initDriverLicenseLegacyBridge,
};

export function readOpen() {
	return !!useDriverLicenseStore.getState().show;
}

export function subscribe(listener) {
	const store = useDriverLicenseStore;
	return store.subscribe(listener);
}
