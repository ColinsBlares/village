import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'questEditor',
	order: 110,
	load: function () { return import('./runtime'); },
	global: 'questEditor',
	isOpen: function (bag) { return !!bag.show; },
	methods: ['hide'],
	events: ['questEditor.open', 'questEditor.setData', 'questEditor.setPosition', 'questEditor.hide'],
});
