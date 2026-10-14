import Watermark from './components/Watermark';
import { initWatermarkLegacyBridge, useWatermarkStore } from './store';

export default {
	id: 'watermark',
	Component: Watermark,
	order: 128,
	useVisible: () => useWatermarkStore(state => state.show),
	init: initWatermarkLegacyBridge,
};

export function readOpen() {
	return !!useWatermarkStore.getState().show;
}

export function subscribe(listener) {
	const store = useWatermarkStore;
	return store.subscribe(listener);
}
