import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'craft',
	order: 100,
	load: function () { return import('./runtime'); },
	global: 'craft',
	isOpen: function (bag) { return !!(bag.show && bag.crafter); },
	methods: ["initCrafter","clearCrafter","addItemToQueue"],
});
