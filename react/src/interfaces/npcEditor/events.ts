import { hideNpcEditor, openNpcEditor, setNpcEditorData } from './store';

export function registerNpcEditorEvents(gameEvents: GameEvents) {
	gameEvents.on('npcEditor.open', function (payload) {
		openNpcEditor(payload);
	});
	gameEvents.on('npcEditor.setData', function (payload, selectId?: number) {
		setNpcEditorData(payload, selectId);
	});
	gameEvents.on('npcEditor.hide', function () {
		hideNpcEditor();
	});
}
