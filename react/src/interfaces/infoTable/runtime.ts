import InfoTable from './components/InfoTable';
import { initInfoTableLegacyBridge, useInfoTableStore } from './store';

export default {
	id: 'infoTable',
	Component: InfoTable,
	order: 123,
	useVisible: () => useInfoTableStore(state => state.show),
	init: initInfoTableLegacyBridge,
};

export function readOpen() {
	return !!useInfoTableStore.getState().show;
}

export function subscribe(listener) {
	const store = useInfoTableStore;
	return store.subscribe(listener);
}
