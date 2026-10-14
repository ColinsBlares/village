import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'driverLicense',
	order: 100,
	load: function () { return import('./runtime'); },
	global: 'driverLicense',
});
