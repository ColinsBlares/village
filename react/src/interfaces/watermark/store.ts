import { create } from 'zustand';
import { useHudStore } from '../hud/store';

export interface WatermarkState {
	show: boolean;
	id: string;
}

export const useWatermarkStore = create<WatermarkState>(() => ({
	show: false,
	id: '',
}));

export function syncWatermarkShow() {
	const id = useWatermarkStore.getState().id;
	const build = useHudStore.getState().build;
	const show = !!(build && id && String(id).length);
	if (useWatermarkStore.getState().show !== show) {
		useWatermarkStore.setState({ show: show });
	}
}

export function setWatermarkId(id: any) {
	const next = id == null ? '' : String(id);
	useWatermarkStore.setState({ id: next });
	syncWatermarkShow();
}

export function initWatermarkLegacyBridge() {
	if (typeof window === 'undefined') {
		return;
	}

	const win = window as any;
	const target = win.watermark || {};
	const desc = Object.getOwnPropertyDescriptor(target, 'id');
	const prevId = desc && !desc.get && 'value' in desc ? desc.value : undefined;

	Object.defineProperty(target, 'id', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useWatermarkStore.getState().id;
		},
		set: function (val: any) {
			setWatermarkId(val);
		},
	});

	Object.defineProperty(target, 'isShow', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useWatermarkStore.getState().show;
		},
	});

	win.watermark = target;

	if (prevId) {
		setWatermarkId(prevId);
	} else {
		syncWatermarkShow();
	}

	useHudStore.subscribe(function (state, prev) {
		if (state.build !== prev.build) {
			syncWatermarkShow();
		}
	});
}
