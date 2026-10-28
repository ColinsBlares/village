import { dropIncoming } from './phoneApp/store';
import { gameTrigger } from './game';
import {
	DOCK_ENTER,
	DOCK_LEAVE,
	compactDock,
	dragBoard,
	iconOrigin,
	initialDock,
	initialHome,
	insertApp,
	moveToPage,
	pageCount,
	PAGE_W,
	pointerCenter,
	readSlot,
	removePiece,
	settlePages,
	catalog,
	ICON,
	CELL_W,
	type DragPos,
	type Placement,
} from './grid';
import { create } from 'zustand';

export type PhonePhase = 'lock' | 'unlocking' | 'home' | 'locking';
export type PhoneShell = 'in' | 'peek' | 'leaving' | 'off';
export type PhoneFace = 'full' | 'peek' | 'call';

export const APP_LOAD_MS = 2000;

export interface PhoneNotice {
	id: string;
	appId: string;
	title: string;
	text: string;
	time: string;
}

export interface PhoneOsState {
	show: boolean;
	shell: PhoneShell;
	face: PhoneFace;
	phase: PhonePhase;
	time: string;
	dateLine: string;
	flashlight: boolean;
	appId: string | null;
	appClosing: boolean;
	appReady: boolean;
	homeReveal: boolean;
	editing: boolean;
	theme: 'dark' | 'light';
	homePage: number;
	pageOffset: number;
	pageAnim: boolean;
	running: string[];
	switcher: boolean;
	notices: PhoneNotice[];
	bannerId: string | null;
	shade: number;
	shadeDrag: boolean;
	home: Placement[];
	dock: (string | null)[];
	drag: DragPos | null;
}

const weekdays = [
	'Воскресенье',
	'Понедельник',
	'Вторник',
	'Среда',
	'Четверг',
	'Пятница',
	'Суббота',
];
const months = [
	'января',
	'февраля',
	'марта',
	'апреля',
	'мая',
	'июня',
	'июля',
	'августа',
	'сентября',
	'октября',
	'ноября',
	'декабря',
];

function moscowParts(date = new Date()) {
	const wall = new Date(
		date.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }),
	);
	const hours = String(wall.getHours()).padStart(2, '0');
	const minutes = String(wall.getMinutes()).padStart(2, '0');

	return {
		time: hours + ':' + minutes,
		dateLine:
			weekdays[wall.getDay()] +
			', ' +
			wall.getDate() +
			' ' +
			months[wall.getMonth()],
	};
}

const clock = moscowParts();

const seedNotices: PhoneNotice[] = [
	{
		id: 'n1',
		appId: 'messages',
		title: 'Семья',
		text: 'Ок, еду',
		time: '18:12',
	},
	{
		id: 'n2',
		appId: 'bank',
		title: 'Банк',
		text: 'Перевод получен',
		time: '17:40',
	},
	{
		id: 'n3',
		appId: 'taxi',
		title: 'Такси',
		text: 'Машина подана',
		time: '17:02',
	},
];

export const usePhoneOsStore = create<PhoneOsState>(() => ({
	show: false,
	shell: 'off',
	face: 'full',
	phase: 'lock',
	time: clock.time,
	dateLine: clock.dateLine,
	flashlight: false,
	appId: null,
	appClosing: false,
	appReady: false,
	homeReveal: false,
	editing: false,
	theme: 'dark',
	homePage: 0,
	pageOffset: 0,
	pageAnim: false,
	running: [],
	switcher: false,
	notices: seedNotices,
	bannerId: null,
	shade: 0,
	shadeDrag: false,
	home: initialHome,
	dock: initialDock,
	drag: null,
}));

let clockTimer = 0;
let phaseTimer = 0;
let appTimer = 0;
let loadTimer = 0;
let revealTimer = 0;
let bannerTimer = 0;
let shellTimer = 0;
let pendingApp: string | null = null;
let announced = false;
let edgeTimer = 0;
let edgeDir = 0;

function clearAppTimers() {
	window.clearTimeout(appTimer);
	window.clearTimeout(loadTimer);
	window.clearTimeout(revealTimer);
	window.clearTimeout(bannerTimer);
}

function tickClock() {
	const next = moscowParts();
	const current = usePhoneOsStore.getState();
	if (current.time === next.time && current.dateLine === next.dateLine) {
		return;
	}
	usePhoneOsStore.setState(next);
}

export function startPhoneClock() {
	tickClock();
	if (clockTimer) {
		return;
	}
	clockTimer = window.setInterval(tickClock, 1000);
}

export function toggleFlashlight() {
	const state = usePhoneOsStore.getState();
	if (state.phase !== 'lock') {
		return;
	}
	usePhoneOsStore.setState({ flashlight: !state.flashlight });
}

export function unlockPhone(appId?: string) {
	const { phase } = usePhoneOsStore.getState();
	if (phase !== 'lock') {
		return;
	}
	pendingApp = appId || null;
	window.clearTimeout(phaseTimer);
	usePhoneOsStore.setState({ phase: 'unlocking' });
	phaseTimer = window.setTimeout(function () {
		const nextApp = pendingApp;
		pendingApp = null;
		usePhoneOsStore.setState({
			phase: 'home',
			flashlight: false,
			appClosing: false,
			appId: null,
			appReady: false,
		});
		if (nextApp) {
			openApp(nextApp);
			return;
		}
		if (!announced) {
			announced = true;
			bannerTimer = window.setTimeout(function () {
				pushNotice({
					id: 'n4',
					appId: 'news',
					title: 'Новости',
					text: 'Набережная открыта',
					time: 'сейчас',
				});
			}, 700);
		}
	}, 620);
}

export function lockPhone() {
	const { phase } = usePhoneOsStore.getState();
	if (phase === 'lock' || phase === 'unlocking' || phase === 'locking') {
		return;
	}
	pendingApp = null;
	window.clearTimeout(phaseTimer);
	clearAppTimers();
	usePhoneOsStore.setState({
		phase: 'locking',
		appId: null,
		appClosing: false,
		appReady: false,
		homeReveal: false,
		editing: false,
		drag: null,
		switcher: false,
		shade: 0,
		shadeDrag: false,
		bannerId: null,
	});
	phaseTimer = window.setTimeout(function () {
		usePhoneOsStore.setState({ phase: 'lock', flashlight: false });
	}, 520);
}

export function openApp(id: string) {
	clearAppTimers();
	const state = usePhoneOsStore.getState();
	const warm = state.running.indexOf(id) >= 0;
	const running = [id].concat(
		state.running.filter(function (item) {
			return item !== id;
		}),
	);
	usePhoneOsStore.setState({
		appId: id,
		appClosing: false,
		appReady: warm,
		homeReveal: false,
		editing: false,
		drag: null,
		switcher: false,
		running: running,
	});
	if (warm) {
		return;
	}
	loadTimer = window.setTimeout(function () {
		if (usePhoneOsStore.getState().appId === id) {
			usePhoneOsStore.setState({ appReady: true });
		}
	}, APP_LOAD_MS);
}

function playHomeReveal() {
	const replay = usePhoneOsStore.getState().homeReveal;
	window.clearTimeout(revealTimer);
	if (replay) {
		usePhoneOsStore.setState({ homeReveal: false });
		window.requestAnimationFrame(function () {
			usePhoneOsStore.setState({ homeReveal: true });
			revealTimer = window.setTimeout(function () {
				usePhoneOsStore.setState({ homeReveal: false });
			}, 650);
		});
		return;
	}
	usePhoneOsStore.setState({ homeReveal: true });
	revealTimer = window.setTimeout(function () {
		usePhoneOsStore.setState({ homeReveal: false });
	}, 650);
}

export function closeApp() {
	const { appId } = usePhoneOsStore.getState();
	if (!appId) {
		return;
	}
	window.clearTimeout(loadTimer);
	window.clearTimeout(appTimer);
	usePhoneOsStore.setState({
		appId: null,
		appClosing: false,
		appReady: false,
		editing: false,
		drag: null,
	});
	playHomeReveal();
}

function pieceWidth(key: string) {
	const piece = catalog[key];
	if (!piece || piece.kind === 'app') {
		return ICON;
	}
	return (piece.spanX - 1) * CELL_W + ICON;
}

function clearEdge() {
	window.clearTimeout(edgeTimer);
	edgeTimer = 0;
	edgeDir = 0;
}

export function turnDragPage(dir: number) {
	const state = usePhoneOsStore.getState();
	const drag = state.drag;
	if (!drag || drag.settle || dir === 0) {
		return;
	}
	const fromDock = state.dock.indexOf(drag.key) >= 0;
	const count = pageCount(state.home);
	let next = state.homePage + dir;
	if (next < 0) {
		return;
	}
	if (fromDock) {
		if (next > count - 1) {
			return;
		}
		usePhoneOsStore.setState({
			homePage: next,
			pageOffset: -next * PAGE_W,
			pageAnim: true,
		});
		return;
	}
	if (next > count) {
		return;
	}
	const home = moveToPage(state.home, drag.key, next);
	if (!home) {
		return;
	}
	const place = home.find(function (item) {
		return item.key === drag.key;
	});
	const page = place ? place.page || 0 : state.homePage;
	usePhoneOsStore.setState({
		home: home,
		homePage: page,
		pageOffset: -page * PAGE_W,
		pageAnim: true,
	});
}

function watchEdge(left: number, right: number, zone: 'home' | 'dock') {
	if (zone === 'dock') {
		clearEdge();
		return;
	}
	const dir = right > PAGE_W - 16 ? 1 : left < 16 ? -1 : 0;
	if (dir === 0) {
		clearEdge();
		return;
	}
	if (dir === edgeDir) {
		return;
	}
	clearEdge();
	edgeDir = dir;
	edgeTimer = window.setTimeout(function () {
		edgeDir = 0;
		edgeTimer = 0;
		turnDragPage(dir);
	}, 420);
}

export function startDrag(key: string) {
	const state = usePhoneOsStore.getState();
	if (state.drag) {
		return;
	}
	const slot = readSlot(state.home, state.dock, null, key);
	if (!slot) {
		return;
	}
	const docked = state.dock.indexOf(key) >= 0;
	const origin = iconOrigin(key, slot, docked);
	usePhoneOsStore.setState({
		editing: true,
		drag: {
			key: key,
			x: origin.x,
			y: origin.y,
			zone: docked ? 'dock' : 'home',
		},
	});
}

export function moveDrag(x: number, y: number) {
	const state = usePhoneOsStore.getState();
	const drag = state.drag;
	if (!drag || drag.settle) {
		return;
	}
	const center = pointerCenter(drag.key, x, y);
	let zone = drag.zone;
	if (zone !== 'dock' && center.y >= DOCK_ENTER) {
		zone = 'dock';
	} else if (zone === 'dock' && center.y <= DOCK_LEAVE) {
		zone = 'home';
	}
	const width = pieceWidth(drag.key);
	watchEdge(x, x + width, zone);
	const board = dragBoard(
		{ home: state.home, dock: state.dock },
		drag.key,
		x,
		y,
		center.x,
		center.y,
		zone,
		state.homePage,
	);
	if (
		board.home === state.home &&
		board.dock === state.dock &&
		drag.x === x &&
		drag.y === y &&
		drag.zone === zone
	) {
		return;
	}
	usePhoneOsStore.setState({
		home: board.home,
		dock: board.dock,
		drag: { key: drag.key, x: x, y: y, zone: zone },
	});
}

export function dropDrag() {
	const state = usePhoneOsStore.getState();
	if (!state.drag || state.drag.settle) {
		return;
	}
	clearEdge();
	const dock = compactDock(state.dock);
	const settled = settlePages(state.home, state.homePage);
	usePhoneOsStore.setState({
		home: settled.home,
		homePage: settled.homePage,
		pageOffset: -settled.homePage * PAGE_W,
		pageAnim: true,
		dock: dock,
		drag: {
			key: state.drag.key,
			x: state.drag.x,
			y: state.drag.y,
			zone: state.drag.zone,
			settle: true,
		},
	});
	window.requestAnimationFrame(function () {
		const current = usePhoneOsStore.getState().drag;
		if (current && current.settle) {
			usePhoneOsStore.setState({ drag: null });
		}
	});
}

export function removeItem(key: string) {
	const state = usePhoneOsStore.getState();
	const board = removePiece({ home: state.home, dock: state.dock }, key);
	const count = pageCount(board.home);
	const nextPage =
		state.homePage >= count ? Math.max(0, count - 1) : state.homePage;
	usePhoneOsStore.setState({
		home: board.home,
		dock: board.dock,
		homePage: nextPage,
		pageOffset: -nextPage * PAGE_W,
		pageAnim: true,
		drag: state.drag && state.drag.key === key ? null : state.drag,
	});
}

export function setHomePage(page: number) {
	const state = usePhoneOsStore.getState();
	const count = pageCount(state.home);
	const next = Math.max(0, Math.min(count - 1, page));
	const offset = -next * PAGE_W;
	if (next === state.homePage && state.pageOffset === offset) {
		return;
	}
	usePhoneOsStore.setState({
		homePage: next,
		pageOffset: offset,
		pageAnim: true,
	});
}

export function movePager(offset: number, anim: boolean) {
	usePhoneOsStore.setState({ pageOffset: offset, pageAnim: anim });
}

export function openSwitcher() {
	const state = usePhoneOsStore.getState();
	if (
		state.phase === 'lock' ||
		state.phase === 'locking' ||
		state.phase === 'unlocking'
	) {
		return;
	}
	usePhoneOsStore.setState({ switcher: true, editing: false, drag: null });
}

export function closeSwitcher() {
	usePhoneOsStore.setState({ switcher: false });
}

export function dismissRunning(id: string) {
	const state = usePhoneOsStore.getState();
	const running = state.running.filter(function (item) {
		return item !== id;
	});
	if (state.appId !== id) {
		usePhoneOsStore.setState({ running: running });
		return;
	}
	window.clearTimeout(loadTimer);
	usePhoneOsStore.setState({
		running: running,
		appId: null,
		appReady: false,
		appClosing: false,
	});
}

function finishShell() {
	const state = usePhoneOsStore.getState();
	if (state.show || state.shell !== 'leaving') {
		return;
	}
	window.clearTimeout(phaseTimer);
	clearAppTimers();
	pendingApp = null;
	usePhoneOsStore.setState({
		shell: 'off',
		face: 'full',
		phase: 'lock',
		appId: null,
		appClosing: false,
		appReady: false,
		homeReveal: false,
		editing: false,
		drag: null,
		flashlight: false,
		switcher: false,
		shade: 0,
		shadeDrag: false,
		bannerId: null,
	});
}

export function beginCallPeek() {
	window.clearTimeout(shellTimer);
	window.clearTimeout(bannerTimer);
	usePhoneOsStore.setState({
		show: false,
		shell: 'peek',
		face: 'call',
		bannerId: null,
		switcher: false,
		shade: 0,
		shadeDrag: false,
	});
}

export function dismissCallPeek() {
	const state = usePhoneOsStore.getState();
	if (state.face !== 'call') {
		return;
	}
	if (state.show) {
		usePhoneOsStore.setState({ face: 'full' });
		return;
	}
	beginLeave();
}

export function revealOnto(id: string) {
	window.clearTimeout(shellTimer);
	const state = usePhoneOsStore.getState();
	const running = [id].concat(state.running.filter(function (item) {
		return item !== id;
	}));
	usePhoneOsStore.setState({
		show: true,
		shell: 'in',
		face: 'full',
		phase: 'home',
		appId: id,
		appReady: true,
		appClosing: false,
		homeReveal: false,
		editing: false,
		drag: null,
		switcher: false,
		shade: 0,
		shadeDrag: false,
		bannerId: null,
		running: running,
	});
}

function beginLeave() {
	const state = usePhoneOsStore.getState();
	if (state.shell === 'off' || state.shell === 'leaving') {
		return;
	}
	window.clearTimeout(shellTimer);
	window.clearTimeout(phaseTimer);
	usePhoneOsStore.setState({
		show: false,
		shell: 'leaving',
		editing: false,
		drag: null,
	});
	shellTimer = window.setTimeout(finishShell, 700);
}

export function pushNotice(notice: PhoneNotice) {
	const state = usePhoneOsStore.getState();
	const notices = [notice].concat(
		state.notices.filter(function (item) {
			return item.id !== notice.id;
		}),
	);
	window.clearTimeout(bannerTimer);
	if (!state.show) {
		window.clearTimeout(shellTimer);
		if (state.face === 'call') {
			usePhoneOsStore.setState({ notices: notices, bannerId: notice.id });
		} else {
			usePhoneOsStore.setState({
				notices: notices,
				bannerId: notice.id,
				show: false,
				shell: 'peek',
				face: 'peek',
			});
		}
	} else {
		usePhoneOsStore.setState({ notices: notices, bannerId: notice.id });
	}
	bannerTimer = window.setTimeout(function () {
		if (usePhoneOsStore.getState().bannerId === notice.id) {
			dismissBanner();
		}
	}, 3400);
}

export function dismissBanner() {
	window.clearTimeout(bannerTimer);
	const state = usePhoneOsStore.getState();
	const peek = !state.show && state.shell === 'peek' && state.face === 'peek';
	usePhoneOsStore.setState({ bannerId: null });
	if (peek) {
		beginLeave();
	}
}

export function dismissNotice(id: string) {
	const state = usePhoneOsStore.getState();
	const banner = state.bannerId === id;
	usePhoneOsStore.setState({
		notices: state.notices.filter(function (item) {
			return item.id !== id;
		}),
		bannerId: banner ? null : state.bannerId,
	});
	if (banner && !state.show && state.shell === 'peek') {
		beginLeave();
	}
}

export function pullShade(value: number, drag: boolean) {
	const next = Math.max(0, Math.min(1, value));
	usePhoneOsStore.setState({
		shade: next,
		shadeDrag: drag,
		bannerId: drag ? null : usePhoneOsStore.getState().bannerId,
	});
}

export function releaseShade(value: number) {
	usePhoneOsStore.setState({
		shade: value > 0.34 ? 1 : 0,
		shadeDrag: false,
	});
}

export function installApp(key: string) {
	const state = usePhoneOsStore.getState();
	if (
		state.home.some(function (place) {
			return place.key === key;
		}) ||
		state.dock.indexOf(key) >= 0
	) {
		return;
	}
	usePhoneOsStore.setState({ home: insertApp(state.home, key) });
}

export function togglePhoneTheme() {
	const theme = usePhoneOsStore.getState().theme;
	usePhoneOsStore.setState({ theme: theme === 'dark' ? 'light' : 'dark' });
}

export function exitEdit() {
	const state = usePhoneOsStore.getState();
	if (!state.editing && !state.drag) {
		return;
	}
	usePhoneOsStore.setState({
		editing: false,
		drag: null,
		dock: compactDock(state.dock),
	});
}

export function setPhoneOsVisible(flag: boolean) {
	const next = !!flag;
	const state = usePhoneOsStore.getState();
	if (state.show === next) {
		return;
	}
	window.clearTimeout(shellTimer);
	if (!next) {
		if (state.face === 'call') {
			dropIncoming();
			gameTrigger('phone.call.in.ans', 0);
		}
		beginLeave();
		return;
	}
	if (state.face === 'call') {
		revealOnto('phone');
		return;
	}
	window.clearTimeout(phaseTimer);
	clearAppTimers();
	pendingApp = null;
	usePhoneOsStore.setState({
		show: true,
		shell: 'in',
		face: 'full',
		phase: 'lock',
		appId: null,
		appClosing: false,
		appReady: false,
		homeReveal: false,
		editing: false,
		drag: null,
		flashlight: false,
		switcher: false,
		shade: 0,
		shadeDrag: false,
		bannerId: null,
	});
}

export function initPhoneOsBridge() {
	if (typeof window === 'undefined') {
		return;
	}

	startPhoneClock();

	const win = window as any;
	const target = win.phoneOs || {};

	Object.defineProperty(target, 'show', {
		configurable: true,
		enumerable: true,
		get() {
			return usePhoneOsStore.getState().show;
		},
		set(val: boolean) {
			setPhoneOsVisible(val);
		},
	});

	Object.defineProperty(target, 'shell', {
		configurable: true,
		enumerable: true,
		get() {
			return usePhoneOsStore.getState().shell;
		},
	});

	target.lock = lockPhone;
	target.unlock = unlockPhone;
	target.pushNotice = pushNotice;
	win.phoneOs = target;

	if (import.meta.env.DEV && window.location.search.indexOf('phoneOs') !== -1) {
		setPhoneOsVisible(true);
	}
}
