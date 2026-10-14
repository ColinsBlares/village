import { create } from 'zustand';
import { PhoneDialog, PhoneMessage } from '@utils/shared/types';

interface DialogsState {
	isSorted: boolean;
	list: PhoneDialog[];
}

export const useDialogsStore = create<DialogsState>(() => ({
	isSorted: false,
	list: [],
}));

export function loadDialogs(list: PhoneDialog[]) {
	useDialogsStore.setState(
		{
			isSorted: false,
			list,
		},
		true,
	);
}

export function addDialog(name: string, number: string) {
	useDialogsStore.setState(state => ({
		list: [
			...state.list,
			{
				name,
				number,
				PhoneMessages: [],
			},
		],
	}));
}

export function renameDialog(number: string, newName: string) {
	useDialogsStore.setState(state => ({
		list: state.list.map(dialog =>
			dialog.number === number ? { ...dialog, name: newName } : dialog,
		),
	}));
}

export function deleteDialog(number: string) {
	useDialogsStore.setState(state => ({
		list: state.list.filter(dialog => dialog.number !== number),
	}));
}

export function addMessageToPhone(
	text: string,
	_date: any,
	number: string,
	isMine: boolean,
	isRead: boolean,
) {
	const message: PhoneMessage = {
		text,
		date: Date.now(),
		isMine,
		isRead,
	};

	useDialogsStore.setState(state => {
		const index = state.list.findIndex(dialog => dialog.number === number);

		if (index === -1) {
			return {
				isSorted: false,
				list: [
					...state.list,
					{
						name: '',
						number,
						PhoneMessages: [message],
					},
				],
			};
		}

		return {
			isSorted: false,
			list: state.list.map((dialog, dialogIndex) =>
				dialogIndex === index
					? {
							...dialog,
							PhoneMessages: [...(dialog.PhoneMessages || []), message],
						}
					: dialog,
			),
		};
	});
}

export function loadMessagesToDialog(number: string, messages: PhoneMessage[]) {
	useDialogsStore.setState(state => ({
		list: state.list.map(dialog =>
			dialog.number == number
				? {
						...dialog,
						PhoneMessages: messages.concat(dialog.PhoneMessages || []),
					}
				: dialog,
		),
	}));
}

export function sortDialogsByDate() {
	useDialogsStore.setState(state => ({
		isSorted: true,
		list: [...state.list].sort((a, b) => {
			if (!a.PhoneMessages.length || !b.PhoneMessages.length) {
				return 0;
			}

			const left = new Date(
				a.PhoneMessages[a.PhoneMessages.length - 1].date,
			).toLocaleString();
			const right = new Date(
				b.PhoneMessages[b.PhoneMessages.length - 1].date,
			).toLocaleString();
			return left.localeCompare(right) * -1;
		}),
	}));
}

export function readDialogMessages(number: string) {
	useDialogsStore.setState(state => ({
		list: state.list.map(dialog => {
			if (dialog.number !== number || !dialog.PhoneMessages) {
				return dialog;
			}

			return {
				...dialog,
				PhoneMessages: dialog.PhoneMessages.map(message => ({
					...message,
					isRead: true,
				})),
			};
		}),
	}));
}
