import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'weatherPanel',
	order: 120,
	load: function () { return import('./runtime'); },
	global: 'weatherPanel',
	isOpen: function (bag) { return !!bag.show; },
	methods: ['hide'],
	events: ['weatherPanel.open', 'weatherPanel.setData', 'weatherPanel.hide', 'weatherPanel.tick'],
});
