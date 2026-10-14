import { create } from 'zustand';

export interface TerminalMessage {
	type: string;
	text: string;
}

export interface TerminalPos {
	x: number;
	y: number;
}

interface TerminalState {
	show: boolean;
	enable: boolean;
	messages: TerminalMessage[];
	savedCmds: string[];
	savedCmdI: number;
	inputText: string;
	pos: TerminalPos;
}

const MAX_COUNT = 50;
const MAX_CMDS = 50;

export const useTerminalStore = create<TerminalState>(() => ({
	show: false,
	enable: false,
	messages: [],
	savedCmds: [],
	savedCmdI: -1,
	inputText: '',
	pos: {
		x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
		y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
	},
}));

let synced = false;
const dragging = {
	active: false,
	offsetX: 0,
	offsetY: 0,
};

function busyAdd() {
	const busy = (window as any).busy;
	if (busy && busy.add) busy.add('terminal', true, true);
}

function busyRemove() {
	const busy = (window as any).busy;
	if (busy && busy.remove) busy.remove('terminal', true);
}

export function setTerminalShow(val: boolean) {
	const show = !!val;
	const prev = useTerminalStore.getState().show;
	if (prev === show) return;
	useTerminalStore.setState({ show: show, inputText: show ? '' : useTerminalStore.getState().inputText });
	if (show) busyAdd();
	else busyRemove();
}

export function setTerminalEnable(val: boolean) {
	const enable = !!val;
	useTerminalStore.setState({ enable: enable });
	if (!enable) setTerminalShow(false);
}

export function setTerminalInput(text: string) {
	useTerminalStore.setState({ inputText: text });
}

export function pushTerminal(type: string, text: any) {
	const value = typeof text == 'object' ? JSON.stringify(text) : String(text);
	const messages = useTerminalStore.getState().messages.concat([{ type: type, text: value }]);
	if (messages.length > MAX_COUNT) messages.shift();
	useTerminalStore.setState({ messages: messages });
}

export function debugTerminal(text: any) {
	pushTerminal('debug', text);
}

export function initSavedCmds(cmds: any) {
	let list = cmds;
	if (typeof list == 'string') list = JSON.parse(list);
	useTerminalStore.setState({ savedCmds: list || [] });
}

export function onHeaderMouseDown(pageX: number, pageY: number) {
	const pos = useTerminalStore.getState().pos;
	dragging.active = true;
	dragging.offsetX = pageX - pos.x;
	dragging.offsetY = pageY - pos.y;
}

export function onInputEnter() {
	const text = useTerminalStore.getState().inputText;
	if (!text) setTerminalShow(false);
	else {
		const values = text.split(' ');
		mp.trigger('callRemote', 'terminal.command.handle', JSON.stringify(values));
		const saved = [text].concat(useTerminalStore.getState().savedCmds);
		if (saved.length > MAX_CMDS) saved.pop();
		useTerminalStore.setState({ savedCmds: saved, inputText: '' });
		mp.trigger('terminal.saveCmd', JSON.stringify(text).slice(1, -1));
	}
	useTerminalStore.setState({ savedCmdI: -1 });
}

export function onInputUp() {
	const state = useTerminalStore.getState();
	if (state.savedCmdI >= state.savedCmds.length - 1) return;
	const savedCmdI = state.savedCmdI + 1;
	useTerminalStore.setState({
		savedCmdI: savedCmdI,
		inputText: state.savedCmds[savedCmdI],
	});
}

export function onInputDown() {
	const state = useTerminalStore.getState();
	if (state.savedCmdI <= 0) {
		if (state.savedCmdI == 0) {
			useTerminalStore.setState({ savedCmdI: state.savedCmdI - 1, inputText: '' });
		} else {
			useTerminalStore.setState({ inputText: '' });
		}
		return;
	}
	const savedCmdI = state.savedCmdI - 1;
	useTerminalStore.setState({
		savedCmdI: savedCmdI,
		inputText: state.savedCmds[savedCmdI],
	});
}

export function initTerminalLegacyBridge() {
	if (typeof window === 'undefined' || synced) return;
	synced = true;

	const win = window as any;
	const target = win.terminal || {};

	Object.defineProperty(target, 'show', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useTerminalStore.getState().show;
		},
		set: function (val: boolean) {
			setTerminalShow(!!val);
		},
	});

	Object.defineProperty(target, 'enable', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useTerminalStore.getState().enable;
		},
		set: function (val: boolean) {
			setTerminalEnable(!!val);
		},
	});

	target.push = pushTerminal;
	target.debug = debugTerminal;
	target.initSavedCmds = initSavedCmds;
	win.terminal = target;

	window.addEventListener('keyup', function (e) {
		const busy = (window as any).busy;
		if (busy && busy.includes && busy.includes(['chat'])) return;
		if ((e.keyCode == 192 || e.keyCode == 1040) && useTerminalStore.getState().enable) {
			setTerminalShow(!useTerminalStore.getState().show);
		}
	});

	window.addEventListener('mousemove', function (e) {
		if (!dragging.active) return;
		useTerminalStore.setState({
			pos: {
				x: e.pageX - dragging.offsetX,
				y: e.pageY - dragging.offsetY,
			},
		});
	});

	window.addEventListener('mouseup', function () {
		dragging.active = false;
		dragging.offsetX = 0;
		dragging.offsetY = 0;
	});
}
