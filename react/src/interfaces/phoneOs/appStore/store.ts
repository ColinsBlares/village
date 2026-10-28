import { create } from 'zustand';
import { installApp, openApp } from '../store';

export type StoreTab = 'today' | 'apps' | 'search';

interface StoreState {
	tab: StoreTab;
	query: string;
	detailKey: string | null;
	progress: Record<string, number>;
}

export const useStoreApp = create<StoreState>(() => ({
	tab: 'today',
	query: '',
	detailKey: null,
	progress: {},
}));

const timers: Record<string, number> = {};

export function setStoreTab(tab: StoreTab) {
	useStoreApp.setState({ tab: tab, detailKey: null });
}

export function setStoreQuery(query: string) {
	useStoreApp.setState({ query: query });
}

export function openDetail(key: string) {
	useStoreApp.setState({ detailKey: key });
}

export function closeDetail() {
	useStoreApp.setState({ detailKey: null });
}

export function startDownload(key: string) {
	if (timers[key]) {
		return;
	}
	useStoreApp.setState(function (state) {
		return { progress: { ...state.progress, [key]: 8 } };
	});
	timers[key] = window.setInterval(function () {
		const value = useStoreApp.getState().progress[key] || 0;
		if (value >= 100) {
			window.clearInterval(timers[key]);
			delete timers[key];
			return;
		}
		const next = value + 12;
		if (next >= 100) {
			window.clearInterval(timers[key]);
			delete timers[key];
			const progress = { ...useStoreApp.getState().progress };
			delete progress[key];
			useStoreApp.setState({ progress: progress });
			installApp(key);
			return;
		}
		useStoreApp.setState(function (state) {
			return { progress: { ...state.progress, [key]: next } };
		});
	}, 140);
}

export function openInstalled(id: string) {
	openApp(id);
}
