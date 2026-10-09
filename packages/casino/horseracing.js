'use strict';

/// Inside Track — скачки Diamond Casino (нативный экран HORSE_RACING_WALL).
/// Сервер авторитарно выбирает порядок финиша по весам (= коэффициентам) и
/// списывает/начисляет деньги. Клиент лишь анимирует забег к заданному порядку.

// Ставки (как в GTA Online: $100 — $10 000)
const MIN_BET = 100;
const MAX_BET = 10000;

// Длительность забега. RACE_SEED — рандом на клиенте/сервере для вариативности анимации.
// duration передаётся в START_RACE (в секундах) и используется клиентом для отрисовки.
const RACE_DURATION_SEC = 26;

// Зона ITB-автомата (выбор лошади и ставки). Интерьер казино = dimension 1.
// Дефолт — в основном зале казино, чтобы фича работала сразу. Точные координаты
// комнаты Inside Track задайте здесь (снимите /pos стоя у автомата).
const ITB_ZONE = {
	x: 1098.14,
	y: 258.14,
	z: -51.24,
	radius: 2.0,
	dimension: 1,
};

// 6 лошадей. weight — вероятность победы (чем больше, тем чаще выигрывает).
// odds — десятичный множитель выплаты: при победе игрок получает ставку * odds.
// Коэффициенты подобраны чуть ниже «честных» (преимущество казино на всех лошадях).
// primary/secondary/horse/mane — индексы цветов для нативного экрана.
const HORSES = [
	{
		num: 1,
		name: 'Blue Dream',
		weight: 35,
		odds: 2,
		primary: 38,
		secondary: 0,
		horse: 0,
		mane: 0,
	},
	{
		num: 2,
		name: 'Iron Heart',
		weight: 25,
		odds: 3,
		primary: 28,
		secondary: 0,
		horse: 1,
		mane: 1,
	},
	{
		num: 3,
		name: 'Golden Boy',
		weight: 18,
		odds: 5,
		primary: 12,
		secondary: 0,
		horse: 2,
		mane: 2,
	},
	{
		num: 4,
		name: 'Night Runner',
		weight: 12,
		odds: 8,
		primary: 0,
		secondary: 0,
		horse: 3,
		mane: 3,
	},
	{
		num: 5,
		name: 'Lucky Strike',
		weight: 7,
		odds: 14,
		primary: 49,
		secondary: 0,
		horse: 4,
		mane: 4,
	},
	{
		num: 6,
		name: 'Last Hope',
		weight: 3,
		odds: 30,
		primary: 134,
		secondary: 0,
		horse: 5,
		mane: 5,
	},
];

module.exports = {
	MIN_BET,
	MAX_BET,
	RACE_DURATION_SEC,
	ITB_ZONE,
	HORSES,

	getHorses() {
		return HORSES;
	},

	getHorse(num) {
		return HORSES.find(h => h.num === num) || null;
	},

	/// Данные лошадей для клиента (имя, коэффициент, цвета).
	serializeHorses() {
		return HORSES.map(h => ({
			num: h.num,
			name: h.name,
			odds: h.odds,
			primary: h.primary,
			secondary: h.secondary,
			horse: h.horse,
			mane: h.mane,
		}));
	},

	/// Взвешенный порядок финиша (без повторов). order[0] — победитель.
	pickFinishingOrder() {
		const pool = HORSES.map(h => ({ num: h.num, weight: h.weight }));
		const order = [];
		while (pool.length) {
			const total = pool.reduce((s, h) => s + h.weight, 0);
			let roll = Math.random() * total;
			let idx = 0;
			for (let i = 0; i < pool.length; i++) {
				roll -= pool[i].weight;
				if (roll < 0) {
					idx = i;
					break;
				}
			}
			order.push(pool[idx].num);
			pool.splice(idx, 1);
		}
		return order;
	},

	/// Сгенерировать забег: порядок финиша + сид анимации.
	generateRace() {
		return {
			order: this.pickFinishingOrder(),
			seed: Math.floor(Math.random() * 1000000),
			durationSec: RACE_DURATION_SEC,
		};
	},

	/// Выплата при победе выбранной лошади: ставка * odds (полный возврат + выигрыш).
	getPayout(horseNum, amount) {
		const horse = this.getHorse(horseNum);
		if (!horse) return 0;
		return Math.floor(amount * horse.odds);
	},
};
