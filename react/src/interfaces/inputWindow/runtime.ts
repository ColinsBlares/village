import InputWindow from './components/InputWindow';
import { initInputWindowLegacyBridge, useInputWindowStore } from './store';

export default {
	id: 'inputWindow',
	Component: InputWindow,
	order: 125,
	useVisible: () => useInputWindowStore(state => state.show),
	init: initInputWindowLegacyBridge,
};

export function readOpen() {
	return !!useInputWindowStore.getState().show;
}

export function subscribe(listener) {
	const store = useInputWindowStore;
	return store.subscribe(listener);
}
