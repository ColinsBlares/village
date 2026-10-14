import { create } from 'zustand';
import { ChatMessage, ChatTag, ChatWord } from '@utils/shared/types';

const CHAT_SIZE = 100;

interface ChatState {
	isShow: boolean;
	messages: ChatMessage[];
	opacity: number;
	time: boolean;
	tags: ChatTag[];
	isFocus: boolean;
	size: number;
}

export const useChatStore = create<ChatState>(() => ({
	isShow: true,
	messages: [],
	opacity: 1,
	time: true,
	tags: [],
	isFocus: false,
	size: 1,
}));

function formatMessage(message: string): ChatWord[] {
	const reg = /!{#[a-f0-9]{6}}/g;
	const regColor = /#[a-f0-9]{6}/g;
	const outputArray: ChatWord[] = [];

	if (!message) {
		return outputArray;
	}

	if (!reg.test(message)) {
		outputArray.push({
			text: message,
			color: 'white',
		});
		return outputArray;
	}

	reg.lastIndex = 0;
	const colors = message.match(reg) || [];
	reg.lastIndex = 0;
	const inputArray = message.split(reg);
	let colorIndex = 0;

	for (let wordIndex = 0; wordIndex < inputArray.length; wordIndex++) {
		const color =
			colors[colorIndex] && colors[colorIndex].match(regColor)
				? colors[colorIndex].match(regColor)[0]
				: 'white';

		if (inputArray[wordIndex].trim() != '') {
			outputArray.push({
				text: inputArray[wordIndex],
				color,
			});
			colorIndex++;
		} else {
			outputArray.push({
				text: '',
				color,
			});
		}
	}

	return outputArray;
}

function getTime() {
	const date = new Date();
	return `[${String('00' + date.getHours()).slice(-2)}:${String('00' + date.getMinutes()).slice(-2)}:${String('00' + date.getSeconds()).slice(-2)}] `;
}

export function pushMessage(message: string) {
	const nextMessage: ChatMessage = {
		text: formatMessage(message),
		time: getTime(),
	};

	useChatStore.setState(state => {
		if (state.messages.length < CHAT_SIZE) {
			return { messages: [...state.messages, nextMessage] };
		}

		return { messages: [...state.messages.slice(1), nextMessage] };
	});
}

export function setOpacityChat(opacity: number) {
	useChatStore.setState({ opacity });
}

export function showChat(isShow: boolean) {
	useChatStore.setState({ isShow });
}

export function setFocusChat(isFocus: boolean) {
	useChatStore.setState({ isFocus });
}

export function setTagsChat(tags: ChatTag[]) {
	useChatStore.setState({ tags });
}

export function setTimeChat(time: boolean) {
	useChatStore.setState({ time });
}

export function setSizeChat(size: number) {
	useChatStore.setState({ size: 0.5 + 0.25 * size });
}
