import WheelResult from './components/WheelResult';
import { initWheelResultLegacyBridge, useWheelResultStore } from './store';

export default {
	id: 'wheelResult',
	Component: WheelResult,
	useVisible: () => useWheelResultStore(state => state.show),
	init: initWheelResultLegacyBridge,
};

export function readOpen() {
	return !!useWheelResultStore.getState().show;
}

export function subscribe(listener) {
	const store = useWheelResultStore;
	return store.subscribe(listener);
}
