import { create } from 'zustand';
import { bindCefObject } from '@utils/cefBridge';

export interface GovernmentBadgeState {
	show: boolean;
	type: string;
	identifier: number | string;
	name: string;
	rank: string;
	gender: string;
	sign: string;
	directorSign: string;
}

const KEYS = ['show', 'type', 'identifier', 'name', 'rank', 'gender', 'sign', 'directorSign'];

export const useGovernmentBadgeStore = create<GovernmentBadgeState>(() => ({
	show: false,
	type: 'lspd',
	identifier: 50234,
	name: 'Darian Rockfall',
	rank: 'unnamed',
	gender: 'Mужской',
	sign: 'D.Rockfall',
	directorSign: 'E.Wilkinson',
}));

export function closeGovernmentBadge() {
	useGovernmentBadgeStore.setState({ show: false });
	mp.trigger('documents.close');
}

export function initGovernmentBadgeLegacyBridge() {
	bindCefObject(
		'governmentBadge',
		KEYS,
		function (key) {
			return (useGovernmentBadgeStore.getState() as any)[key];
		},
		function (key, value) {
			if (key === 'show') {
				useGovernmentBadgeStore.setState({ show: !!value });
				return;
			}
			useGovernmentBadgeStore.setState({ [key]: value } as Partial<GovernmentBadgeState>);
		},
		{
			close: closeGovernmentBadge,
		},
	);
}
