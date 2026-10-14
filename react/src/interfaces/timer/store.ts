import { create } from 'zustand';

export interface TimerInfo {
	icon: string;
	text: string;
}

export interface TimerState {
	show: boolean;
	timer: TimerInfo | null;
	allTime: number;
	time: number;
}

const TIMERS: Record<string, TimerInfo> = {
	death: {
		icon: 'death.svg',
		text: 'До смерти осталось',
	},
};

export const useTimerStore = create<TimerState>(() => ({
	show: false,
	timer: null,
	allTime: 0,
	time: 0,
}));

let updateTimer: number | null = null;

function busyAdd() {
	const busy = (window as any).busy;
	if (busy) {
		busy.add('timer', false, true);
	}
}

function busyRemove() {
	const busy = (window as any).busy;
	if (busy) {
		busy.remove('timer', true);
	}
}

export function stopTimer() {
	if (updateTimer !== null) {
		window.clearInterval(updateTimer);
		updateTimer = null;
	}
	const hadTimer = useTimerStore.getState().timer != null;
	useTimerStore.setState({
		show: false,
		timer: null,
	});
	if (hadTimer) {
		busyRemove();
	}
}

export function startTimer(name: string, time: number) {
	if (!TIMERS[name]) {
		return;
	}

	const nextTime = Number(time) || 0;
	useTimerStore.setState({
		show: true,
		time: nextTime,
		allTime: nextTime,
		timer: TIMERS[name],
	});
	busyAdd();

	if (updateTimer !== null) {
		window.clearInterval(updateTimer);
	}

	updateTimer = window.setInterval(function () {
		const next = useTimerStore.getState().time - 1000;
		if (next < 0) {
			stopTimer();
			return;
		}
		useTimerStore.setState({ time: next });
	}, 1000);
}

export function initTimerLegacyBridge() {
	if (typeof window === 'undefined') {
		return;
	}

	const win = window as any;
	const target = win.timer || {};

	target.start = startTimer;
	target.stop = stopTimer;

	Object.defineProperty(target, 'timer', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useTimerStore.getState().timer;
		},
	});

	Object.defineProperty(target, 'time', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useTimerStore.getState().time;
		},
	});

	Object.defineProperty(target, 'allTime', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useTimerStore.getState().allTime;
		},
	});

	Object.defineProperty(target, 'width', {
		configurable: true,
		enumerable: true,
		get: function () {
			const state = useTimerStore.getState();
			return (state.time / state.allTime) * 100;
		},
	});

	win.timer = target;
}
