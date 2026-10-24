import { setQuestHud, QuestHudPayload } from '../hud/store';
import { setQuestTracker, QuestTrackerData } from './store';

export function registerQuestTrackerEvents(gameEvents: GameEvents) {
	gameEvents.on('quests.tracker.set', function (data: QuestTrackerData | null) {
		setQuestTracker(data);
		setQuestHud(data as QuestHudPayload | null);
	});
}
