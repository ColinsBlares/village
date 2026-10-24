import { create } from 'zustand';

export interface DialogChoice {
	handle: string;
	text: string;
}

interface QuestDialogState {
	show: boolean;
	questId: number;
	npcName: string;
	lines: string[];
	choices: DialogChoice[];
}

export const useQuestDialogStore = create<QuestDialogState>(() => ({
	show: false,
	questId: 0,
	npcName: '',
	lines: [],
	choices: [],
}));

export function openQuestDialog(data: {
	questId: number;
	npcName: string;
	lines: string[];
	choices: DialogChoice[];
}) {
	useQuestDialogStore.setState({
		show: true,
		questId: data.questId,
		npcName: data.npcName || 'NPC',
		lines: data.lines || [],
		choices: data.choices || [],
	});
}

export function hideQuestDialog() {
	useQuestDialogStore.setState({ show: false });
}

export function initQuestDialogBridge() {
	Object.defineProperty(window, 'questDialog', {
		configurable: true,
		get: function () {
			return { hide: hideQuestDialog };
		},
	});
}
