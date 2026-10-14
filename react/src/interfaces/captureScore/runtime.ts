import CaptureScore from './components/CaptureScore';
import { initCaptureScoreLegacyBridge, useCaptureScoreStore } from './store';

export default {
	id: 'captureScore',
	Component: CaptureScore,
	useVisible: () => {
		const show = useCaptureScoreStore(state => state.show);
		const offerOpen = useCaptureScoreStore(state => state.offerOpen);
		return show && !offerOpen;
	},
	init: initCaptureScoreLegacyBridge,
};

export function readOpen() {
	return !!(useCaptureScoreStore.getState().show && !useCaptureScoreStore.getState().offerOpen);
}

export function subscribe(listener) {
	const store = useCaptureScoreStore;
	return store.subscribe(listener);
}
