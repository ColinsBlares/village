export type MessageKind = 'text' | 'photo' | 'place';

export interface ChatMessage {
	id: string;
	fromMe: boolean;
	text: string;
	time: string;
	kind: MessageKind;
}

export interface Thread {
	id: string;
	contactId: string | null;
	number?: string;
	name: string;
	pinned: boolean;
	unread: boolean;
	messages: ChatMessage[];
}

const palette = ['#34c759', '#ff2d55', '#af52de', '#ff9500', '#007aff', '#5ac8fa', '#ff3b30', '#5856d6'];

export function avatarColor(name: string) {
	let hash = 0;
	for (let index = 0; index < name.length; index += 1) {
		hash += name.charCodeAt(index);
	}
	return palette[hash % palette.length];
}

export function initials(name: string) {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) {
		return '?';
	}
	if (parts.length === 1) {
		return parts[0].slice(0, 1).toUpperCase();
	}
	return (parts[0].slice(0, 1) + parts[1].slice(0, 1)).toUpperCase();
}

export function previewOf(message: ChatMessage | undefined) {
	if (!message) {
		return 'Нет сообщений';
	}
	if (message.kind === 'photo') {
		return 'Фото';
	}
	if (message.kind === 'place') {
		return 'Геопозиция';
	}
	return message.text;
}

export const seedThreads: Thread[] = [
	{
		id: 't-family',
		contactId: '10',
		name: 'Семья',
		pinned: true,
		unread: true,
		messages: [
			{ id: 'f1', fromMe: true, text: 'Во сколько выезжаем?', time: '18:02', kind: 'text' },
			{ id: 'f2', fromMe: false, text: 'Как будешь готов', time: '18:05', kind: 'text' },
			{ id: 'f3', fromMe: true, text: 'Я у дома', time: '18:10', kind: 'text' },
			{ id: 'f4', fromMe: false, text: 'Ок, еду', time: '18:12', kind: 'text' },
		],
	},
	{
		id: 't-vika',
		contactId: '2',
		name: 'Виктория Соколова',
		pinned: false,
		unread: false,
		messages: [
			{ id: 'v1', fromMe: false, text: 'Ты где?', time: '18:40', kind: 'text' },
			{ id: 'v2', fromMe: true, text: 'На бульваре, пять минут', time: '18:41', kind: 'text' },
		],
	},
	{
		id: 't-maria',
		contactId: '6',
		name: 'Мария Коваль',
		pinned: false,
		unread: false,
		messages: [
			{ id: 'm1', fromMe: true, text: 'Скинь адрес склада', time: '17:02', kind: 'text' },
			{ id: 'm2', fromMe: false, text: 'Вайнвуд, склад 4', time: '17:06', kind: 'text' },
		],
	},
	{
		id: 't-taxi',
		contactId: null,
		name: 'Такси',
		pinned: false,
		unread: false,
		messages: [
			{ id: 'x1', fromMe: true, text: 'Машина к дому', time: '16:58', kind: 'text' },
			{ id: 'x2', fromMe: false, text: 'Машина подана', time: '17:02', kind: 'text' },
		],
	},
	{
		id: 't-bank',
		contactId: null,
		name: 'Банк',
		pinned: false,
		unread: false,
		messages: [{ id: 'b1', fromMe: false, text: 'Перевод получен', time: '17:40', kind: 'text' }],
	},
	{
		id: 't-dima',
		contactId: '3',
		name: 'Дмитрий Ким',
		pinned: false,
		unread: false,
		messages: [
			{ id: 'd1', fromMe: false, text: 'Завтра в 10 на пирсе', time: '12:16', kind: 'text' },
			{ id: 'd2', fromMe: true, text: 'Буду', time: '12:20', kind: 'text' },
		],
	},
];
