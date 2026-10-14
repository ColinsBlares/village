import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'prompt',
	order: 120,
	load: function () { return import('./runtime'); },
	global: 'prompt',
	isOpen: function (bag) { return !!(bag.text || bag.show); },
	methods: ["show","hide","showByName"],
});
