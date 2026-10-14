import Changelist from './components/Changelist';
import { initChangelistLegacyBridge, useChangelistStore } from './store';

export default {
	id: 'changelist',
	Component: Changelist,
	order: 210,
	useVisible: () => useChangelistStore(state => state.show),
	init: initChangelistLegacyBridge,
};

export function readOpen() {
	return !!useChangelistStore.getState().show;
}

export function subscribe(listener) {
	const store = useChangelistStore;
	return store.subscribe(listener);
}
