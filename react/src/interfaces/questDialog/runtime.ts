import QuestDialog from './components/QuestDialog';
import { initQuestDialogBridge, useQuestDialogStore } from './store';
import { registerQuestDialogEvents } from './events';

export default {
	id: 'questDialog',
	Component: QuestDialog,
	useVisible: () => useQuestDialogStore(state => state.show),
	init: initQuestDialogBridge,
	register: registerQuestDialogEvents,
};

export function readOpen() {
	return useQuestDialogStore.getState().show;
}

export function subscribe(listener: () => void) {
	return useQuestDialogStore.subscribe(listener);
}
