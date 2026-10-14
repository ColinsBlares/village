import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'killList',
	order: 100,
	load: function () { return import('./runtime'); },
	global: 'killList',
	isOpen: function (bag) { return !!(bag.list && bag.list.length); },
	methods: ["add","playerColor","isWeapon"],
});
