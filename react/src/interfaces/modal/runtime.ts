import Modal from './components/Modal';
import { initModalLegacyBridge, useModalStore } from './store';

export default {
	id: 'modal',
	Component: Modal,
	order: 130,
	useVisible: () => useModalStore(state => state.show),
	init: initModalLegacyBridge,
};

export function readOpen() {
	return !!useModalStore.getState().show;
}

export function subscribe(listener) {
	const store = useModalStore;
	return store.subscribe(listener);
}
