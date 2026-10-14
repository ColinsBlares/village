import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'fishing',
	order: 100,
	load: function () { return import('./runtime'); },
	global: 'fishing',
	methods: ["moveCursor","fishFetch","endFishing","clearData"],
});
