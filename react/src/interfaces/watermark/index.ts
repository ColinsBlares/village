import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'watermark',
	order: 128,
	load: function () { return import('./runtime'); },
	global: 'watermark',
});
