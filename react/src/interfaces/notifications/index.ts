import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'notifications',
	order: 121,
	load: function () { return import('./runtime'); },
	eager: true,
	global: 'notifications',
	methods: ["push","info","warning","success","error","addCash","removeCash","addMoney","removeMoney"],
});
