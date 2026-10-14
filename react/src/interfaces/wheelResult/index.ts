import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'wheelResult',
	order: 100,
	load: function () { return import('./runtime'); },
	global: 'wheelResult',
	methods: ["accept"],
});
