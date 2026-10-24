import {
	hideQuestEditor,
	openQuestEditor,
	setQuestEditorData,
	updateNodeData,
	useQuestEditorStore,
} from './store';
import type { EditorPayload } from './types';

export function registerQuestEditorEvents(gameEvents: GameEvents) {
	gameEvents.on('questEditor.open', function (payload: EditorPayload) {
		openQuestEditor(payload);
	});
	gameEvents.on('questEditor.setData', function (payload: EditorPayload, selectId?: number) {
		setQuestEditorData(payload, selectId);
	});
	gameEvents.on('questEditor.hide', function () {
		hideQuestEditor();
	});
	gameEvents.on('questEditor.setPosition', function (pos: { x: number; y: number; z: number; h?: number }) {
		const nodeId = useQuestEditorStore.getState().selectedNodeId;
		if (!nodeId) return;
			updateNodeData(nodeId, 'x', pos.x);
			updateNodeData(nodeId, 'y', pos.y);
			updateNodeData(nodeId, 'z', pos.z);
			if (typeof pos.h === 'number') updateNodeData(nodeId, 'h', pos.h);
	});
}
