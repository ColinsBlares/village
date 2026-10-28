import { create } from 'zustand';
import { gameTrigger } from '../game';
import { pushNotice, usePhoneOsStore } from '../store';
import { seedThreads, type ChatMessage, type MessageKind, type Thread } from './data';

export type MessagesScreen = 'list' | 'thread' | 'compose';

interface MessagesState {
	screen: MessagesScreen;
	threads: Thread[];
	threadId: string | null;
	query: string;
	editing: boolean;
	draft: string;
	composeQuery: string;
}

export const useMessagesStore = create<MessagesState>(() => ({
	screen: 'list',
	threads: seedThreads,
	threadId: null,
	query: '',
	editing: false,
	draft: '',
	composeQuery: '',
}));

export function setQuery(query: string) {
	useMessagesStore.setState({ query: query });
}

export function setDraft(draft: string) {
	useMessagesStore.setState({ draft: draft });
}

export function setComposeQuery(composeQuery: string) {
	useMessagesStore.setState({ composeQuery: composeQuery });
}

export function toggleEditing() {
	useMessagesStore.setState(state => ({ editing: !state.editing }));
}

export function openThread(id: string) {
	const thread = useMessagesStore.getState().threads.find(function (item) {
		return item.id === id;
	});
	useMessagesStore.setState(state => ({
		screen: 'thread',
		threadId: id,
		draft: '',
		editing: false,
		threads: state.threads.map(function (item) {
			if (item.id !== id) {
				return item;
			}
			return { ...item, unread: false };
		}),
	}));
	if (thread && thread.number) {
		gameTrigger('phone.message.load', thread.number);
		gameTrigger('phone.dialog.read', thread.number);
	}
}

export function closeThread() {
	useMessagesStore.setState({ screen: 'list', threadId: null, draft: '' });
}

export function openCompose() {
	useMessagesStore.setState({ screen: 'compose', composeQuery: '', draft: '' });
}

export function closeCompose() {
	useMessagesStore.setState({ screen: 'list', composeQuery: '', draft: '' });
}

export function deleteThread(id: string) {
	useMessagesStore.setState(state => ({
		threads: state.threads.filter(function (thread) {
			return thread.id !== id;
		}),
		threadId: state.threadId === id ? null : state.threadId,
		screen: state.threadId === id ? 'list' : state.screen,
	}));
}

function nextId() {
	return 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
}

export function sendMessage(threadId: string, text: string, kind: MessageKind = 'text') {
	const time = usePhoneOsStore.getState().time;
	const message = { id: nextId(), fromMe: true, text: text, time: time, kind: kind };
	const thread = useMessagesStore.getState().threads.find(function (item) {
		return item.id === threadId;
	});
	useMessagesStore.setState(state => ({
		draft: kind === 'text' ? '' : state.draft,
		threads: state.threads.map(function (item) {
			if (item.id !== threadId) {
				return item;
			}
			return { ...item, unread: false, messages: item.messages.concat(message) };
		}),
	}));
	if (thread && thread.number && kind === 'text') {
		gameTrigger('phone.message.send', text, thread.number);
	}
}

function stamp(date?: number) {
	const wall = new Date(date || Date.now());
	const hours = String(wall.getHours()).padStart(2, '0');
	const minutes = String(wall.getMinutes()).padStart(2, '0');
	return hours + ':' + minutes;
}

function toMessage(raw: { text?: string; isMine?: boolean; date?: number }, index: number): ChatMessage {
	return {
		id: 'g' + index + '-' + (raw.date || index),
		fromMe: !!raw.isMine,
		text: raw.text || '',
		time: stamp(raw.date),
		kind: 'text',
	};
}

export function loadGameDialogs(dialogs: unknown) {
	if (!Array.isArray(dialogs)) {
		return;
	}
	const threads: Thread[] = dialogs.map(function (dialog, index) {
		const item = dialog as { name?: string; number?: string; PhoneMessages?: { text?: string; isMine?: boolean; date?: number }[] };
		const messages = (item.PhoneMessages || []).map(toMessage);
		const last = messages[messages.length - 1];
		return {
			id: 'd-' + (item.number || index),
			contactId: null,
			number: item.number || '',
			name: item.name || item.number || 'Номер',
			pinned: false,
			unread: !!(last && !last.fromMe),
			messages: messages,
		};
	});
	useMessagesStore.setState({ threads: threads, screen: 'list', threadId: null });
}

export function loadGameMessages(number: string, messages: unknown) {
	if (!Array.isArray(messages)) {
		return;
	}
	const next = messages.map(toMessage);
	useMessagesStore.setState(state => ({
		threads: state.threads.map(function (thread) {
			if (thread.number !== number) {
				return thread;
			}
			return { ...thread, messages: next, unread: false };
		}),
	}));
}

export function pushGameMessage(text: string, number: string) {
	const time = usePhoneOsStore.getState().time;
	const message: ChatMessage = { id: nextId(), fromMe: false, text: text, time: time, kind: 'text' };
	const state = useMessagesStore.getState();
	const found = state.threads.find(function (thread) {
		return thread.number === number;
	});
	if (!found) {
		const thread: Thread = {
			id: 'd-' + number,
			contactId: null,
			number: number,
			name: number,
			pinned: false,
			unread: true,
			messages: [message],
		};
		useMessagesStore.setState({ threads: [thread].concat(state.threads) });
	} else {
		useMessagesStore.setState({
			threads: state.threads.map(function (thread) {
				if (thread.number !== number) {
					return thread;
				}
				const open = state.threadId === thread.id && state.screen === 'thread';
				return { ...thread, unread: !open, messages: thread.messages.concat(message) };
			}),
		});
	}
	const name = found ? found.name : number;
	pushNotice({
		id: 'm-' + number + '-' + Date.now(),
		appId: 'messages',
		title: name,
		text: text,
		time: 'сейчас',
	});
}

export function pickContact(contactId: string, name: string) {
	const state = useMessagesStore.getState();
	const found = state.threads.find(function (thread) {
		return thread.contactId === contactId;
	});
	if (found) {
		openThread(found.id);
		useMessagesStore.setState({ composeQuery: '' });
		return;
	}
	const thread: Thread = {
		id: 't-' + contactId + '-' + nextId(),
		contactId: contactId,
		name: name,
		pinned: false,
		unread: false,
		messages: [],
	};
	useMessagesStore.setState({
		threads: [thread].concat(state.threads),
		threadId: thread.id,
		screen: 'thread',
		composeQuery: '',
		draft: '',
	});
}
