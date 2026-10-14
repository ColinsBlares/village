import { defineScreen } from '@utils/defineScreen';
import { initSelectMenuLegacyBridge } from './store';

const screen = defineScreen({
	id: 'selectMenu',
	order: 40,
	load: function () { return import('./runtime'); },
	global: 'selectMenu',
	isOpen: function (bag) { return !!(bag.show && bag.menu); },
	methods: ["showByName","setItemValues","setItems","getItemByName","addItem","deleteItem","setProp"],
});

initSelectMenuLegacyBridge();

export default screen;
