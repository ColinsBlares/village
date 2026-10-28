import { create } from 'zustand';

export interface NotificationMessage {
	type: string;
	img: string;
	header: string | null;
	text: string;
	hash: number;
	duration: number;
	leaving: boolean;
}

export interface NotificationsState {
	show: boolean;
	messages: NotificationMessage[];
	showTime: number;
	maxCount: number;
}

export const useNotificationsStore = create<NotificationsState>(() => ({
	show: true,
	messages: [],
	showTime: 10000,
	maxCount: 3,
}));

const LEAVE_MS = 460;

let count = 0;
const pending: NotificationMessage[] = [];
const messageTimers: Record<number, number> = {};

function clearTimer(hash: number) {
	if (!messageTimers[hash]) {
		return;
	}
	window.clearTimeout(messageTimers[hash]);
	delete messageTimers[hash];
}

function revealNext() {
	const state = useNotificationsStore.getState();
	const room = state.maxCount - state.messages.length;
	if (room <= 0 || !pending.length) {
		return;
	}

	const next: NotificationMessage[] = [];
	while (next.length < room && pending.length) {
		const item = pending.shift();
		if (item) {
			next.push(item);
		}
	}

	for (let i = 0; i < next.length; i++) {
		arm(next[i]);
	}

	useNotificationsStore.setState({
		messages: state.messages.concat(next),
	});
}

function removeMessage(hash: number) {
	clearTimer(hash);
	const current = useNotificationsStore.getState().messages;
	const messages: NotificationMessage[] = [];
	for (let i = 0; i < current.length; i++) {
		if (current[i].hash !== hash) {
			messages.push(current[i]);
		}
	}
	useNotificationsStore.setState({ messages: messages });
	revealNext();
}

function beginLeave(hash: number) {
	const current = useNotificationsStore.getState().messages;
	let index = -1;
	for (let i = 0; i < current.length; i++) {
		if (current[i].hash === hash) {
			index = i;
			break;
		}
	}
	if (index === -1 || current[index].leaving) {
		return;
	}

	clearTimer(hash);
	const messages = current.slice();
	messages[index] = Object.assign({}, current[index], { leaving: true });
	useNotificationsStore.setState({ messages: messages });
	messageTimers[hash] = window.setTimeout(function () {
		removeMessage(hash);
	}, LEAVE_MS);
}

function arm(message: NotificationMessage) {
	messageTimers[message.hash] = window.setTimeout(function () {
		beginLeave(message.hash);
	}, message.duration);
}

export function pushNotification(type: string, text: string, header?: any) {
	let nextHeader: string | null = header;
	if (header == 'undefined' || header == 'null') {
		nextHeader = null;
	}

	const parts = String(type).split(' ');
	const img = parts.length > 1 ? parts[1] : String(type);
	count += 1;
	const state = useNotificationsStore.getState();
	const message: NotificationMessage = {
		type: type,
		img: img,
		header: nextHeader,
		text: text,
		hash: count,
		duration: state.showTime,
		leaving: false,
	};

	if (state.messages.length >= state.maxCount) {
		pending.push(message);
		return;
	}

	arm(message);
	useNotificationsStore.setState({
		messages: state.messages.concat([message]),
	});
}

export function notifyInfo(text: string, header?: any) {
	pushNotification('info', text, header);
}

export function notifyWarning(text: string, header?: any) {
	pushNotification('warning', text, header);
}

export function notifySuccess(text: string, header?: any) {
	pushNotification('success', text, header);
}

export function notifyError(text: string, header?: any) {
	pushNotification('error', text, header);
}

export function notifyAddCash(text: string, header?: any) {
	pushNotification('add cash', text, header);
}

export function notifyRemoveCash(text: string, header?: any) {
	pushNotification('remove cash', text, header);
}

export function notifyAddMoney(text: string, header?: any) {
	pushNotification('add money', text, header);
}

export function notifyRemoveMoney(text: string, header?: any) {
	pushNotification('remove money', text, header);
}

export function initNotificationsLegacyBridge() {
	if (typeof window === 'undefined') {
		return;
	}

	const win = window as any;
	const target = win.notifications || {};

	target.push = pushNotification;
	target.info = notifyInfo;
	target.warning = notifyWarning;
	target.success = notifySuccess;
	target.error = notifyError;
	target.addCash = notifyAddCash;
	target.removeCash = notifyRemoveCash;
	target.addMoney = notifyAddMoney;
	target.removeMoney = notifyRemoveMoney;

	Object.defineProperty(target, 'messages', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useNotificationsStore.getState().messages;
		},
	});

	Object.defineProperty(target, 'showTime', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useNotificationsStore.getState().showTime;
		},
		set: function (val: number) {
			useNotificationsStore.setState({ showTime: val });
		},
	});

	Object.defineProperty(target, 'maxCount', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useNotificationsStore.getState().maxCount;
		},
		set: function (val: number) {
			const maxCount = Math.max(1, Number(val) || 1);
			useNotificationsStore.setState({ maxCount: maxCount });
			const messages = useNotificationsStore.getState().messages;
			let extra = messages.length - maxCount;
			for (let i = 0; i < messages.length && extra > 0; i++) {
				if (!messages[i].leaving) {
					beginLeave(messages[i].hash);
					extra -= 1;
				}
			}
			revealNext();
		},
	});

	Object.defineProperty(target, 'count', {
		configurable: true,
		enumerable: true,
		get: function () {
			return count;
		},
	});

	win.notifications = target;
}
