import QuestTracker from './components/QuestTracker';
import { initQuestTrackerLegacyBridge, useQuestTrackerStore } from './store';
import { registerQuestTrackerEvents } from './events';

export default {
	id: 'questTracker',
	Component: QuestTracker,
	useVisible: () => useQuestTrackerStore(state => state.visible),
	init: initQuestTrackerLegacyBridge,
	register: registerQuestTrackerEvents,
};

export function readOpen() {
	return useQuestTrackerStore.getState().visible;
}

export function subscribe(listener: () => void) {
	return useQuestTrackerStore.subscribe(listener);
}
