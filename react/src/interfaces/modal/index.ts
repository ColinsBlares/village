import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'modal',
	order: 130,
	load: function () { return import('./runtime'); },
	global: 'modal',
	methods: ["showByName"],
});
