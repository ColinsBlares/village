import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'characterPass',
	order: 100,
	load: function () { return import('./runtime'); },
	global: 'characterPass',
});
