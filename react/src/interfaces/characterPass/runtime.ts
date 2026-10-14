import CharacterPass from './components/CharacterPass';
import { initCharacterPassLegacyBridge, useCharacterPassStore } from './store';

export default {
	id: 'characterPass',
	Component: CharacterPass,
	useVisible: () => useCharacterPassStore(state => state.show),
	init: initCharacterPassLegacyBridge,
};

export function readOpen() {
	return !!useCharacterPassStore.getState().show;
}

export function subscribe(listener) {
	const store = useCharacterPassStore;
	return store.subscribe(listener);
}
