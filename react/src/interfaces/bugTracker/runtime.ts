import BugTracker from './components/BugTracker';
import { initBugTrackerLegacyBridge, useBugTrackerStore } from './store';

export default {
	id: 'bugTracker',
	Component: BugTracker,
	useVisible: () => useBugTrackerStore(state => state.show),
	init: initBugTrackerLegacyBridge,
};

export function readOpen() {
	return !!useBugTrackerStore.getState().show;
}

export function subscribe(listener) {
	const store = useBugTrackerStore;
	return store.subscribe(listener);
}
