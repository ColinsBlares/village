import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'hud',
	order: 0,
	load: function () {
		return import('./runtime');
	},
	eager: true,
	global: 'hud',
	events: ['hud.show', 'hud.setData', 'hud.quest.set'],
});
