import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'medicalCard',
	order: 100,
	load: function () { return import('./runtime'); },
	global: 'medicalCard',
});
