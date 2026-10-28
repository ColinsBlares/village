import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'offerDialog',
	order: 122,
	load: function () { return import('./runtime'); },
	global: 'offerDialog',
	methods: ["show","hide","pretty"],
	isOpen: function (bag) {
		return !!(bag && bag.opened);
	},
});
