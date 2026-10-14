import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'speedometer',
	order: 100,
	load: function () { return import('./runtime'); },
	global: 'speedometer',
	select: function (state) { return !!(state.speedometer && state.hud); },
});
