import OfferDialog from './components/OfferDialog';
import { initOfferDialogLegacyBridge, useOfferDialogStore } from './store';

export default {
	id: 'offerDialog',
	Component: OfferDialog,
	order: 122,
	useVisible: () => useOfferDialogStore(state => state.show),
	init: initOfferDialogLegacyBridge,
};

export function readOpen() {
	return !!useOfferDialogStore.getState().show;
}

export function subscribe(listener) {
	const store = useOfferDialogStore;
	return store.subscribe(listener);
}
