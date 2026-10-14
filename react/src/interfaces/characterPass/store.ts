import { create } from 'zustand';
import { bindCefObject } from '@utils/cefBridge';

export interface CharacterPassState {
	show: boolean;
	header: string;
	fName: string;
	sName: string;
	spouse: string | null;
	regDate: string;
	sex: number | string | boolean;
	number: number | string;
}

const KEYS = ['show', 'header', 'fName', 'sName', 'spouse', 'regDate', 'sex', 'number'];

export const useCharacterPassStore = create<CharacterPassState>(() => ({
	show: false,
	header: 'Паспорт гражданина',
	fName: 'Alexander',
	sName: 'Woodman',
	spouse: null,
	regDate: '03/08/2019',
	sex: 0,
	number: 3940123342,
}));

export function closeCharacterPass() {
	useCharacterPassStore.setState({ show: false });
	mp.trigger('documents.close');
}

export function initCharacterPassLegacyBridge() {
	bindCefObject(
		'characterPass',
		KEYS,
		function (key) {
			return (useCharacterPassStore.getState() as any)[key];
		},
		function (key, value) {
			if (key === 'show') {
				useCharacterPassStore.setState({ show: !!value });
				return;
			}
			useCharacterPassStore.setState({ [key]: value } as Partial<CharacterPassState>);
		},
		{
			close: closeCharacterPass,
		},
	);
}
