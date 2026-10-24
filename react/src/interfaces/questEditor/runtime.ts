import QuestEditor from './components/QuestEditor';
import { initQuestEditorLegacyBridge, useQuestEditorStore } from './store';
import { registerQuestEditorEvents } from './events';

export default {
	id: 'questEditor',
	Component: QuestEditor,
	useVisible: () => useQuestEditorStore(state => state.show),
	init: initQuestEditorLegacyBridge,
	register: registerQuestEditorEvents,
};

export function readOpen() {
	return useQuestEditorStore.getState().show;
}

export function subscribe(listener: () => void) {
	return useQuestEditorStore.subscribe(listener);
}
