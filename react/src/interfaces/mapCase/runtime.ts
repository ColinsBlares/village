import MapCase from './components/MapCase';
import { registerMapCaseEvents } from './events';
import { initMapCaseLegacyBridge } from './legacy';
import { useMapCaseStore } from './store';

export default {
	id: 'mapCase',
	Component: MapCase,
	order: 4,
	useVisible: () => useMapCaseStore(state => state.show && state.enable),
	init: initMapCaseLegacyBridge,
	register: registerMapCaseEvents,
};

export function readOpen() {
	return !!(useMapCaseStore.getState().show && useMapCaseStore.getState().enable);
}

export function subscribe(listener) {
	const store = useMapCaseStore;
	return store.subscribe(listener);
}
