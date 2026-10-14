import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'carSpecifications',
	order: 100,
	load: function () { return import('./runtime'); },
	global: 'carSpecifications',
});
