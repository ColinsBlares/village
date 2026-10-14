import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'governmentBadge',
	order: 100,
	load: function () { return import('./runtime'); },
	global: 'governmentBadge',
});
