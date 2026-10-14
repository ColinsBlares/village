import KillList from './components/KillList';
import { initKillListLegacyBridge, useKillListStore } from './store';

export default {
	id: 'killList',
	Component: KillList,
	useVisible: () => {
		const list = useKillListStore(state => state.list);
		const selectMenuShow = useKillListStore(state => state.selectMenuShow);
		return list.length > 0 && !selectMenuShow;
	},
	init: initKillListLegacyBridge,
};

export function readOpen() {
	return useKillListStore.getState().list.length > 0 && !useKillListStore.getState().selectMenuShow;
}

export function subscribe(listener) {
	const store = useKillListStore;
	return store.subscribe(listener);
}
