import Timer from './components/Timer';
import { initTimerLegacyBridge, useTimerStore } from './store';

export default {
	id: 'timer',
	Component: Timer,
	order: 129,
	useVisible: () => useTimerStore(state => state.show),
	init: initTimerLegacyBridge,
};

export function readOpen() {
	return !!useTimerStore.getState().show;
}

export function subscribe(listener) {
	const store = useTimerStore;
	return store.subscribe(listener);
}
