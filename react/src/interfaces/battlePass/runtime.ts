import BattlePass from './components/BattlePass';
import {
	initBattlePassBridge,
	useBattlePassStore,
} from './store';

export default {
	id: 'battlePass',
	Component: BattlePass,
	useVisible: () => useBattlePassStore(state => state.show),
	init: initBattlePassBridge,
};

export function readOpen() {
	return useBattlePassStore.getState().show;
}

export function subscribe(listener: () => void) {
	return useBattlePassStore.subscribe(listener);
}
