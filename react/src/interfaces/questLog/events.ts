import { hideQuestLog, openQuestLog } from './store';
import type { QuestLogItem } from './store';

export function registerQuestLogEvents(gameEvents: GameEvents) {
	gameEvents.on('questLog.open', function (data: { active: QuestLogItem[]; done: QuestLogItem[] }) {
		openQuestLog(data);
	});
	gameEvents.on('questLog.hide', function () {
		hideQuestLog();
	});
}
