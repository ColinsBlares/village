import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'business',
	order: 4,
	load: function () { return import('./runtime'); },
	events: ["biz.menu","biz.load","biz.menu.close","biz.buy.ans","biz.faction"],
});
