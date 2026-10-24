import AdminPanel from './components/AdminPanel';
import { registerAdminPanelEvents } from './events';
import { initAdminPanelBridge, useAdminPanelStore } from './store';

export default {
	id: 'adminPanel',
	Component: AdminPanel,
	useVisible: () => useAdminPanelStore(state => state.show),
	init: initAdminPanelBridge,
	register: registerAdminPanelEvents,
};

export function readOpen() {
	return !!useAdminPanelStore.getState().show;
}

export function subscribe(listener: () => void) {
	return useAdminPanelStore.subscribe(listener);
}
