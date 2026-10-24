import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'questLog',
	order: 90,
	load: function () { return import('./runtime'); },
	global: 'questLog',
	isOpen: function (bag) { return !!bag.show; },
	methods: ['hide'],
	events: ['questLog.open', 'questLog.hide'],
});
