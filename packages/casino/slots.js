'use strict';

/// Слот-машины Diamond Casino (все 8 видов автоматов в интерьере).
/// Барабаны на клиенте — это отдельные объекты vw_prop_casino_slot_0Xa_reels,
/// которые крутятся по оси X (символ = угол поворота). Сервер авторитарно
/// определяет исход спина (символы на барабанах + выплату) и проводит деньги.
/// На победу все 3 барабана останавливаются на одном символе.

// Уровни ставок (наличными). Игрок переключает стрелками на автомате.
const BET_LEVELS = [50, 100, 250, 500, 1000];
const MIN_BET = BET_LEVELS[0];
const MAX_BET = BET_LEVELS[BET_LEVELS.length - 1];

// Кол-во символов на барабане (= число позиций остановки, шаг = 360/REEL_SYMBOLS).
// Должно совпадать с клиентом.
const REEL_SYMBOLS = 6;

// Шанс выигрышного спина. RTP ≈ WIN_CHANCE * E[mult] (преимущество казино < 1).
// E[mult] по весам ниже = 3.87, поэтому 0.23 даёт ~0.89 (11% маржа казино).
const WIN_CHANCE = 0.23;

// Символы барабана: i — индекс позиции (0..REEL_SYMBOLS-1), weight — частота
// выпадения при выигрыше, mult — множитель выплаты при трёх одинаковых.
const SYMBOLS = [
	{ i: 0, name: 'Cherry', weight: 40, mult: 2 },
	{ i: 1, name: 'Lemon', weight: 25, mult: 3 },
	{ i: 2, name: 'Bell', weight: 18, mult: 4 },
	{ i: 3, name: 'Bar', weight: 10, mult: 6 },
	{ i: 4, name: 'Seven', weight: 5, mult: 10 },
	{ i: 5, name: 'Diamond', weight: 2, mult: 25 },
];

// 8 моделей слот-автоматов казино (vw_prop_casino_slot_01a .. 08a).
// theme — индекс темы для нативного scaleform SLOT_MACHINE (SET_THEME).
const MACHINES = [
	{ variant: 1, model: 'vw_prop_casino_slot_01a', theme: 0 },
	{ variant: 2, model: 'vw_prop_casino_slot_02a', theme: 1 },
	{ variant: 3, model: 'vw_prop_casino_slot_03a', theme: 2 },
	{ variant: 4, model: 'vw_prop_casino_slot_04a', theme: 3 },
	{ variant: 5, model: 'vw_prop_casino_slot_05a', theme: 4 },
	{ variant: 6, model: 'vw_prop_casino_slot_06a', theme: 5 },
	{ variant: 7, model: 'vw_prop_casino_slot_07a', theme: 6 },
	{ variant: 8, model: 'vw_prop_casino_slot_08a', theme: 7 },
];

function randInt(max) {
	return Math.floor(Math.random() * max);
}

function pickSymbolWeighted() {
	const total = SYMBOLS.reduce((s, x) => s + x.weight, 0);
	let roll = Math.random() * total;
	for (let i = 0; i < SYMBOLS.length; i++) {
		roll -= SYMBOLS[i].weight;
		if (roll < 0) return SYMBOLS[i];
	}
	return SYMBOLS[0];
}

module.exports = {
	BET_LEVELS,
	MIN_BET,
	MAX_BET,
	REEL_SYMBOLS,
	MACHINES,

	getMachines() {
		return MACHINES;
	},

	isValidBet(bet) {
		return BET_LEVELS.indexOf(parseInt(bet)) !== -1;
	},

	/// Сгенерировать исход спина.
	/// Возврат: { win, reels:[i,j,k], payout, multiplier, symbol }.
	generateSpin(bet) {
		bet = parseInt(bet);
		if (Math.random() < WIN_CHANCE) {
			const sym = pickSymbolWeighted();
			return {
				win: true,
				reels: [sym.i, sym.i, sym.i],
				payout: Math.floor(bet * sym.mult),
				multiplier: sym.mult,
				symbol: sym.name,
			};
		}

		// Проигрыш: три барабана, среди которых нет трёх одинаковых.
		let reels;
		do {
			reels = [randInt(REEL_SYMBOLS), randInt(REEL_SYMBOLS), randInt(REEL_SYMBOLS)];
		} while (reels[0] === reels[1] && reels[1] === reels[2]);

		return { win: false, reels, payout: 0, multiplier: 0, symbol: null };
	},
};
