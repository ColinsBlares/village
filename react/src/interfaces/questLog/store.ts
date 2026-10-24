import { create } from 'zustand';

export interface QuestLogItem {
	key: string;
	name: string;
	description: string;
	status: string;
	tracked: boolean;
	objective: string;
}

interface QuestLogState {
	show: boolean;
	active: QuestLogItem[];
	done: QuestLogItem[];
}

export const useQuestLogStore = create<QuestLogState>(() => ({
	show: false,
	active: [],
	done: [],
}));

export function openQuestLog(data: { active?: QuestLogItem[]; done?: QuestLogItem[] } | null) {
	useQuestLogStore.setState({
		show: true,
		active: (data && data.active) || [],
		done: (data && data.done) || [],
	});
}

export function hideQuestLog() {
	useQuestLogStore.setState({ show: false });
}

export function initQuestLogBridge() {
	Object.defineProperty(window, 'questLog', {
		configurable: true,
		get: function () {
			return { hide: hideQuestLog };
		},
	});
}
