import CarPass from './components/CarPass';
import { initCarPassLegacyBridge, useCarPassStore } from './store';

export default {
	id: 'carPass',
	Component: CarPass,
	useVisible: () => useCarPassStore(state => state.show),
	init: initCarPassLegacyBridge,
};

export function readOpen() {
	return !!useCarPassStore.getState().show;
}

export function subscribe(listener) {
	const store = useCarPassStore;
	return store.subscribe(listener);
}
