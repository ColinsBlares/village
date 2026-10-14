import Notifications from './components/Notifications';
import { initNotificationsLegacyBridge, useNotificationsStore } from './store';

export default {
	id: 'notifications',
	Component: Notifications,
	order: 121,
	useVisible: () => useNotificationsStore(state => state.show),
	init: initNotificationsLegacyBridge,
};

export function readOpen() {
	return !!useNotificationsStore.getState().show;
}

export function subscribe(listener) {
	const store = useNotificationsStore;
	return store.subscribe(listener);
}
