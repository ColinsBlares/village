'use strict';

const WEATHERS = [
	{ id: 'EXTRASUNNY', label: 'Ясно', category: 'clear', icon: 'clear-day', temp: [24, 32] },
	{ id: 'CLEAR', label: 'Чисто', category: 'clear', icon: 'clear-day', temp: [18, 26] },
	{ id: 'CLOUDS', label: 'Облачно', category: 'clouds', icon: 'cloudy', temp: [16, 22] },
	{ id: 'OVERCAST', label: 'Пасмурно', category: 'clouds', icon: 'cloudy', temp: [14, 19] },
	{ id: 'SMOG', label: 'Смог', category: 'clouds', icon: 'fog', temp: [18, 27] },
	{ id: 'FOGGY', label: 'Туман', category: 'clouds', icon: 'fog', temp: [8, 14] },
	{ id: 'CLEARING', label: 'Проясняется', category: 'clouds', icon: 'partly-cloudy-day', temp: [15, 21] },
	{ id: 'RAIN', label: 'Дождь', category: 'rain', icon: 'rain', temp: [11, 17] },
	{ id: 'THUNDER', label: 'Гроза', category: 'rain', icon: 'rain', temp: [9, 15] },
	{ id: 'SNOWLIGHT', label: 'Редкий снег', category: 'snow', icon: 'sleet', temp: [-2, 2] },
	{ id: 'SNOW', label: 'Снег', category: 'snow', icon: 'snow', temp: [-8, -2] },
	{ id: 'BLIZZARD', label: 'Метель', category: 'snow', icon: 'snow', temp: [-14, -6] },
	{ id: 'XMAS', label: 'Рождество', category: 'snow', icon: 'snow', temp: [-5, 0] },
	{ id: 'SANDSTORM', label: 'Песчаная буря', category: 'custom', icon: 'wind', temp: [30, 39] },
	{ id: 'HEAVYSNOW', label: 'Сильный снег', category: 'custom', icon: 'snow', temp: [-16, -8] },
	{ id: 'HALLOWEEN', label: 'Хэллоуин', category: 'custom', icon: 'cloudy', temp: [8, 14] },
];

const CATEGORIES = [
	{ id: 'clear', label: 'Ясно' },
	{ id: 'clouds', label: 'Облака' },
	{ id: 'rain', label: 'Дождь' },
	{ id: 'snow', label: 'Снег' },
	{ id: 'custom', label: 'Свои' },
];

const EVENTS = [
	{
		id: 'earthquake',
		label: 'Землетрясение',
		global: false,
		minutes: 1,
		warn: 'Землетрясение. Держитесь на ногах.',
		text: 'Трясёт камеру и машины, людей сбивает с ног. Дома на карте статичные, они не рушатся.',
	},
	{
		id: 'bloodmoon',
		label: 'Кровавая луна',
		global: true,
		minutes: 8,
		warn: 'Небо стало красным.',
		text: 'На всю карту: багровый свет, гроза и красная луна.',
	},
	{
		id: 'darkhour',
		label: 'Тёмный час',
		global: true,
		minutes: 8,
		warn: 'Город залило зелёным светом.',
		text: 'На всю карту: зелёное небо и ночные часы, пока событие идёт.',
	},
	{
		id: 'supercell',
		label: 'Суперъячейка',
		global: false,
		minutes: 6,
		warn: 'Над районом суперъячейка.',
		text: 'Ливень, молнии почти без пауз и тряска на каждом ударе.',
	},
	{
		id: 'tornado',
		label: 'Торнадо',
		global: false,
		minutes: 4,
		warn: 'По району идёт торнадо.',
		text: 'Воронка тащит машины, игроков и NPC.',
	},
	{
		id: 'tsunami',
		label: 'Цунами',
		global: true,
		minutes: 6,
		warn: 'Вода поднимается. Уходите выше.',
		text: 'Вода прибывает постепенно. Низины затапливает, крыши остаются сухими.',
	},
];

const SETTINGS = [
	{ key: 'transitionSec', label: 'Сколько секунд погода смешивается на границе', group: 'Погода', type: 'number', min: 0, max: 120, step: 1 },
	{ key: 'cycleEnabled', label: 'Зоны сами меняют погоду по циклу', group: 'Погода', type: 'bool' },
	{ key: 'useForecast', label: 'Зона «Штат» берёт прогноз Лос-Анджелеса', group: 'Погода', type: 'bool' },
	{ key: 'realtime', label: 'Часы как на машине сервера', group: 'Время', type: 'bool' },
	{ key: 'scale', label: 'Игровых минут за одну реальную минуту', group: 'Время', type: 'number', min: 0, max: 60, step: 1 },
	{ key: 'frozen', label: 'Остановить часы', group: 'Время', type: 'bool' },
	{ key: 'blackout', label: 'Блэкаут', group: 'Эффекты', type: 'bool' },
	{ key: 'windScale', label: 'Множитель ветра', group: 'Эффекты', type: 'number', min: 0, max: 3, step: 0.1 },
	{ key: 'snowGrip', label: 'Снег делает дорогу скользкой', group: 'Эффекты', type: 'bool' },
	{ key: 'snowBlackout', label: 'Сильный снег моргает светом', group: 'Эффекты', type: 'bool' },
	{ key: 'eventDamage', label: 'Катаклизмы наносят урон', group: 'Катаклизмы', type: 'bool' },
	{ key: 'earthquakePower', label: 'Сила землетрясения', group: 'Катаклизмы', type: 'number', min: 0.2, max: 2, step: 0.1 },
	{ key: 'tornadoRadius', label: 'Радиус торнадо, метры', group: 'Катаклизмы', type: 'number', min: 12, max: 80, step: 1 },
	{ key: 'tornadoSpeed', label: 'Скорость торнадо, м/с', group: 'Катаклизмы', type: 'number', min: 2, max: 28, step: 1 },
];

const FORECAST_ICON = {
	'clear-day': 'EXTRASUNNY',
	'clear-night': 'EXTRASUNNY',
	rain: 'RAIN',
	snow: 'SNOW',
	sleet: 'SNOWLIGHT',
	wind: 'OVERCAST',
	fog: 'FOGGY',
	cloudy: 'SMOG',
	'partly-cloudy-day': 'CLOUDS',
	'partly-cloudy-night': 'CLOUDS',
};

function cycle(rows) {
	return rows.map(row => ({
		id: row[0],
		chance: row[1],
		minMin: row[2],
		maxMin: row[3],
	}));
}

function zone(data) {
	return {
		enabled: true,
		locked: false,
		overrideUntil: 0,
		nextChangeAt: 0,
		transitionSec: 12,
		followForecast: false,
		temperature: 22,
		summary: 'Ясно',
		icon: 'clear-day',
		minZ: -200,
		maxZ: 2000,
		clock: { enabled: false, hour: 12, minute: 0, frozen: true, scale: 1, _acc: 0 },
		cycle: cycle([
			['EXTRASUNNY', 40, 20, 50],
			['CLEAR', 30, 15, 40],
			['CLOUDS', 20, 10, 30],
			['RAIN', 10, 8, 20],
		]),
		...data,
	};
}

function defaultState() {
	const now = new Date();
	return {
		nextId: 5,
		settings: {
			transitionSec: 12,
			cycleEnabled: true,
			useForecast: true,
			realtime: true,
			scale: 1,
			frozen: false,
			hour: now.getHours(),
			minute: now.getMinutes(),
			_acc: now.getSeconds(),
			blackout: false,
			globalWeather: null,
			windScale: 1,
			snowGrip: true,
			snowBlackout: true,
			eventDamage: true,
			earthquakePower: 1,
			tornadoRadius: 28,
			tornadoSpeed: 9,
		},
		event: null,
		zones: [
			zone({
				id: 1,
				name: 'Штат',
				color: '#7ec8ff',
				priority: 0,
				followForecast: true,
				weather: 'EXTRASUNNY',
				points: [
					{ x: -5000, y: -4500, z: 30 },
					{ x: 5500, y: -4500, z: 30 },
					{ x: 5500, y: 8500, z: 30 },
					{ x: -5000, y: 8500, z: 30 },
				],
			}),
			zone({
				id: 2,
				name: 'Лос-Сантос',
				color: '#f2b544',
				priority: 20,
				weather: 'EXTRASUNNY',
				points: [
					{ x: -3200, y: -3500, z: 20 },
					{ x: 1900, y: -3500, z: 20 },
					{ x: 1900, y: 1400, z: 40 },
					{ x: -3200, y: 1400, z: 40 },
				],
				cycle: cycle([
					['EXTRASUNNY', 34, 25, 55],
					['CLEAR', 24, 15, 40],
					['CLOUDS', 16, 10, 30],
					['OVERCAST', 8, 10, 25],
					['FOGGY', 6, 8, 18],
					['RAIN', 8, 8, 22],
					['THUNDER', 4, 6, 14],
				]),
			}),
			zone({
				id: 3,
				name: 'Сэнди-Шорс',
				color: '#e0a15a',
				priority: 20,
				weather: 'EXTRASUNNY',
				temperature: 34,
				summary: 'Ясно',
				points: [
					{ x: -100, y: 2500, z: 30 },
					{ x: 2900, y: 2500, z: 30 },
					{ x: 2900, y: 4500, z: 40 },
					{ x: -100, y: 4500, z: 40 },
				],
				cycle: cycle([
					['EXTRASUNNY', 48, 30, 70],
					['CLEAR', 22, 20, 40],
					['SMOG', 12, 10, 25],
					['SANDSTORM', 12, 8, 18],
					['CLOUDS', 6, 10, 20],
				]),
			}),
			zone({
				id: 4,
				name: 'Палето',
				color: '#9fd6c8',
				priority: 20,
				weather: 'FOGGY',
				temperature: 9,
				summary: 'Туман',
				icon: 'fog',
				points: [
					{ x: -2200, y: 5200, z: 30 },
					{ x: 1700, y: 5200, z: 30 },
					{ x: 1700, y: 7400, z: 40 },
					{ x: -2200, y: 7400, z: 40 },
				],
				cycle: cycle([
					['FOGGY', 22, 10, 25],
					['CLOUDS', 18, 12, 30],
					['OVERCAST', 14, 10, 25],
					['RAIN', 14, 8, 20],
					['SNOWLIGHT', 14, 10, 25],
					['CLEAR', 10, 12, 30],
					['SNOW', 8, 10, 22],
				]),
			}),
		],
	};
}

function weatherById(id) {
	return WEATHERS.find(item => item.id === id) || null;
}

function eventById(id) {
	return EVENTS.find(item => item.id === id) || null;
}

module.exports = {
	WEATHERS,
	CATEGORIES,
	EVENTS,
	SETTINGS,
	FORECAST_ICON,
	defaultState,
	weatherById,
	eventById,
};
