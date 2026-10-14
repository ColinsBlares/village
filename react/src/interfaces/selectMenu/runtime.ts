import SelectMenu from './components/SelectMenu';
import { initSelectMenuLegacyBridge, useSelectMenuStore } from './store';

export default {
	id: 'selectMenu',
	Component: SelectMenu,
	order: 40,
	useVisible: function () {
		return useSelectMenuStore(function (state) {
			return !!(state.show && state.menu);
		});
	},
	init: initSelectMenuLegacyBridge,
};

export function readOpen() {
	return !!(useSelectMenuStore.getState().show && useSelectMenuStore.getState().menu);
}

export function subscribe(listener) {
	const store = useSelectMenuStore;
	return store.subscribe(listener);
}
