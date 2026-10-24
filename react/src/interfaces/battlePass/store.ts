import { create } from 'zustand';

export type BattlePassTab = 'tasks' | 'rewards' | 'top';

export interface BattlePassTask {
	id: string;
	title: string;
	description: string;
	metric: 'onlineMinutes' | 'cashSpent' | 'drivenMeters';
	unit: string;
	target: number;
	points: number;
	progress: number;
	claimed: boolean;
	completed: boolean;
}

export interface BattlePassReward {
	id: string;
	level: number;
	requiredPoints: number;
	type: 'cash' | 'case';
	cash?: number;
	cases?: number;
	unlocked: boolean;
	claimed: boolean;
}

export interface BattlePassPlayer {
	characterId: number;
	name: string;
	points: number;
}

interface BattlePassData {
	season: string;
	points: number;
	onlineMinutes: number;
	premiumEnabled: boolean;
	premiumPoints: number;
	premiumCases: number;
	premiumPrice: number;
	tasks: BattlePassTask[];
	premiumTasks: BattlePassTask[];
	rewards: BattlePassReward[];
	premiumRewards: BattlePassReward[];
	leaderboard: BattlePassPlayer[];
	rank: number;
}

interface BattlePassState extends BattlePassData {
	show: boolean;
	enable: boolean;
	tab: BattlePassTab;
	loading: boolean;
	error: string;
	casePrize: number | null;
	caseOpening: boolean;
}

const emptyData: BattlePassData = {
	season: 'Сезон 01',
	points: 0,
	onlineMinutes: 0,
	premiumEnabled: false,
	premiumPoints: 0,
	premiumCases: 0,
	premiumPrice: 500,
	tasks: [],
	premiumTasks: [],
	rewards: [],
	premiumRewards: [],
	leaderboard: [],
	rank: 0,
};

export const useBattlePassStore = create<BattlePassState>(() => ({
	...emptyData,
	show: false,
	enable: false,
	tab: 'tasks',
	loading: false,
	error: '',
	casePrize: null,
	caseOpening: false,
}));

function busy(name: 'add' | 'remove') {
	const manager = (window as any).busy;
	if (manager && typeof manager[name] === 'function') {
		manager[name]('battlePass', true, true);
	}
}

export function setBattlePassEnable(enable: boolean) {
	useBattlePassStore.setState({ enable: !!enable });
}

export function setBattlePassShow(show: boolean) {
	const state = useBattlePassStore.getState();
	const next = !!show;
	if (state.show === next) return;

	useBattlePassStore.setState({
		show: next,
		loading: next,
		error: '',
	});
	busy(next ? 'add' : 'remove');

	if (next) {
		mp.trigger('callRemote', 'battlePass.request');
	}
}

export function toggleBattlePass() {
	setBattlePassShow(!useBattlePassStore.getState().show);
}

export function setBattlePassData(data: BattlePassData | string) {
	const parsed = typeof data === 'string' ? JSON.parse(data) : data;
	if (!parsed || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.rewards)) {
		throw new Error('Некорректные данные боевого пропуска');
	}
	useBattlePassStore.setState({
		...emptyData,
		...parsed,
		show: true,
		loading: false,
		error: '',
	});
}

export function setBattlePassOnlineMinutes(minutes: number) {
	const next = Number(minutes);
	if (!Number.isFinite(next)) return;
	useBattlePassStore.setState(state => ({
		onlineMinutes: next,
		tasks: state.tasks.map(task => {
			if (task.metric !== 'onlineMinutes') return task;
			const progress = Math.min(next, task.target);
			return {
				...task,
				progress: progress,
				completed: progress >= task.target,
			};
		}),
		premiumTasks: state.premiumTasks.map(task => {
			if (task.metric !== 'onlineMinutes') return task;
			const progress = Math.min(next, task.target);
			return {
				...task,
				progress: progress,
				completed: progress >= task.target,
			};
		}),
	}));
}

export function setBattlePassTaskProgress(metric: 'cashSpent' | 'drivenMeters', value: number) {
	const next = Number(value);
	if (!Number.isFinite(next) || next < 0) return;
	useBattlePassStore.setState(state => {
		const updateTasks = (tasks: BattlePassTask[]) => tasks.map(task => {
			if (task.metric !== metric) return task;
			const progress = Math.min(next, task.target);
			return {
				...task,
				progress,
				completed: progress >= task.target,
			};
		});
		return {
			tasks: updateTasks(state.tasks),
			premiumTasks: updateTasks(state.premiumTasks),
		};
	});
}

export function setBattlePassError(message: string) {
	useBattlePassStore.setState({ loading: false, error: message, caseOpening: false });
}

export function setBattlePassTab(tab: BattlePassTab) {
	useBattlePassStore.setState({ tab: tab });
}

export function claimBattlePassTask(taskId: string) {
	mp.trigger('callRemote', 'battlePass.task.claim', taskId);
}

export function claimBattlePassReward(rewardId: string) {
	mp.trigger('callRemote', 'battlePass.reward.claim', rewardId);
}

export function purchaseBattlePassPremium() {
	mp.trigger('callRemote', 'battlePass.premium.purchase');
}

export function claimBattlePassPremiumTask(taskId: string) {
	mp.trigger('callRemote', 'battlePass.premium.task.claim', taskId);
}

export function claimBattlePassPremiumReward(rewardId: string) {
	mp.trigger('callRemote', 'battlePass.premium.reward.claim', rewardId);
}

export function openBattlePassCase() {
	if (useBattlePassStore.getState().caseOpening) return;
	useBattlePassStore.setState({ caseOpening: true, casePrize: null, error: '' });
	mp.trigger('callRemote', 'battlePass.case.open');
}

export function setBattlePassCasePrize(prize: number) {
	const next = Number(prize);
	if (!Number.isFinite(next) || next <= 0) return;
	useBattlePassStore.setState({ casePrize: next, caseOpening: false });
}

export function closeBattlePassCaseResult() {
	useBattlePassStore.setState({ casePrize: null });
}

export function initBattlePassBridge() {
	if (typeof window === 'undefined') return;

	const target = (window as any).battlePass || {};
	Object.defineProperty(target, 'show', {
		configurable: true,
		enumerable: true,
		get: () => useBattlePassStore.getState().show,
		set: (value: boolean) => setBattlePassShow(!!value),
	});
	Object.defineProperty(target, 'enable', {
		configurable: true,
		enumerable: true,
		get: () => useBattlePassStore.getState().enable,
		set: (value: boolean) => setBattlePassEnable(!!value),
	});
	target.setEnabled = setBattlePassEnable;
	target.setData = setBattlePassData;
	target.setOnlineMinutes = setBattlePassOnlineMinutes;
	target.setTaskProgress = setBattlePassTaskProgress;
	target.setError = setBattlePassError;
	target.setCasePrize = setBattlePassCasePrize;
	target.toggle = toggleBattlePass;
	(window as any).battlePass = target;
}
