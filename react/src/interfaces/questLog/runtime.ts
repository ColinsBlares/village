import QuestLog from './components/QuestLog';
import { initQuestLogBridge, useQuestLogStore } from './store';
import { registerQuestLogEvents } from './events';

export default {
	id: 'questLog',
	Component: QuestLog,
	useVisible: () => useQuestLogStore(state => state.show),
	init: initQuestLogBridge,
	register: registerQuestLogEvents,
};

export function readOpen() {
	return useQuestLogStore.getState().show;
}

export function subscribe(listener: () => void) {
	return useQuestLogStore.subscribe(listener);
}
