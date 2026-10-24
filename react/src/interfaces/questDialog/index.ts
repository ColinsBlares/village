import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'questDialog',
	order: 95,
	load: function () { return import('./runtime'); },
	global: 'questDialog',
	isOpen: function (bag) { return !!bag.show; },
	methods: ['hide'],
	events: ['questDialog.open', 'questDialog.hide'],
});
