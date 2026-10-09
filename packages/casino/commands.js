let casino = require('./index.js');
let horseracing = casino.horseracing;

module.exports = {
	/// Тестовый забег без ставки — чтобы увидеть экран и подстроить координаты.
	'/htrace': {
		access: 6,
		description: 'Тестовый забег скачек (настройка экрана)',
		args: '',
		handler: (player) => {
			const race = horseracing.generateRace();
			player.call('casino.horse.race.start', [
				JSON.stringify({
					horses: horseracing.serializeHorses(),
					order: race.order,
					seed: race.seed,
					durationSec: race.durationSec,
					betHorse: 0,
					betAmount: 0,
					test: true,
				}),
			]);
			player.call('chat.message.push', [
				`!{#56adff}[СКАЧКИ] Тест-забег. Порядок финиша: ${race.order.join(', ')}`,
			]);
		},
	},

	/// Тестовый спин слотов без денег — для проверки вращения барабанов/посадки.
	'/slottest': {
		access: 6,
		description: 'Тестовый спин слот-машины (нужно сидеть за автоматом)',
		args: '[win]:n',
		handler: (player, args) => {
			player.call('casino.slots.test', [parseInt(args[0]) === 1 ? 1 : 0]);
		},
	},

	/// Диагностика поиска слот-автоматов рядом с игроком.
	'/slotscan': {
		access: 6,
		description: 'Показать найденные рядом слот-автоматы',
		args: '',
		handler: (player) => {
			player.call('casino.slots.scan');
		},
	},

};
