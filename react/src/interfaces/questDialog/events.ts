import { hideQuestDialog, openQuestDialog } from './store';

export function registerQuestDialogEvents(gameEvents: GameEvents) {
	gameEvents.on('questDialog.open', function (data) {
		openQuestDialog(data);
	});
	gameEvents.on('questDialog.hide', function () {
		hideQuestDialog();
	});
}
