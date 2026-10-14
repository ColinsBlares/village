import { create } from 'zustand';

export interface NotificationMessage {
	type: string;
	img: string;
	header: string | null;
	text: string;
	hash: number;
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
	maxCount: 5,
}));

let count = 0;
const messageTimers: Record<number, number> = {};

export function pushNotification(type: string, text: string, header?: any) {
	let nextHeader: string | null = header;
	if (header == 'undefined' || header == 'null') {
		nextHeader = null;
	}

	const parts = String(type).split(' ');
	const img = parts.length > 1 ? parts[1] : String(type);
	count += 1;
	const hash = count;
	const message: NotificationMessage = {
		type: type,
		img: img,
		header: nextHeader,
		text: text,
		hash: hash,
	};

	const state = useNotificationsStore.getState();
	let messages = state.messages.concat([message]);
	if (messages.length > state.maxCount) {
		const removed = messages[0];
		if (messageTimers[removed.hash]) {
			window.clearTimeout(messageTimers[removed.hash]);
			delete messageTimers[removed.hash];
		}
		messages = messages.slice(1);
	}

	messageTimers[hash] = window.setTimeout(function () {
		const current = useNotificationsStore.getState().messages;
		if (!current.length) {
			return;
		}
		useNotificationsStore.setState({ messages: current.slice(1) });
	}, state.showTime);

	useNotificationsStore.setState({ messages: messages });
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
			useNotificationsStore.setState({ maxCount: val });
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
