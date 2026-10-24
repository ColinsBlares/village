import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'questTracker',
	order: 5,
	eager: true,
	load: function () { return import('./runtime'); },
	global: 'questTracker',
	isOpen: function (bag) { return !!bag.visible; },
	methods: ['set'],
	events: ['quests.tracker.set'],
});
