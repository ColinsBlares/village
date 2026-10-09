/// Слот-машины Diamond Casino (все 8 видов автоматов в интерьере).
/// Концепция как у скачек: исход считает сервер, клиент анимирует нативно.
/// Барабаны — это отдельные объекты vw_prop_casino_slot_0Xa_reels (3 шт.),
/// создаются на автомате и крутятся по оси X (символ = угол поворота).
/// Посадка — анимация anim_casino_a@amb@casino@games@slots@ + нативная
/// казино-камера (518572876). На победу 3 барабана встают на один символ.

// 8 моделей слот-автоматов казино.
const VARIANTS = [1, 2, 3, 4, 5, 6, 7, 8];
const MODELS = VARIANTS.map(v => ({
	variant: v,
	hash: mp.game.joaat(`vw_prop_casino_slot_0${v}a`),
	reelHash: mp.game.joaat(`vw_prop_casino_slot_0${v}a_reels`),
}));

// Координаты автомата через handle недоступны (entity-натив кидает ошибку на
// map-объектах казино). Поэтому точку автомата определяем ЛУЧОМ (raycast) перед
// игроком, сажаем игрока перед ней, а барабаны ставим в точке попадания.
const REEL_RIGHTS = [-0.12, 0.0, 0.12]; // смещение 3 барабанов вбок
const REEL_UP_EXTRA = 0.15; // приподнять барабаны над точкой луча
const SEAT_BACK = 0.55; // насколько отодвинуть посадку от автомата
// Фолбэк, если луч не попал: барабаны просто перед игроком.
const REEL_FWD = 0.5;
const REEL_UP = 0.95;

// Должно совпадать с сервером (packages/casino/slots.js).
const REEL_SYMBOLS = 6;
const STEP = 360 / REEL_SYMBOLS;
const BET_LEVELS = [50, 100, 250, 500, 1000];

// Радиусы поиска автомата для подсказки (от ближнего к дальнему).
const DETECT_RADII = [0.8, 1.1, 1.4];
const DETECT_INTERVAL_MS = 250;

const ANIM_DICT_MALE = 'anim_casino_a@amb@casino@games@slots@male';
const ANIM_DICT_FEMALE = 'anim_casino_a@amb@casino@games@slots@female';
const ANIM_BASE = 'base_slotmachine';

const CASINO_CAM_HASH = 518572876; // CASINO_SLOT_MACHINE_CAMERA

const SCALEFORM_NAME = 'SLOT_MACHINE';
const CASINO_INTERIOR_ID = 275201;

let isInCasino = false;
let nearMachine = null; // { variant, reelHash }
let seated = false;
let controlsLocked = false;
let currentBetIndex = 1;
let lastWin = 0;

let reels = []; // [{ obj, rest }] — mp.Object барабаны
let spin = null; // { reels:[{from,to,start,dur}], heading, result }
let machineHeading = 0;
let reelCenter = null; // абсолютная точка центра барабанов (mp.Vector3)
let rightVec = { x: 0, y: 0, z: 0 }; // единичный вектор "вправо" игрока
let scaleform = null;
let screenTarget = -1;
let renderTargetName = null;

let detectAcc = 0;

function easeOutCubic(t) {
	return 1 - Math.pow(1 - t, 3);
}

/// Оси игрока в мире (работает: методы самого игрока валидны).
function playerAxes() {
	const p = mp.players.local;
	const o0 = p.getOffsetFromInWorldCoords(0, 0, 0);
	const of = p.getOffsetFromInWorldCoords(0, 1, 0);
	const orr = p.getOffsetFromInWorldCoords(1, 0, 0);
	return {
		o0,
		fwd: { x: of.x - o0.x, y: of.y - o0.y, z: of.z - o0.z },
		right: { x: orr.x - o0.x, y: orr.y - o0.y, z: orr.z - o0.z },
	};
}

function requestModel(hash, cb) {
	try {
		mp.game.streaming.requestModel(hash);
	} catch (e) {}
	let tries = 0;
	const poll = mp.timer.add(() => {
		let loaded = false;
		try {
			loaded = mp.game.streaming.hasModelLoaded(hash);
		} catch (e) {}
		if (loaded || ++tries > 60) {
			mp.timer.remove(poll);
			cb(loaded);
		}
	}, 50);
}

/// Игрок в интерьере казино? (резерв на случай, если событие входа не пришло)
function inCasinoNow() {
	if (isInCasino) return true;
	try {
		const p = mp.players.local.position;
		return mp.game.interior.getInteriorAtCoords(p.x, p.y, p.z) === CASINO_INTERIOR_ID;
	} catch (e) {
		return false;
	}
}

function dict() {
	const isFemale = mp.players.local.model !== mp.game.joaat('mp_m_freemode_01');
	return isFemale ? ANIM_DICT_FEMALE : ANIM_DICT_MALE;
}

function requestAnimDict(d, cb) {
	if (mp.utils && mp.utils.requestAnimDict) return mp.utils.requestAnimDict(d, cb);
	try {
		mp.game.streaming.requestAnimDict(d);
	} catch (e) {}
	let tries = 0;
	const poll = mp.timer.add(() => {
		let loaded = false;
		try {
			loaded = mp.game.streaming.hasAnimDictLoaded(d);
		} catch (e) {}
		if (loaded || ++tries > 40) {
			mp.timer.remove(poll);
			cb();
		}
	}, 50);
}

let nearestDebug = null; // { variant, dist } — отладка

/// Поиск ближайшего слот-автомата: handle читать нельзя, но факт нахождения в
/// радиусе работает. Идём от меньшего радиуса к большему и берём вариант ближайшего.
function detectMachine() {
	const p = mp.players.local.position;
	for (const r of DETECT_RADII) {
		for (const m of MODELS) {
			let handle = 0;
			try {
				handle = mp.game.object.getClosestObjectOfType(
					p.x, p.y, p.z, r, m.hash, false, false, false,
				) || 0;
			} catch (e) {}
			if (handle) {
				nearMachine = { variant: m.variant, reelHash: m.reelHash };
				nearestDebug = { variant: m.variant, dist: r };
				return;
			}
		}
	}
	nearMachine = null;
	nearestDebug = null;
}

/// Создать 3 барабана как клиентские mp.Object в точке автомата (reelCenter).
function createReels() {
	deleteReels();
	if (!nearMachine || !reelCenter) return;
	const reelHash = nearMachine.reelHash;
	requestModel(reelHash, loaded => {
		if (!loaded || !seated || !reelCenter) return;
		const dim = mp.players.local.dimension;
		for (let k = 0; k < 3; k++) {
			const w = new mp.Vector3(
				reelCenter.x + rightVec.x * REEL_RIGHTS[k],
				reelCenter.y + rightVec.y * REEL_RIGHTS[k],
				reelCenter.z + REEL_UP_EXTRA,
			);
			let obj = null;
			try {
				obj = mp.objects.new(reelHash, w, {
					rotation: new mp.Vector3(0, 0, (machineHeading + 180) % 360),
					dimension: dim,
				});
			} catch (e) {}
			reels[k] = { obj, rest: 0 };
		}
		try {
			mp.game.streaming.setModelAsNoLongerNeeded(reelHash);
		} catch (e) {}
	});
}

function deleteReels() {
	for (const r of reels) {
		if (r && r.obj) {
			try {
				r.obj.destroy();
			} catch (e) {}
		}
	}
	reels = [];
}

/// Нативный экран автомата (scaleform SLOT_MACHINE) — best-effort.
function enableScreen() {
	renderTargetName = `machine_0${nearMachine.variant}a`;
	try {
		mp.game.ui.registerNamedRendertarget(renderTargetName, false);
		mp.game.ui.linkNamedRendertarget(MODELS[nearMachine.variant - 1].hash);
		screenTarget = mp.game.ui.getNamedRendertargetRenderId(renderTargetName);
	} catch (e) {
		screenTarget = -1;
	}
	try {
		scaleform = mp.game.graphics.requestScaleformMovie(SCALEFORM_NAME);
	} catch (e) {
		scaleform = null;
	}
	let tries = 0;
	const poll = mp.timer.add(() => {
		let loaded = false;
		try {
			loaded = scaleform !== null && mp.game.graphics.hasScaleformMovieLoaded(scaleform);
		} catch (e) {}
		if (loaded) {
			mp.timer.remove(poll);
			callMethod('SET_THEME', [{ t: 'i', v: nearMachine.variant - 1 }]);
			updateScreen();
		} else if (++tries > 60) {
			mp.timer.remove(poll);
		}
	}, 50);
}

function disableScreen() {
	if (scaleform !== null) {
		try {
			mp.game.graphics.setScaleformMovieAsNoLongerNeeded(scaleform);
		} catch (e) {}
		scaleform = null;
	}
	if (renderTargetName) {
		try {
			if (mp.game.ui.isNamedRendertargetRegistered(renderTargetName)) {
				mp.game.ui.releaseNamedRendertarget(renderTargetName);
			}
		} catch (e) {}
	}
	renderTargetName = null;
	screenTarget = -1;
}

function callMethod(method, params) {
	if (scaleform === null) return;
	try {
		mp.game.graphics.beginScaleformMovieMethod(scaleform, method);
		for (const p of params) {
			if (p.t === 'i') mp.game.graphics.scaleformMovieMethodAddParamInt(p.v);
			else if (p.t === 'f') mp.game.graphics.scaleformMovieMethodAddParamFloat(p.v);
			else if (p.t === 'b') mp.game.graphics.scaleformMovieMethodAddParamBool(p.v);
			else if (p.t === 's')
				mp.game.graphics.scaleformMovieMethodAddParamTextureNameString(String(p.v));
		}
		mp.game.graphics.endScaleformMovieMethod();
	} catch (e) {}
}

function updateScreen() {
	callMethod('SET_BET', [{ t: 'i', v: BET_LEVELS[currentBetIndex] }]);
	callMethod('SET_LAST_WIN', [{ t: 'i', v: lastWin }]);
}

function sit() {
	if (seated || !nearMachine) return;
	if (mp.busy.includes()) return;
	if (!mp.busy.add('casino.slots', false, true)) return;

	seated = true;
	controlsLocked = false;

	const player = mp.players.local;
	machineHeading = player.getHeading();
	const ax = playerAxes();
	rightVec = ax.right;

	// Луч на уровне головы вперёд — ищем поверхность автомата.
	let hit = null;
	try {
		const start = player.getOffsetFromInWorldCoords(0, 0, 0.6);
		const end = player.getOffsetFromInWorldCoords(0, 2.5, 0.6);
		hit = mp.raycasting.testPointToPoint(start, end, undefined, 17);
	} catch (e) {}

	if (hit && hit.position) {
		reelCenter = new mp.Vector3(hit.position.x, hit.position.y, hit.position.z);
		// Посадить игрока перед автоматом (отодвинуть от точки попадания).
		try {
			player.setCoordsNoOffset(
				hit.position.x - ax.fwd.x * SEAT_BACK,
				hit.position.y - ax.fwd.y * SEAT_BACK,
				ax.o0.z,
				false, false, false,
			);
		} catch (e) {}
	} else {
		const c = player.getOffsetFromInWorldCoords(0, REEL_FWD, REEL_UP);
		reelCenter = new mp.Vector3(c.x, c.y, c.z);
	}

	const d = dict();
	requestAnimDict(d, () => {
		try {
			player.setHeading(machineHeading);
		} catch (e) {}
		try {
			player.taskPlayAnim(d, ANIM_BASE, 8.0, -8.0, -1, 1, 0, false, false, false);
		} catch (e) {}
		try {
			player.freezePosition(true);
		} catch (e) {}
	});

	createReels();
	enableScreen();

	mp.game.graphics.notify(
		'~y~Слоты~w~: ~b~↑/↓~w~ ставка · ~b~Enter~w~ крутить · ~b~Backspace~w~ выйти',
	);
}

function exitSlot() {
	if (!seated) return;
	seated = false;
	controlsLocked = false;
	spin = null;

	const player = mp.players.local;
	try {
		player.freezePosition(false);
	} catch (e) {}
	try {
		player.clearTasks();
	} catch (e) {}

	deleteReels();
	disableScreen();
	reelCenter = null;
	mp.busy.remove('casino.slots', true);
}

function playReaction(win) {
	const d = dict();
	const anim = win ? 'win_big_a' : 'lose_a';
	try {
		mp.players.local.taskPlayAnim(d, anim, 8.0, -8.0, 2200, 48, 0, false, false, false);
	} catch (e) {}
	// Возврат в базовую позу
	mp.timer.add(() => {
		if (!seated) return;
		try {
			mp.players.local.taskPlayAnim(d, ANIM_BASE, 8.0, -8.0, -1, 1, 0, false, false, false);
		} catch (e) {}
	}, 2300);
}

function startSpin(result) {
	if (!seated || reels.length < 3) {
		controlsLocked = false;
		return;
	}
	const now = Date.now();
	spin = { reels: [], heading: machineHeading, result };
	for (let k = 0; k < 3; k++) {
		const reel = reels[k];
		const cur = reel ? reel.rest : 0;
		const curMod = ((cur % 360) + 360) % 360;
		const targetMod = result.reels[k] * STEP;
		const delta = (((targetMod - curMod) % 360) + 360) % 360;
		const to = cur + (5 + k) * 360 + delta;
		spin.reels.push({ from: cur, to, start: now, dur: 2200 + k * 650 });
	}
}

function onSpinComplete(result) {
	lastWin = result.win ? result.payout : 0;
	updateScreen();
	playReaction(result.win);
	controlsLocked = false;
	mp.events.callRemote('casino.slots.spin.done');
}

function changeBet(dir) {
	if (!seated || controlsLocked) return;
	currentBetIndex = Math.max(0, Math.min(BET_LEVELS.length - 1, currentBetIndex + dir));
	updateScreen();
}

function doSpin() {
	if (controlsLocked || spin) return;
	controlsLocked = true;
	mp.events.callRemote('casino.slots.spin', BET_LEVELS[currentBetIndex]);
}

mp.events.add({
	'casino.area.enter': enter => {
		isInCasino = !!enter;
		if (!enter) {
			nearMachine = null;
			if (seated) exitSlot();
		}
	},

	'casino.slots.result': data => {
		if (typeof data === 'string') data = JSON.parse(data);
		if (!data || !Array.isArray(data.reels)) {
			controlsLocked = false;
			return;
		}
		startSpin(data);
	},

	'casino.slots.spin.fail': () => {
		controlsLocked = false;
	},

	/// Диагностика (команда /slotscan): проверка способов получить координаты
	/// найденного автомата. Короткая строка (<100 символов).
	'casino.slots.scan': () => {
		const p = mp.players.local.position;
		let h = 0;
		let found = 0;
		for (const m of MODELS) {
			let hh = 0;
			try {
				hh = mp.game.object.getClosestObjectOfType(
					p.x, p.y, p.z, 8.0, m.hash, false, false, false,
				) || 0;
			} catch (e) {}
			if (hh) {
				found++;
				if (!h) h = hh;
			}
		}
		const test = fn => {
			try {
				const c = fn();
				return c && typeof c.x === 'number' ? `ok(${c.x.toFixed(0)})` : 'no';
			} catch (e) {
				return 'ERR';
			}
		};
		let gc = '-', off = '-', inv = '-', exist = '-';
		if (h) {
			gc = test(() => mp.game.entity.getEntityCoords(h, false));
			off = test(() => mp.game.entity.getOffsetFromEntityInWorldCoords(h, 0, 0, 0));
			inv = test(() => mp.game.invoke('0x3FEF770D40960D5A', h, true));
			try {
				exist = String(mp.game.entity.doesEntityExist(h));
			} catch (e) {
				exist = 'ERR';
			}
		}
		const msg = `found=${found} h=${h} ex=${exist} gc=${gc} off=${off} inv=${inv}`;
		mp.events.call('chat.message.push', `!{#ffd600}[СЛОТЫ] ${msg}`);
		try {
			mp.console.logInfo(`[СЛОТЫ scan] ${msg}`);
		} catch (e) {}
	},

	/// Тестовый спин без денег (команда /slottest) — только визуал барабанов.
	'casino.slots.test': win => {
		if (!seated || controlsLocked || spin) return;
		controlsLocked = true;
		let r;
		if (win) {
			const i = Math.floor(Math.random() * REEL_SYMBOLS);
			r = [i, i, i];
		} else {
			do {
				r = [
					Math.floor(Math.random() * REEL_SYMBOLS),
					Math.floor(Math.random() * REEL_SYMBOLS),
					Math.floor(Math.random() * REEL_SYMBOLS),
				];
			} while (r[0] === r[1] && r[1] === r[2]);
		}
		startSpin({ reels: r, win: !!win, payout: 0, multiplier: 0, bet: BET_LEVELS[currentBetIndex] });
	},
});

mp.keys.bind(0x45, true, () => {
	// E — сесть за ближайший автомат (модели слотов есть только в казино)
	if (seated) return;
	detectMachine();
	if (!nearMachine) {
		const d = nearestDebug
			? `ближайший 0${nearestDebug.variant}a в ${nearestDebug.dist.toFixed(2)}м`
			: `модель слота не найдена`;
		mp.game.graphics.notify(`~y~Слоты~w~: автомат не найден (${d})`);
		return;
	}
	if (mp.busy.includes()) {
		mp.game.graphics.notify(`~y~Слоты~w~: занято (busy), нельзя сесть`);
		return;
	}
	sit();
});

mp.keys.bind(0x26, true, () => changeBet(1)); // ↑
mp.keys.bind(0x28, true, () => changeBet(-1)); // ↓
mp.keys.bind(0x0d, true, () => {
	if (seated) doSpin();
}); // Enter
mp.keys.bind(0x20, true, () => {
	if (seated) doSpin();
}); // Space
mp.keys.bind(0x08, true, () => {
	if (seated) exitSlot();
}); // Backspace

mp.events.add('render', () => {
	// Поиск автомата (когда не сидим)
	if (!seated) {
		detectAcc += mp.game.misc.getFrameTime ? mp.game.misc.getFrameTime() * 1000 : 16;
		if (detectAcc >= DETECT_INTERVAL_MS) {
			detectAcc = 0;
			if (inCasinoNow()) detectMachine();
			else nearMachine = null;
		}
		if (nearMachine && !mp.busy.includes()) {
			drawHelp('~b~E~w~ — играть в слоты');
		}
		return;
	}

	// Удержание казино-камеры на автомате
	try {
		mp.game.invoke('0x79C0E43EB9B944E2', CASINO_CAM_HASH);
	} catch (e) {}

	// Блокировка перемещения/атаки за автоматом
	for (const c of [21, 22, 24, 25, 30, 31, 32, 33, 34, 35, 44, 140, 141, 142]) {
		try {
			mp.game.controls.disableControlAction(0, c, true);
		} catch (e) {}
	}

	// Анимация барабанов
	if (spin) {
		const now = Date.now();
		let allDone = true;
		for (let k = 0; k < spin.reels.length; k++) {
			const r = spin.reels[k];
			let t = (now - r.start) / r.dur;
			if (t < 1) allDone = false;
			else t = 1;
			const ang = r.from + (r.to - r.from) * easeOutCubic(t);
			const reel = reels[k];
			if (reel && reel.obj) {
				try {
					reel.obj.rotation = new mp.Vector3(ang % 360, 0, spin.heading);
				} catch (e) {}
				if (t >= 1) reel.rest = r.to % 360;
			}
		}
		if (allDone) {
			const res = spin.result;
			spin = null;
			onSpinComplete(res);
		}
	}

	// Нативный экран автомата
	if (scaleform !== null && screenTarget !== -1) {
		try {
			mp.game.ui.setTextRenderId(screenTarget);
			mp.game.invoke('0x61BB1D9B3A95D802', 4);
			mp.game.invoke('0xC6372ECD45D73BCD', true);
			mp.game.graphics.drawScaleformMovieFullscreen(scaleform, 255, 255, 255, 255, 0);
			mp.game.ui.setTextRenderId(1);
		} catch (e) {}
	}

	// HUD ставки/выигрыша
	const betText = `Ставка: ~y~$${BET_LEVELS[currentBetIndex]}~w~   Выигрыш: ~g~$${lastWin}`;
	drawCenter(betText, 0.86);
	drawCenter(
		spin ? '~o~Крутится...' : '~b~↑/↓~w~ ставка · ~b~Enter~w~ крутить · ~b~Backspace~w~ выйти',
		0.90,
	);
});

function drawCenter(text, y) {
	try {
		mp.game.graphics.drawText(text, [0.5, y], {
			font: 4,
			color: [255, 255, 255, 220],
			scale: [0.45, 0.45],
			outline: true,
			centre: true,
		});
	} catch (e) {}
}

function drawHelp(text) {
	try {
		mp.game.graphics.drawText(text, [0.5, 0.82], {
			font: 4,
			color: [255, 255, 255, 220],
			scale: [0.5, 0.5],
			outline: true,
			centre: true,
		});
	} catch (e) {}
}
