import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'trade',
	order: 132,
	load: function () { return import('./runtime'); },
	global: 'trade',
	methods: ['apply', 'close'],
});
