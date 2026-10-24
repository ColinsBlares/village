'use strict';

const weather = require('./index.js');

module.exports = {
	init: () => {
		weather.init();
		inited(__dirname);
	},

	'player.joined': player => {
		player.call('weather.info.update', [weather.getCurrentWeather(player)]);
		weather.sendState(player);
	},

	'characterInit.done': player => {
		weather.sendState(player);
	},

	'weather.ready': player => {
		weather.sendState(player);
	},

	'weather.action': (player, raw) => {
		weather.handle(player, raw);
	},
};
