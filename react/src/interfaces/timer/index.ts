import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'timer',
	order: 129,
	load: function () { return import('./runtime'); },
	global: 'timer',
	methods: ["start","stop"],
});
