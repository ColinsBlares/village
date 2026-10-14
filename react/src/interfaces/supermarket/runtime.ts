import Supermarket from './components/Supermarket';
import { initSupermarketLegacyBridge, useSupermarketStore } from './store';

export default {
	id: 'supermarket',
	Component: Supermarket,
	useVisible: () => useSupermarketStore(state => state.show),
	init: initSupermarketLegacyBridge,
};

export function readOpen() {
	return !!useSupermarketStore.getState().show;
}

export function subscribe(listener) {
	const store = useSupermarketStore;
	return store.subscribe(listener);
}
