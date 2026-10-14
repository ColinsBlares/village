import CharacterInfo from './components/CharacterInfo';
import { initCharacterInfoLegacyBridge, useCharacterInfoStore } from './store';

export default {
	id: 'characterInfo',
	Component: CharacterInfo,
	useVisible: () => useCharacterInfoStore(state => state.show),
	init: initCharacterInfoLegacyBridge,
};

export function readOpen() {
	return !!useCharacterInfoStore.getState().show;
}

export function subscribe(listener) {
	const store = useCharacterInfoStore;
	return store.subscribe(listener);
}
