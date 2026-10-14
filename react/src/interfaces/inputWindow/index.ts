import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'inputWindow',
	order: 125,
	load: function () { return import('./runtime'); },
	global: 'inputWindow',
	methods: ["showByName","accept","decline"],
});
