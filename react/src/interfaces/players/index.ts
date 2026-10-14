import { defineScreen } from '@utils/defineScreen';

export default defineScreen({
	id: 'players',
	order: 6,
	load: function () { return import('./runtime'); },
	events: ["players.show","players.load","players.add","players.remove","players.update"],
});
