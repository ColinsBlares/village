import SelectItems from './components/SelectItems';
import { initSelectItemsLegacyBridge, useSelectItemsStore } from './store';

export default {
	id: 'selectItems',
	Component: SelectItems,
	order: 131,
	useVisible: () => useSelectItemsStore(state => state.show),
	init: initSelectItemsLegacyBridge,
};

export function readOpen() {
	return !!useSelectItemsStore.getState().show;
}

export function subscribe(listener) {
	const store = useSelectItemsStore;
	return store.subscribe(listener);
}
