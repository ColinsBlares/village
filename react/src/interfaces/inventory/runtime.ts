import Inventory from './components/Inventory';
import { initInventoryLegacyBridge } from './bridge';
import { registerInventoryEvents } from './events';
import { useInventoryStore } from './store';

export default {
	id: 'inventory',
	Component: Inventory,
	order: 20,
	useVisible: () => useInventoryStore(function (state) {
		return state.show;
	}),
	init: initInventoryLegacyBridge,
	register: registerInventoryEvents,
};

export function readOpen() {
	return !!useInventoryStore.getState().show;
}

export function subscribe(listener) {
	const store = useInventoryStore;
	return store.subscribe(listener);
}
