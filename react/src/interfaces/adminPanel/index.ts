import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'adminPanel',
	order: 20,
	load: function () { return import('./runtime'); },
	events: ['adminPanel.open', 'adminPanel.setData'],
	global: 'adminPanel',
	methods: ['open', 'setData', 'setAuditData', 'setHistoryData', 'refresh', 'close'],
});
