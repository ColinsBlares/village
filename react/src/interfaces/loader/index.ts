import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'loader',
	order: 124,
	load: function () { return import('./runtime'); },
	global: 'loader',
});
