import { defineScreen } from '@utils/defineScreen';
import { initInteractionMenuLegacyBridge } from './store';

const screen = defineScreen({
	id: 'interactionMenu',
	order: 100,
	load: function () { return import('./runtime'); },
	global: 'interactionMenu',
	isOpen: function (bag) { return !!(bag.show && bag.enable); },
	methods: ["showByName","addItems","deleteItem","onClick"],
});

initInteractionMenuLegacyBridge();

export default screen;
