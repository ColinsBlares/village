import AcceptWindow from './components/AcceptWindow';
import { initAcceptWindowLegacyBridge, useAcceptWindowStore } from './store';

export default {
	id: 'acceptWindow',
	Component: AcceptWindow,
	order: 127,
	useVisible: () => useAcceptWindowStore(state => state.show),
	init: initAcceptWindowLegacyBridge,
};

export function readOpen() {
	return !!useAcceptWindowStore.getState().show;
}

export function subscribe(listener) {
	const store = useAcceptWindowStore;
	return store.subscribe(listener);
}
