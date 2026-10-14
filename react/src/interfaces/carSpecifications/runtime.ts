import CarSpecifications from './components/CarSpecifications';
import { initCarSpecificationsLegacyBridge, useCarSpecificationsStore } from './store';

export default {
	id: 'carSpecifications',
	Component: CarSpecifications,
	useVisible: () => useCarSpecificationsStore(state => state.show),
	init: initCarSpecificationsLegacyBridge,
};

export function readOpen() {
	return !!useCarSpecificationsStore.getState().show;
}

export function subscribe(listener) {
	const store = useCarSpecificationsStore;
	return store.subscribe(listener);
}
