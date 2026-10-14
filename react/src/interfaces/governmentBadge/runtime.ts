import GovernmentBadge from './components/GovernmentBadge';
import { initGovernmentBadgeLegacyBridge, useGovernmentBadgeStore } from './store';

export default {
	id: 'governmentBadge',
	Component: GovernmentBadge,
	useVisible: () => useGovernmentBadgeStore(state => state.show),
	init: initGovernmentBadgeLegacyBridge,
};

export function readOpen() {
	return !!useGovernmentBadgeStore.getState().show;
}

export function subscribe(listener) {
	const store = useGovernmentBadgeStore;
	return store.subscribe(listener);
}
