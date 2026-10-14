import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'captureScore',
	order: 100,
	load: function () { return import('./runtime'); },
	global: 'captureScore',
	methods: ["start","setScore"],
});
