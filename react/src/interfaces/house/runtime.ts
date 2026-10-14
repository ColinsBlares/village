import './house.css';
import EnterMenu from './components/EnterMenu';
import House from './components/House';
import { registerHouseEvents } from './events';
import { useEnterMenuStore } from './store';
import { useVisibilityStore } from '@utils/visibility/store';

export default [
	{
		id: 'house',
		Component: House,
		order: 2,
		useVisible: () => useVisibilityStore(state => state.house),
		register: registerHouseEvents,
	},
	{
		id: 'enterMenu',
		Component: EnterMenu,
		order: 3,
		useVisible: () => useEnterMenuStore(state => state.isShow),
	},
];

export { House as HouseView, EnterMenu as EnterMenuView };

export function register(gameEvents) {
	registerHouseEvents(gameEvents);
}

export function readEnter() {
	return !!useEnterMenuStore.getState().isShow;
}

export function subscribeEnter(listener) {
	return useEnterMenuStore.subscribe(listener);
}
