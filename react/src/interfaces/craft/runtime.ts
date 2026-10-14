import Craft from './components/Craft';
import { initCraftLegacyBridge, useCraftStore } from './store';

export default {
	id: 'craft',
	Component: Craft,
	useVisible: () => {
		const show = useCraftStore(state => state.show);
		const crafter = useCraftStore(state => state.crafter);
		return !!(show && crafter);
	},
	init: initCraftLegacyBridge,
};

export function readOpen() {
	return !!(useCraftStore.getState().show && useCraftStore.getState().crafter);
}

export function subscribe(listener) {
	const store = useCraftStore;
	return store.subscribe(listener);
}
