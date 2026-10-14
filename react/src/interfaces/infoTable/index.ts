import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'infoTable',
	order: 123,
	load: function () { return import('./runtime'); },
	global: 'infoTable',
	methods: ["setValues","showByName","prettyValue"],
});
