import SelectionWindow from './components/SelectionWindow';
import { initSelectionWindowLegacyBridge, useSelectionWindowStore } from './store';

export default {
	id: 'selectionWindow',
	Component: SelectionWindow,
	order: 126,
	useVisible: () => useSelectionWindowStore(state => state.show),
	init: initSelectionWindowLegacyBridge,
};

export function readOpen() {
	return !!useSelectionWindowStore.getState().show;
}

export function subscribe(listener) {
	const store = useSelectionWindowStore;
	return store.subscribe(listener);
}
