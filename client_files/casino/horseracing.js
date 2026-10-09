/// Скачки Diamond Casino (Inside Track).
/// Ставка делается через меню/ввод (как кости), а забег рисуется НАТИВНО на экране
/// Inside Track через scaleform HORSE_RACING_WALL, выводимый в render target,
/// привязанный к модели нативного экрана vw_vwint01_betting_screen.
/// Порядок финиша задаёт сервер — экран анимирует забег именно к нему.

const SCALEFORM_NAME = 'HORSE_RACING_WALL';
const RENDER_TARGET_NAME = 'casinoscreen_02';
const SCREEN_MODEL = mp.game.joaat('vw_vwint01_betting_screen');
const MIN_BET = 100;
const MAX_BET = 10000;

// Пакеты цветов лошадей [primary, secondary, horse, mane] (packed RGB) — как в нативе.
const HORSE_STYLES = [
	[15553363, 5474797, 9858144, 4671302],
	[16724530, 3684408, 14807026, 16777215],
	[13560920, 15582764, 16770746, 7500402],
	[16558591, 5090807, 10446437, 7493977],
	[5090807, 16558591, 3815994, 9393493],
	[16269415, 16767010, 10329501, 16777215],
];

let isNearITB = false;
let horses = [];
let scaleform = null;
let screenTarget = -1;
let bigScreenActive = false;
let race = null; // { endAt, test }

function callMethod(method, params) {
	if (scaleform === null) return;
	try {
		mp.game.graphics.beginScaleformMovieMethod(scaleform, method);
		for (let i = 0; i < params.length; i++) {
			const p = params[i];
			if (p.t === 'i') mp.game.graphics.scaleformMovieMethodAddParamInt(p.v);
			else if (p.t === 'f') mp.game.graphics.scaleformMovieMethodAddParamFloat(p.v);
			else if (p.t === 'b') mp.game.graphics.scaleformMovieMethodAddParamBool(p.v);
			else if (p.t === 's')
				mp.game.graphics.scaleformMovieMethodAddParamTextureNameString(String(p.v));
		}
		mp.game.graphics.endScaleformMovieMethod();
	} catch (e) {}
}

/// Заполнить 6 лошадей на экране (номер, имя, коэффициент, цвета).
function addHorses() {
	for (let i = 0; i < 6; i++) {
		const h = horses[i] || { num: i + 1, name: `Horse ${i + 1}`, odds: 2 };
		const style = HORSE_STYLES[i] || HORSE_STYLES[0];
		callMethod('SET_HORSE', [
			{ t: 'i', v: h.num },
			{ t: 's', v: h.name },
			{ t: 's', v: `${h.odds}/1` },
			{ t: 'i', v: style[0] },
			{ t: 'i', v: style[1] },
			{ t: 'i', v: style[2] },
			{ t: 'i', v: style[3] },
		]);
	}
}

/// Включить нативный экран Inside Track (render target + scaleform).
function enableBigScreen() {
	if (bigScreenActive) return;
	try {
		mp.game.ui.registerNamedRendertarget(RENDER_TARGET_NAME, false);
		mp.game.ui.linkNamedRendertarget(SCREEN_MODEL);
		screenTarget = mp.game.ui.getNamedRendertargetRenderId(RENDER_TARGET_NAME);
	} catch (e) {
		return;
	}

	scaleform = mp.game.graphics.requestScaleformMovie(SCALEFORM_NAME);
	let tries = 0;
	const poll = mp.timer.add(() => {
		let loaded = false;
		try {
			loaded = mp.game.graphics.hasScaleformMovieLoaded(scaleform);
		} catch (e) {}
		if (loaded) {
			mp.timer.remove(poll);
			callMethod('SHOW_SCREEN', [{ t: 'i', v: 0 }]);
			try {
				// SET_SCALEFORM_FIT_RENDERTARGET — растянуть на весь экран
				if (typeof mp.game.graphics.setScaleformFitRendertarget === 'function') {
					mp.game.graphics.setScaleformFitRendertarget(scaleform, true);
				}
			} catch (e) {}
			addHorses();
			bigScreenActive = true;
		} else if (++tries > 100) {
			mp.timer.remove(poll);
		}
	}, 50);
}

function disableBigScreen() {
	bigScreenActive = false;
	race = null;
	screenTarget = -1;
	if (scaleform !== null) {
		try {
			mp.game.graphics.setScaleformMovieAsNoLongerNeeded(scaleform);
		} catch (e) {}
		scaleform = null;
	}
}

function startRace(data) {
	// Забег завершается по таймеру (результат выдаётся даже если экран не успел).
	race = {
		endAt: Date.now() + data.durationSec * 1000 + 3000,
		test: !!data.test,
	};

	const run = () => {
		if (!race || scaleform === null || !bigScreenActive) return;
		addHorses();
		callMethod('SHOW_SCREEN', [{ t: 'i', v: 0 }]);
		const o = data.order;
		// START_RACE: длительность(Float, МС), сид(Int), порядок 1..6(Int),
		// offset(Float 0.0), sync(Bool false)
		callMethod('START_RACE', [
			{ t: 'f', v: data.durationSec * 1000.0 },
			{ t: 'i', v: data.seed },
			{ t: 'i', v: o[0] },
			{ t: 'i', v: o[1] },
			{ t: 'i', v: o[2] },
			{ t: 'i', v: o[3] },
			{ t: 'i', v: o[4] },
			{ t: 'i', v: o[5] },
			{ t: 'f', v: 0.0 },
			{ t: 'b', v: false },
		]);
	};

	// Если экран ещё не готов — дождёмся
	if (bigScreenActive && scaleform !== null) {
		run();
	} else {
		enableBigScreen();
		let tries = 0;
		const wait = mp.timer.add(() => {
			if (bigScreenActive && scaleform !== null) {
				mp.timer.remove(wait);
				run();
			} else if (++tries > 100) {
				mp.timer.remove(wait);
			}
		}, 50);
	}
}

function finishRace() {
	const wasTest = race && race.test;
	race = null;
	if (!wasTest) mp.events.callRemote('casino.horse.race.done');
}

mp.events.add({
	'casino.horse.area': enter => {
		isNearITB = !!enter;
		if (enter) {
			enableBigScreen();
			mp.game.graphics.notify('~b~Скачки~w~: нажмите ~b~E~w~ для ставки');
		} else {
			disableBigScreen();
		}
	},

	'casino.horse.menu.show': data => {
		if (typeof data === 'string') data = JSON.parse(data);
		horses = data || [];
		const items = horses.map(h => ({
			text: `${h.num}. ${h.name} (x${h.odds})`,
			icon: 'dice.svg',
		}));
		mp.callCEFV(
			`interactionMenu.menus['casino_horses'].items = ${JSON.stringify(items)};
			 interactionMenu.showByName('casino_horses');`,
		);
	},

	/// Выбор лошади из меню → окно ввода суммы
	'casino.horse.select': index => {
		const horse = horses[index];
		if (!horse) return;
		mp.callCEFV(
			`inputWindow.name = 'horse_bet';
			 inputWindow.horse = ${horse.num};
			 inputWindow.header = "Ставка: ${horse.name} (x${horse.odds})";
			 inputWindow.description = "";
			 inputWindow.hint = "Сумма ставки ($${MIN_BET} - $${MAX_BET})";
			 inputWindow.inputHint = "Сумма...";
			 inputWindow.leftWord = "Поставить";
			 inputWindow.rightWord = "Отмена";
			 inputWindow.value = "";
			 inputWindow.show = true;`,
		);
	},

	'casino.horse.bet.fail': () => {
		// Ставка отклонена сервером — ничего блокировать не нужно.
	},

	'casino.horse.race.start': data => {
		if (typeof data === 'string') data = JSON.parse(data);
		if (!data || !Array.isArray(data.order) || data.order.length < 6) return;
		if (Array.isArray(data.horses)) horses = data.horses;
		startRace(data);
	},

	'casino.horse.debug.screen': () => {
		// Координаты экрана больше не нужны (render target на модель).
	},
});

mp.keys.bind(0x45, true, () => {
	if (!isNearITB) return;
	if (mp.busy.includes()) return;
	if (race) return;
	mp.events.callRemote('casino.horse.open');
});

mp.events.add('render', () => {
	// Завершение забега по таймеру
	if (race && Date.now() >= race.endAt) finishRace();

	// Отрисовка нативного экрана Inside Track
	if (!bigScreenActive || scaleform === null || screenTarget === -1) return;

	try {
		mp.game.ui.setTextRenderId(screenTarget);
		mp.game.invoke('0x61BB1D9B3A95D802', 4); // SET_SCRIPT_GFX_DRAW_ORDER
		mp.game.invoke('0xC6372ECD45D73BCD', true); // DRAW_BEHIND_PAUSEMENU
		mp.game.graphics.drawScaleformMovieFullscreen(scaleform, 255, 255, 255, 255, 0);
		mp.game.ui.setTextRenderId(1);
	} catch (e) {}
});
