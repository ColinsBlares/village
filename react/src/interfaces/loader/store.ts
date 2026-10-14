import { create } from 'zustand';

export interface LoaderState {
	show: boolean;
}

export const useLoaderStore = create<LoaderState>(() => ({
	show: false,
}));

export function setLoaderShow(val: boolean) {
	useLoaderStore.setState({ show: !!val });
}

function bindShow(target: any, get: () => boolean, set: (val: boolean) => void) {
	Object.defineProperty(target, 'show', {
		configurable: true,
		enumerable: true,
		get: get,
		set: set,
	});
}

export function initLoaderLegacyBridge() {
	if (typeof window === 'undefined') {
		return;
	}

	const win = window as any;
	const previous = win.loader || {};
	const desc = Object.getOwnPropertyDescriptor(previous, 'show');
	const prevShow = desc && !desc.get && 'value' in desc ? desc.value : false;

	bindShow(
		previous,
		function () {
			return useLoaderStore.getState().show;
		},
		function (val: boolean) {
			setLoaderShow(val);
		},
	);

	win.loader = previous;

	if (prevShow) {
		setLoaderShow(true);
	}
}
