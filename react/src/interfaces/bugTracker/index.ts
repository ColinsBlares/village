import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'bugTracker',
	order: 100,
	load: function () { return import('./runtime'); },
	global: 'bugTracker',
	methods: ["initBugList","addBug"],
});
