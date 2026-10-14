import Loader from './components/Loader';
import { initLoaderLegacyBridge, useLoaderStore } from './store';

export default {
	id: 'loader',
	Component: Loader,
	order: 124,
	useVisible: () => useLoaderStore(state => state.show),
	init: initLoaderLegacyBridge,
};

export function readOpen() {
	return !!useLoaderStore.getState().show;
}

export function subscribe(listener) {
	const store = useLoaderStore;
	return store.subscribe(listener);
}
