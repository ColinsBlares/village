import Fishing from './components/Fishing';
import { initFishingLegacyBridge, useFishingStore } from './store';

export default {
	id: 'fishing',
	Component: Fishing,
	useVisible: () => useFishingStore(state => state.show),
	init: initFishingLegacyBridge,
};

export function readOpen() {
	return !!useFishingStore.getState().show;
}

export function subscribe(listener) {
	const store = useFishingStore;
	return store.subscribe(listener);
}
