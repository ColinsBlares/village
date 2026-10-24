import { create } from 'zustand';

export interface QuestTrackerProgress {
	current: number;
	target: number;
}

export interface QuestTrackerData {
	questKey: string;
	title: string;
	objective: string;
	progress: QuestTrackerProgress | null;
}

interface QuestTrackerState {
	visible: boolean;
	title: string;
	objective: string;
	progress: QuestTrackerProgress | null;
}

export const useQuestTrackerStore = create<QuestTrackerState>(() => ({
	visible: false,
	title: '',
	objective: '',
	progress: null,
}));

export function setQuestTracker(data: QuestTrackerData | null) {
	if (!data) {
		useQuestTrackerStore.setState({
			visible: false,
			title: '',
			objective: '',
			progress: null,
		});
		return;
	}
	useQuestTrackerStore.setState({
		visible: true,
		title: data.title || '',
		objective: data.objective || '',
		progress: data.progress || null,
	});
}

export function initQuestTrackerLegacyBridge() {
	const store = useQuestTrackerStore;
	const api = {
		set: function (data: QuestTrackerData | null) {
			setQuestTracker(data);
		},
	};
	Object.defineProperty(window, 'questTracker', {
		configurable: true,
		get: function () {
			return api;
		},
	});
	void store;
}
