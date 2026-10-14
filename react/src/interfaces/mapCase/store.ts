import { create } from 'zustand';

export interface MapCaseLoad {
	message: string;
	waitingTime: number | undefined;
	loadCount: number;
}

export interface MapCasePopup {
	message: string;
	img: string;
}

export interface MapCaseVerification {
	message: string;
	accept: () => void;
}

export interface MapCaseState {
	type: string;
	show: boolean;
	enable: boolean;
	inputFocus: boolean;
	userName: string;
	popupMessage: MapCasePopup | null;
	menuFocus: string;
	time: string;
	currentOverWindow: string | null;
	overKey: number;
	loadMod: MapCaseLoad | null;
	verification: MapCaseVerification | null;
	tick: number;
}

export const useMapCaseStore = create<MapCaseState>(() => ({
	type: '',
	show: false,
	enable: false,
	inputFocus: false,
	userName: '',
	popupMessage: null,
	menuFocus: '',
	time: '00:12',
	currentOverWindow: null,
	overKey: 0,
	loadMod: null,
	verification: null,
	tick: 0,
}));

let loadInterval: number | null = null;
let timerId: number | null = null;
let lastShowTime = 0;

export function bumpMapCase() {
	useMapCaseStore.setState(function (state) {
		return { tick: state.tick + 1 };
	});
}

export function convertToMoscowDate(date: Date) {
	const offsetMs = date.getTimezoneOffset() * 60 * 1000;
	const moscowOffsetMs = 3 * 60 * 60 * 1000;
	return new Date(date.getTime() + offsetMs + moscowOffsetMs);
}

function formatTime() {
	const date = convertToMoscowDate(new Date());
	let hours = String(date.getHours());
	let minutes = String(date.getMinutes());
	if (hours.length < 2) hours = '0' + hours;
	if (minutes.length < 2) minutes = '0' + minutes;
	return hours + ':' + minutes;
}

export function getLastShowTime() {
	return lastShowTime;
}

export function setInputFocus(enable: boolean) {
	useMapCaseStore.setState({ inputFocus: !!enable });
}

export function setMenuFocus(name: string) {
	useMapCaseStore.setState({ menuFocus: name });
}

export function setUserName(name: string) {
	useMapCaseStore.setState({ userName: name || '' });
}

export function setCurrentOverWindow(name: string | null) {
	useMapCaseStore.setState(function (state) {
		return {
			currentOverWindow: name,
			overKey: name ? state.overKey + 1 : state.overKey,
		};
	});
}

export function hideLoad() {
	if (loadInterval !== null) {
		window.clearInterval(loadInterval);
		loadInterval = null;
	}
	useMapCaseStore.setState({ loadMod: null });
}

export function showRedMessage(message: string) {
	hideLoad();
	useMapCaseStore.setState({
		popupMessage: {
			message: message,
			img: 'error',
		},
	});
}

export function showGreenMessage(message: string) {
	hideLoad();
	useMapCaseStore.setState({
		popupMessage: {
			message: message,
			img: 'success',
		},
	});
}

export function hidePopupMessage() {
	useMapCaseStore.setState({ popupMessage: null });
}

export function showVerification(message: string, accept: () => void) {
	useMapCaseStore.setState({
		verification: {
			message: message,
			accept: accept,
		},
	});
}

export function hideVerification() {
	useMapCaseStore.setState({ verification: null });
}

export function showLoad(message?: string, waitingTime?: number) {
	if (loadInterval !== null) {
		window.clearInterval(loadInterval);
		loadInterval = null;
	}

	useMapCaseStore.setState({
		loadMod: {
			message: message || '',
			waitingTime: waitingTime,
			loadCount: 0,
		},
		verification: null,
	});

	loadInterval = window.setInterval(function () {
		const current = useMapCaseStore.getState().loadMod;
		if (!current) return;

		const loadCount = current.loadCount;
		let waiting = current.waitingTime;
		if (loadCount % 2 == 0) {
			waiting = (waiting as number) - 1;
		}

		if ((waiting < 0 || !waiting) && loadCount > 18) {
			hideLoad();
			showRedMessage('Непредвиденная ошибка сервера');
			return;
		}

		useMapCaseStore.setState({
			loadMod: {
				message: current.message,
				waitingTime: waiting,
				loadCount: loadCount + 1,
			},
		});
	}, 500);
}

export function setShow(val: boolean) {
	const show = !!val;
	lastShowTime = Date.now();
	useMapCaseStore.setState({
		show: show,
		time: formatTime(),
	});

	mp.trigger('blur', show, 300);
	mp.trigger('mapCase.animation.show.play', show);

	const win = window as any;
	if (show) {
		if (win.busy) win.busy.add('mapCase', true, true);
	} else if (win.busy) {
		win.busy.remove('mapCase', true);
	}

	if (timerId !== null) {
		window.clearInterval(timerId);
		timerId = null;
	}
	if (!show) return;

	timerId = window.setInterval(function () {
		useMapCaseStore.setState({ time: formatTime() });
	}, 60000);
}

export function setEnable(val: boolean) {
	const enable = !!val;
	useMapCaseStore.setState({ enable: enable });
	if (!enable) setShow(false);
}

export function toggleShow() {
	setShow(!useMapCaseStore.getState().show);
}

export function onTabletKeyUp(event: KeyboardEvent) {
	const win = window as any;
	if (
		win.busy &&
		win.busy.includes([
			'auth',
			'chat',
			'terminal',
			'inventory',
			'playerMenu',
			'phone',
			'inputWindow',
			'jobProcess',
			'timer',
			'playersList',
			'bugTracker',
		])
	) {
		return;
	}
	if (win.selectMenu && win.selectMenu.isEditing) return;
	if (Date.now() - lastShowTime < 500) return;
	const state = useMapCaseStore.getState();
	if (state.inputFocus) return;
	if (event.keyCode == 80 && state.enable) toggleShow();
}
