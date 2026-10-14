import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'check',
	order: 100,
	load: function () { return import('./runtime'); },
	global: 'check',
});
