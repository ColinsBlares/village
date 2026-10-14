import { defineScreen } from '@utils/defineScreen';

function loadHouse() {
	return import('./runtime');
}

export default [
	defineScreen({
		id: 'house',
		order: 2,
		load: loadHouse,
		component: 'HouseView',
		events: ["house.menu","house.load","house.menu.close","house.menu.enter","house.menu.enter.close","house.buy.ans","house.enter.ans.err"],
	}),
	defineScreen({
		id: 'enterMenu',
		order: 3,
		load: loadHouse,
		component: 'EnterMenuView',
		read: 'readEnter',
		listen: 'subscribeEnter',
		events: ["house.menu.enter","house.menu.enter.close"],
	}),
];
