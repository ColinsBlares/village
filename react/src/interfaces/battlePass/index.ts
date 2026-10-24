import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'battlePass',
	order: 220,
	load: function () { return import('./runtime'); },
	global: 'battlePass',
	methods: ['setEnabled', 'setData', 'setOnlineMinutes', 'setTaskProgress', 'setError', 'setCasePrize', 'toggle'],
});
