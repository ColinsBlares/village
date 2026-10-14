import InteractionMenu from './components/InteractionMenu';
import { initInteractionMenuLegacyBridge, useInteractionMenuStore } from './store';

export default {
	id: 'interactionMenu',
	Component: InteractionMenu,
	useVisible: () => {
		const show = useInteractionMenuStore(state => state.show);
		const enable = useInteractionMenuStore(state => state.enable);
		return show && enable;
	},
	init: initInteractionMenuLegacyBridge,
};

export function readOpen() {
	return !!(useInteractionMenuStore.getState().show && useInteractionMenuStore.getState().enable);
}

export function subscribe(listener) {
	const store = useInteractionMenuStore;
	return store.subscribe(listener);
}
