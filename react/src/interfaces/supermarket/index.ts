import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'supermarket',
	order: 100,
	load: function () { return import('./runtime'); },
	global: 'supermarket',
	methods: ["open","close","notify"],
});
