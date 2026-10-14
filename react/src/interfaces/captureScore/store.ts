import { create } from 'zustand';

export const CAPTURE_COLORS: Record<number, string> = {
	1: '#e13b3b',
	2: '#00b500',
	8: '#00b500',
	9: '#da30ff',
	10: '#fff629',
	11: '#4a97d1',
	12: '#a7ff50',
	13: '#cbae8c',
	14: '#0b0b0b',
};

export const CAPTURE_NAMES: Record<number, string> = {
	1: 'Attack Army',
	2: 'Defense Army',
	8: 'The Families',
	9: 'The Ballas',
	10: 'Los Santos Vagos',
	11: 'Marabunta Grande',
	12: 'Russian Mafia',
	13: 'La Cosa Nostra',
	14: 'Triads',
};

interface CaptureScoreState {
	show: boolean;
	leftBandId: number;
	rightBandId: number;
	leftScore: number;
	rightScore: number;
	time: number;
	offerOpen: boolean;
}

export const useCaptureScoreStore = create<CaptureScoreState>(() => ({
	show: false,
	leftBandId: 8,
	rightBandId: 9,
	leftScore: 94,
	rightScore: 42,
	time: 90,
	offerOpen: false,
}));

let timer: number | null = null;
let synced = false;

function clearTimer() {
	if (timer !== null) {
		window.clearInterval(timer);
		timer = null;
	}
}

function clearKillList() {
	const killList = (window as any).killList;
	if (killList) {
		killList.list = [];
	}
}

export function formatCaptureTime(time: number) {
	let minutes: string | number = parseInt(String(time / 60), 10);
	let seconds: string | number = parseInt(String(time % 60), 10);
	if (minutes < 10) minutes = '0' + minutes;
	if (seconds < 10) seconds = '0' + seconds;
	return minutes + ':' + seconds;
}

export function captureProgress(leftScore: number, rightScore: number) {
	const max = leftScore + rightScore;
	if (max == 0) return 50;
	return (leftScore / max) * 100;
}

export function setCaptureShow(val: boolean) {
	const show = !!val;
	const prev = useCaptureScoreStore.getState().show;
	if (prev === show) return;
	useCaptureScoreStore.setState({ show: show });
	if (!show) {
		clearKillList();
		clearTimer();
	}
}

function startTimer() {
	clearTimer();
	timer = window.setInterval(function () {
		const next = useCaptureScoreStore.getState().time - 1;
		if (next < 0) {
			setCaptureShow(false);
			return;
		}
		useCaptureScoreStore.setState({ time: next });
	}, 1000);
}

export function startCapture(
	bandA: number,
	bandB: number,
	time: number,
	leftScore?: number,
	rightScore?: number,
) {
	useCaptureScoreStore.setState({
		leftBandId: bandA,
		rightBandId: bandB,
		leftScore: leftScore == null ? 0 : leftScore,
		rightScore: rightScore == null ? 0 : rightScore,
		time: time,
		show: true,
	});
	startTimer();
}

export function setCaptureScore(bandId: number, score: number) {
	const state = useCaptureScoreStore.getState();
	if (state.leftBandId == bandId) {
		useCaptureScoreStore.setState({ leftScore: score });
	} else if (state.rightBandId == bandId) {
		useCaptureScoreStore.setState({ rightScore: score });
	}
}

function syncOfferDialog() {
	const offerDialog = (window as any).offerDialog;
	const offerOpen = !!(offerDialog && offerDialog.dialog);
	if (useCaptureScoreStore.getState().offerOpen !== offerOpen) {
		useCaptureScoreStore.setState({ offerOpen: offerOpen });
	}
}

export function initCaptureScoreLegacyBridge() {
	if (typeof window === 'undefined' || synced) return;
	synced = true;

	const win = window as any;
	const target = win.captureScore || {};

	Object.defineProperty(target, 'show', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useCaptureScoreStore.getState().show;
		},
		set: function (val: boolean) {
			setCaptureShow(!!val);
		},
	});

	target.start = startCapture;
	target.setScore = setCaptureScore;
	win.captureScore = target;

	syncOfferDialog();
	window.setInterval(syncOfferDialog, 300);
}
