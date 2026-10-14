import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'acceptWindow',
	order: 127,
	load: function () { return import('./runtime'); },
	global: 'acceptWindow',
	methods: ["accept","decline"],
});
