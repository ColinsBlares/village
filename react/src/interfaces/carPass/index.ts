import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'carPass',
	order: 100,
	load: function () { return import('./runtime'); },
	global: 'carPass',
});
