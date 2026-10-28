import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'phone',
	order: 1,
	load: function () { return import('./runtime'); },
	gate: 'phoneReady',
	events: [],
});
