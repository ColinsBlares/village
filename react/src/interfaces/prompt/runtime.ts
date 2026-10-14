import Prompt from './components/Prompt';
import { initPromptLegacyBridge, usePromptStore } from './store';

export default {
	id: 'prompt',
	Component: Prompt,
	order: 120,
	useVisible: () => usePromptStore(state => state.show),
	init: initPromptLegacyBridge,
};

export function readOpen() {
	return !!usePromptStore.getState().show;
}

export function subscribe(listener) {
	const store = usePromptStore;
	return store.subscribe(listener);
}
