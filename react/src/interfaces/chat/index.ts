import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'chat',
	order: 0,
	load: function () { return import('./runtime'); },
	eager: true,
});
