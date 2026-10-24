import NpcEditor from './components/NpcEditor';
import { initNpcEditorBridge, useNpcEditorStore } from './store';
import { registerNpcEditorEvents } from './events';

export default {
	id: 'npcEditor',
	Component: NpcEditor,
	useVisible: () => useNpcEditorStore(state => state.show),
	init: initNpcEditorBridge,
	register: registerNpcEditorEvents,
};

export function readOpen() {
	return useNpcEditorStore.getState().show;
}

export function subscribe(listener: () => void) {
	return useNpcEditorStore.subscribe(listener);
}
