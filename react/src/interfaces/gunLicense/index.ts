import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'gunLicense',
	order: 100,
	load: function () { return import('./runtime'); },
	global: 'gunLicense',
});
