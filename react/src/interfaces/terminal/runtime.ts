import Terminal from './components/Terminal';
import { initTerminalLegacyBridge, useTerminalStore } from './store';

export default {
	id: 'terminal',
	Component: Terminal,
	useVisible: () => useTerminalStore(state => state.show),
	init: initTerminalLegacyBridge,
};

export function readOpen() {
	return !!useTerminalStore.getState().show;
}

export function subscribe(listener) {
	const store = useTerminalStore;
	return store.subscribe(listener);
}
