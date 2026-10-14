import PlayerMenu from './components/PlayerMenu';
import { initPlayerMenuBridge, usePlayerMenuStore } from './store';

export default {
	id: 'playerMenu',
	Component: PlayerMenu,
	order: 8,
	useVisible: () => usePlayerMenuStore(state => state.show),
	init: initPlayerMenuBridge,
};

export function readOpen() {
	return !!usePlayerMenuStore.getState().show;
}

export function subscribe(listener) {
	const store = usePlayerMenuStore;
	return store.subscribe(listener);
}
