'use strict';

/// Модуль колеса удачи Diamond Casino
/// Конфигурация секторов, призов, расчёт угла остановки

// Стоимость платной прокрутки (после исчерпания бесплатной)
const SPIN_PRICE = 500;
// Время кулдауна бесплатной прокрутки (24 часа)
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
// Количество секторов на колесе (стандарт GTA Online — 20)
const SECTORS_COUNT = 20;
// Угол одного сектора в градусах
const SECTOR_ANGLE = 360 / SECTORS_COUNT;

// Точка ColShape возле колеса (взято из рабочей C#-реализации aboba)
const WHEEL_INTERACT_POS = {
	x: 1110.2363,
	y: 227.8508,
	z: -50.755817,
};
const WHEEL_INTERACT_HEADING = 0;
// Позиции объектов колеса (из aboba/DiamondCasino.cs)
// База — статичная рамка на полу
const WHEEL_BASE_POS = {
	x: 1111.05,
	y: 229.81,
	z: -50.38,
};
// Диск с секторами — над базой на 1.25 м
const WHEEL_OBJECT_POS = {
	x: 1111.05,
	y: 229.81,
	z: -49.13,
};
const WHEEL_OBJECT_ROT = { x: 0, y: 0, z: 0 };
// Радиус ColShape (цилиндр в C# был radius=1, height=2; берём sphere побольше)
const WHEEL_INTERACT_RADIUS = 2.5;
// Размер игрового мира казино (dimension)
const WHEEL_DIMENSION = 1;
// Модели колеса (из aboba/DiamondCasino.cs)
const WHEEL_BASE_MODEL = 'vw_prop_vw_luckywheel_01a';
const WHEEL_DISC_MODEL = 'vw_prop_vw_luckywheel_02a';
// Длительность прокрутки и число полных оборотов
const SPIN_MIN_DURATION_MS = 12000;
const SPIN_TICK_MS = 15;
const SPIN_SPEED_DIVISOR = 10;
const FULL_ROTATIONS = 8;
// Задержка перед стартом вращения — клиент играет enter-анимации (~6 сек)
const SPIN_ANIM_LEAD_MS = 6000;
// Точка анимации у ручки (из aboba/DiamondCasino.cs _wheelPos)
const WHEEL_ANIM_POS = {
	x: 1109.76,
	y: 227.89,
	z: -49.64,
};
const WHEEL_ANIM_HEADING =
	((Math.atan2(
		WHEEL_OBJECT_POS.x - WHEEL_ANIM_POS.x,
		WHEEL_OBJECT_POS.y - WHEEL_ANIM_POS.y,
	) *
		180) /
		Math.PI +
		360) %
	360;
// Калибровка: если стрелка не попадает в сектор, подкрутить (градусы)
const WHEEL_POINTER_OFFSET = 0;
// Витринный автомобиль у колеса (модель = главный приз)
const WHEEL_SHOWCASE = {
	model: 'turismor',
	x: 1098.97,
	y: 219.76,
	z: -48.75,
	h: 140,
	color1: 111,
	color2: 111,
	rotateSpeedDegSec: 7,
};
// Слот с иконкой машины на текстуре колеса (тип 5, единственный — 19)
const WHEEL_CAR_SLOT = 19;

// Слоты 1..20 на текстуре стандартного колеса GTA (18° каждый).
// Тип сектора на дефолтной модели (из aboba/DiamondCasino.cs):
// 1=еда, 2=деньги, 3=одежда, 4=донат, 5=машина, 6=«пусто/особое»
const WHEEL_SLOT_TYPE = {
	1: 3,
	2: 1,
	3: 2,
	4: 4,
	5: 2,
	6: 1,
	7: 2,
	8: 4,
	9: 3,
	10: 1,
	11: 4,
	12: 6,
	13: 3,
	14: 1,
	15: 2,
	16: 4,
	17: 3,
	18: 1,
	19: 5,
	20: 2,
};
// Слоты по типу сектора
const SLOTS_BY_TYPE = {
	1: [2, 6, 10, 14, 18],
	2: [3, 5, 7, 15, 20],
	3: [1, 9, 13, 17],
	4: [4, 8, 11, 16],
	5: [19],
	6: [12],
};
// Какой тип сектора показывать для нашего приза
const PRIZE_SECTOR_TYPE = {
	cash: 2,
	item: 1,
	vehicle: 5,
	empty: 6,
};

// Типы призов
// type: 'cash' — деньги (amount: число), 'item' — предмет инвентаря (itemId, params)
// weight — относительный вес (чем больше, тем чаще выпадает)
// Сумма всех весов не обязана быть 100, RNG нормализует
const PRIZES = [
	// 0 — утешительные мелкие деньги
	{ id: 0, type: 'cash', amount: 500, text: '$500', weight: 15 },
	// 1 — основная сумма
	{ id: 1, type: 'cash', amount: 1000, text: '$1 000', weight: 12 },
	{ id: 2, type: 'cash', amount: 2500, text: '$2 500', weight: 10 },
	{ id: 3, type: 'cash', amount: 5000, text: '$5 000', weight: 8 },
	// 4 — крупные суммы
	{ id: 4, type: 'cash', amount: 10000, text: '$10 000', weight: 6 },
	{ id: 5, type: 'cash', amount: 20000, text: '$20 000', weight: 3 },
	{ id: 6, type: 'cash', amount: 50000, text: '$50 000', weight: 1 },
	// 7 — джекпот
	{ id: 7, type: 'cash', amount: 250000, text: 'ДЖЕКПОТ $250 000', weight: 1 },
	// 15 — автомобиль (сектор с иконкой машины, слот 19)
	{
		id: 15,
		type: 'vehicle',
		modelName: WHEEL_SHOWCASE.model,
		color1: WHEEL_SHOWCASE.color1,
		color2: WHEEL_SHOWCASE.color2,
		text: 'Автомобиль Turismo R',
		weight: 1,
	},
	// 8-12 — предметы инвентаря (id из crp.inventoryitems), без gender-зависимых полей
	{
		id: 8,
		type: 'item',
		itemId: 24,
		params: { health: 100 },
		text: 'Малая аптечка',
		weight: 6,
	},
	{ id: 9, type: 'item', itemId: 25, params: {}, text: 'Пластырь', weight: 6 },
	{
		id: 10,
		type: 'item',
		itemId: 35,
		params: {},
		text: 'Батончик шоколада',
		weight: 6,
	},
	{
		id: 11,
		type: 'item',
		itemId: 34,
		params: {},
		text: 'Бутылка воды',
		weight: 6,
	},
	{ id: 12, type: 'item', itemId: 16, params: {}, text: 'Сигареты', weight: 5 },
	// 13 — маска (требует gender — выставляется в момент вручения, см. events.js)
	{
		id: 13,
		type: 'item',
		itemId: 14,
		params: { variation: 1, texture: 0 },
		text: 'Маска',
		weight: 4,
		needGender: true,
	},
	// 14 — пустые секторы (ничего не выпало)
	{ id: 14, type: 'empty', text: 'Пусто', weight: 11 },
];

module.exports = {
	SPIN_PRICE,
	COOLDOWN_MS,
	SECTORS_COUNT,
	SECTOR_ANGLE,
	WHEEL_OBJECT_POS,
	WHEEL_OBJECT_ROT,
	WHEEL_BASE_POS,
	WHEEL_INTERACT_POS,
	WHEEL_INTERACT_RADIUS,
	WHEEL_DIMENSION,
	WHEEL_BASE_MODEL,
	WHEEL_DISC_MODEL,
	SPIN_MIN_DURATION_MS,
	SPIN_TICK_MS,
	SPIN_SPEED_DIVISOR,
	FULL_ROTATIONS,
	SPIN_ANIM_LEAD_MS,
	WHEEL_ANIM_POS,
	WHEEL_ANIM_HEADING,
	WHEEL_POINTER_OFFSET,
	WHEEL_SHOWCASE,
	WHEEL_CAR_SLOT,
	PRIZES,

	/// Случайный слот 1..20 под тип сектора на текстуре колеса
	pickWheelSlot(prize) {
		if (prize.type === 'vehicle') return WHEEL_CAR_SLOT;
		let sectorType = PRIZE_SECTOR_TYPE[prize.type] || 2;
		if (prize.type === 'item' && prize.itemId === 14) sectorType = 3; // маска → сектор одежды
		const slots = SLOTS_BY_TYPE[sectorType] || SLOTS_BY_TYPE[2];
		return slots[Math.floor(Math.random() * slots.length)];
	},

	/// Угол остановки для слота (как в C#: (slot - 1) * 18)
	getWinAngle(slotIndex) {
		return ((slotIndex - 1) * SECTOR_ANGLE + WHEEL_POINTER_OFFSET + 360) % 360;
	},

	/// Выбрать приз по взвешенному RNG. Возвращает ссылку на элемент PRIZES.
	pickPrize() {
		let total = 0;
		for (let i = 0; i < PRIZES.length; i++) total += PRIZES[i].weight;

		let roll = Math.random() * total;
		let acc = 0;
		for (let i = 0; i < PRIZES.length; i++) {
			acc += PRIZES[i].weight;
			if (roll < acc) return PRIZES[i];
		}
		return PRIZES[PRIZES.length - 1];
	},

	/// @deprecated — используй pickWheelSlot + getWinAngle
	pickSectorForPrize(prize) {
		return this.pickWheelSlot(prize);
	},

	getSectorAngle(sectorIndex) {
		return this.getWinAngle(sectorIndex);
	},

	/// Проверка: прошёл ли кулдаун с момента последней бесплатной прокрутки.
	isFreeSpinAvailable(lastSpinDate) {
		if (!lastSpinDate) return true;
		return Date.now() - new Date(lastSpinDate).getTime() >= COOLDOWN_MS;
	},

	/// Сколько миллисекунд осталось до бесплатной прокрутки (0, если доступна).
	getCooldownLeft(lastSpinDate) {
		if (!lastSpinDate) return 0;
		const passed = Date.now() - new Date(lastSpinDate).getTime();
		return Math.max(0, COOLDOWN_MS - passed);
	},

	/// Приз-автомобиль для колеса (тест /wheeltestcar)
	getVehiclePrize() {
		return PRIZES.find(p => p.type === 'vehicle') || null;
	},

	/// Сериализация приза для передачи на клиент (без серверных деталей).
	serializePrize(prize) {
		return {
			id: prize.id,
			type: prize.type,
			text: prize.text,
			amount: prize.amount || 0,
			modelName: prize.modelName || null,
		};
	},
};
