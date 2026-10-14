import { create } from 'zustand';
import { bindCefObject } from '@utils/cefBridge';

export interface MedicalCardState {
	show: boolean;
	identifier: number | string;
	name: string;
	occupation: string;
	gender: string;
	time: string;
	sign: string;
}

const KEYS = ['show', 'identifier', 'name', 'occupation', 'gender', 'time', 'sign'];

export const useMedicalCardStore = create<MedicalCardState>(() => ({
	show: false,
	identifier: 228133744323,
	name: 'Darian Rockfall',
	occupation: 'LSPD',
	gender: 'M',
	time: '18.11.2019',
	sign: 'D.Rockfall',
}));

function writeMedicalCard(key: string, value: any) {
	const prev = (useMedicalCardStore.getState() as any)[key];
	if (key === 'show') {
		useMedicalCardStore.setState({ show: !!value });
		if (prev && !value) {
			mp.trigger('documents.close');
		}
		return;
	}
	useMedicalCardStore.setState({ [key]: value } as Partial<MedicalCardState>);
}

export function hideMedicalCard() {
	writeMedicalCard('show', false);
}

export function splitIdentifier(value: number | string): string {
	return ('' + value).replace(/(\d)(?=(\d{4})+(\D|$))/g, '$1 ');
}

export function initMedicalCardLegacyBridge() {
	bindCefObject(
		'medicalCard',
		KEYS,
		function (key) {
			return (useMedicalCardStore.getState() as any)[key];
		},
		writeMedicalCard,
	);
}
