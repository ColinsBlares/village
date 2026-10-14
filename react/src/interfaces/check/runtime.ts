import Check from './components/Check';
import { initCheckLegacyBridge, useCheckStore } from './store';

export default {
	id: 'check',
	Component: Check,
	useVisible: () => useCheckStore(state => state.show),
	init: initCheckLegacyBridge,
};

export function readOpen() {
	return !!useCheckStore.getState().show;
}

export function subscribe(listener) {
	const store = useCheckStore;
	return store.subscribe(listener);
}
