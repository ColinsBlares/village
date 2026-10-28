/// Слот-машины Diamond Casino (все 8 видов автоматов в интерьере).
/// Концепция как у скачек: исход считает сервер, клиент анимирует нативно.
/// Барабаны — это отдельные объекты vw_prop_casino_slot_0Xa_reels (3 шт.),
/// создаются на автомате и крутятся по оси X (символ = угол поворота).
/// Посадка — enter_left/enter_right в сцене автомата, затем base_idle_a.
/// Барабаны — отдельные объекты в гнёздах автомата, крутятся по его heading.

// 8 моделей слот-автоматов казино.
const VARIANTS = [1, 2, 3, 4, 5, 6, 7, 8];
const MODELS = VARIANTS.map(v => ({
	variant: v,
	hash: mp.game.joaat(`vw_prop_casino_slot_0${v}a`),
	reelHash: mp.game.joaat(`vw_prop_casino_slot_0${v}a_reels`),
}));

// Локальные гнёзда барабанов относительно origin автомата (как в скрипте казино).
const REEL_OFFSETS = [
	[-0.115, 0.047, 0.906],
	[0.005, 0.047, 0.906],
	[0.125, 0.047, 0.906],
];

// Должно совпадать с сервером (packages/casino/slots.js).
const REEL_SYMBOLS = 6;
const STEP = 360 / REEL_SYMBOLS;
const BET_LEVELS = [50, 100, 250, 500, 1000];

// Радиусы поиска автомата для подсказки (от ближнего к дальнему).
const DETECT_RADII = [1.2, 1.6, 2.0];
const DETECT_INTERVAL_MS = 250;

const ANIM_DICT_MALE = 'anim_casino_a@amb@casino@games@slots@male';
const ANIM_DICT_FEMALE = 'anim_casino_a@amb@casino@games@slots@female';
const ANIM_IDLE = 'base_idle_a';
const ANIM_ENTER = { left: 'enter_left', right: 'enter_right' };
const ANIM_EXIT = { left: 'exit_left', right: 'exit_right' };

const CASINO_CAM_HASH = 518572876; // CASINO_SLOT_MACHINE_CAMERA

const SCALEFORM_NAME = 'SLOT_MACHINE';
const CASINO_INTERIOR_ID = 275201;

let isInCasino = false;
let nearMachine = null; // { variant, reelHash, hash, handle }
let seated = false;
let seatReady = false;
let leaving = false;
let reacting = false;
let seatToken = 0;
let enterSide = 'right';
let controlsLocked = false;
let currentBetIndex = 1;
let lastWin = 0;

let reels = []; // [{ obj, rest }] — mp.Object барабаны
let spin = null; // { reels:[{from,to,start,dur}], result }
let machineHandle = 0;
let machineHeading = 0;
let machinePos = null;
let scaleform = null;
let screenTarget = -1;
let renderTargetName = null;

let detectAcc = 0;
let idleAcc = 0;

function easeOutCubic(t) {
	return 1 - Math.pow(1 - t, 3);
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

function asVec(c) {
	if (!c) return null;
	const x = Array.isArray(c) ? c[0] : c.x;
	const y = Array.isArray(c) ? c[1] : c.y;
	const z = Array.isArray(c) ? c[2] : c.z;
	if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') return null;
	if (!isFinite(x) || !isFinite(y) || !isFinite(z)) return null;
	if (Math.abs(x) + Math.abs(y) + Math.abs(z) < 1) return null;
	return new mp.Vector3(x, y, z);
}

/// Координаты map-пропа. Обёртка entity.* на интерьерных объектах кидает ошибку,
/// поэтому читаем натив напрямую.
function entityCoords(handle) {
	if (!handle) return null;
	try {
		return asVec(mp.game.invokeVector3('0x3FEF770D40960D5A', handle, false));
	} catch (e) {}
	try {
		return asVec(mp.game.entity.getEntityCoords(handle, false));
	} catch (e) {}
	return null;
}

function entityHeading(handle) {
	if (!handle) return null;
	try {
		const h = mp.game.invokeFloat('0xE83D4F9BA2A38914', handle);
		if (typeof h === 'number' && isFinite(h)) return (h % 360 + 360) % 360;
	} catch (e) {}
	try {
		const r = asVec(mp.game.invokeVector3('0xAFBD61CC738D9EB9', handle, 2));
		if (r) return (r.z % 360 + 360) % 360;
	} catch (e) {}
	return null;
}

function offsetFromEntity(handle, x, y, z) {
	if (!handle) return null;
	try {
		return asVec(mp.game.invokeVector3('0x1899F328B0E12848', handle, x, y, z));
	} catch (e) {}
	try {
		return asVec(mp.game.entity.getOffsetFromEntityInWorldCoords(handle, x, y, z));
	} catch (e) {}
	return null;
}

/// heading 0 смотрит на +Y, локальный X — вправо.
function offsetByHeading(pos, heading, x, y, z) {
	const rad = (heading * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	return new mp.Vector3(
		pos.x + x * cos - y * sin,
		pos.y + x * sin + y * cos,
		pos.z + z,
	);
}

function animMs(d, name, fallback) {
	try {
		const sec = mp.game.invokeFloat('0xFEDDF04D62B8D790', d, name);
		if (typeof sec === 'number' && sec > 0.2 && sec < 20) return Math.ceil(sec * 1000);
	} catch (e) {}
	return fallback;
}

function isPlaying(name) {
	try {
		return mp.players.local.isPlayingAnim(dict(), name, 3);
	} catch (e) {
		return true;
	}
}

let nearestDebug = null; // { variant, dist } — отладка

function closestHandle(pos, radius, hash) {
	try {
		return mp.game.object.getClosestObjectOfType(
			pos.x, pos.y, pos.z, radius, hash, false, false, false,
		) || 0;
	} catch (e) {
		return 0;
	}
}

/// Ближайший автомат по origin, а не по первому попавшемуся радиусу.
function detectMachine() {
	const p = mp.players.local.position;
	const maxR = DETECT_RADII[DETECT_RADII.length - 1];
	let best = null;
	let bestDist = maxR;
	for (const m of MODELS) {
		const handle = closestHandle(p, maxR, m.hash);
		if (!handle) continue;
		const coords = entityCoords(handle);
		let dist = maxR - 0.001;
		if (coords) {
			const dx = coords.x - p.x;
			const dy = coords.y - p.y;
			const dz = coords.z - p.z;
			dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
		}
		if (dist < bestDist) {
			bestDist = dist;
			best = { variant: m.variant, reelHash: m.reelHash, hash: m.hash, handle, dist };
		}
	}
	if (!best) {
		nearMachine = null;
		nearestDebug = null;
		return;
	}
	nearMachine = best;
	nearestDebug = { variant: best.variant, dist: best.dist };
}

function reelWorldPos(k) {
	const off = REEL_OFFSETS[k];
	const fromEnt = offsetFromEntity(machineHandle, off[0], off[1], off[2]);
	if (fromEnt) return fromEnt;
	if (!machinePos) return null;
	return offsetByHeading(machinePos, machineHeading, off[0], off[1], off[2]);
}

/// Order 2 держит диск вертикально: pitch крутит символы, yaw = heading автомата.
function setReelRot(obj, pitch) {
	if (!obj) return;
	try {
		obj.setRotation(pitch, 0, machineHeading, 2, true);
		return;
	} catch (e) {}
	try {
		obj.rotation = new mp.Vector3(pitch, 0, machineHeading);
	} catch (e) {}
}

/// Создать 3 барабана в гнёздах автомата.
function createReels() {
	deleteReels();
	if (!nearMachine || !machinePos) return;
	const reelHash = nearMachine.reelHash;
	const token = seatToken;
	requestModel(reelHash, loaded => {
		if (!loaded || !seated || token !== seatToken || !machinePos) return;
		const dim = mp.players.local.dimension;
		for (let k = 0; k < 3; k++) {
			const w = reelWorldPos(k);
			if (!w) continue;
			let obj = null;
			try {
				obj = mp.objects.new(reelHash, w, {
					rotation: new mp.Vector3(0, 0, machineHeading),
					dimension: dim,
				});
			} catch (e) {}
			if (obj) {
				setReelRot(obj, 0);
				try {
					obj.freezePosition(true);
				} catch (e) {}
				try {
					obj.setCollision(false, false);
				} catch (e) {}
			}
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

/// Поза автомата: origin и heading пропа, иначе луч по нормали стекла.
function resolveMachinePose(machine) {
	const player = mp.players.local;
	const handle = machine.handle || closestHandle(player.position, 2.2, machine.hash);
	const coords = entityCoords(handle);
	const heading = entityHeading(handle);
	if (coords && heading != null) return { handle, coords, heading };

	let hit = null;
	try {
		const start = player.getOffsetFromInWorldCoords(0, 0.15, 0.9);
		const end = player.getOffsetFromInWorldCoords(0, 1.8, 0.9);
		hit = mp.raycasting.testPointToPoint(start, end, player.handle, 17);
	} catch (e) {}
	if (!hit || !hit.position || !hit.surfaceNormal) return null;
	const n = hit.surfaceNormal;
	const h = (Math.atan2(-n.x, n.y) * 180 / Math.PI + 360) % 360;
	return {
		handle,
		coords: new mp.Vector3(
			hit.position.x - n.x * 0.55,
			hit.position.y - n.y * 0.55,
			player.position.z,
		),
		heading: h,
	};
}

function sideOfMachine() {
	const p = mp.players.local.position;
	const rad = (machineHeading * Math.PI) / 180;
	const side = (p.x - machinePos.x) * Math.cos(rad) + (p.y - machinePos.y) * Math.sin(rad);
	return side >= 0 ? 'right' : 'left';
}

/// Сцена посадки — origin автомата. Анимация сама доводит педа до стула.
function playScene(name, flag) {
	const player = mp.players.local;
	const d = dict();
	if (!machinePos) return;
	try {
		player.taskPlayAnimAdvanced(
			d,
			name,
			machinePos.x, machinePos.y, machinePos.z,
			0, 0, machineHeading,
			8.0, -8.0,
			-1,
			flag,
			0, false, false,
		);
	} catch (e) {}
}

function sit() {
	if (seated || !nearMachine) return;
	if (mp.busy.includes()) return;
	if (!mp.busy.add('casino.slots', false, true)) return;

	const pose = resolveMachinePose(nearMachine);
	if (!pose) {
		mp.busy.remove('casino.slots', true);
		mp.game.graphics.notify('~y~Слоты~w~: не удалось встать к автомату');
		return;
	}

	const token = ++seatToken;
	seated = true;
	seatReady = false;
	leaving = false;
	reacting = false;
	controlsLocked = false;
	machineHandle = pose.handle || 0;
	machinePos = pose.coords;
	machineHeading = pose.heading;
	enterSide = sideOfMachine();

	const player = mp.players.local;
	try {
		player.freezePosition(false);
	} catch (e) {}

	const d = dict();
	const enterName = ANIM_ENTER[enterSide];
	requestAnimDict(d, () => {
		if (token !== seatToken || !seated) return;
		playScene(enterName, 2);
		const ms = animMs(d, enterName, 4500);
		mp.timer.add(() => {
			if (token !== seatToken || !seated || leaving) return;
			seatReady = true;
			idleAcc = 0;
			playScene(ANIM_IDLE, 1);
		}, ms);
	});

	createReels();
	enableScreen();

	mp.game.graphics.notify(
		'~y~Слоты~w~: ~b~↑/↓~w~ ставка · ~b~Enter~w~ крутить · ~b~Backspace~w~ выйти',
	);
}

function finishExit() {
	seatToken++;
	seated = false;
	seatReady = false;
	leaving = false;
	reacting = false;
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
	machineHandle = 0;
	machinePos = null;
	mp.busy.remove('casino.slots', true);
}

function exitSlot(force) {
	if (!seated) return;
	if (force || !seatReady) {
		finishExit();
		return;
	}
	if (leaving) return;
	leaving = true;
	controlsLocked = true;
	spin = null;
	const token = seatToken;
	const player = mp.players.local;
	try {
		player.freezePosition(false);
	} catch (e) {}
	const d = dict();
	const exitName = ANIM_EXIT[enterSide];
	requestAnimDict(d, () => {
		if (token !== seatToken) return;
		playScene(exitName, 0);
		mp.timer.add(() => {
			if (token !== seatToken) return;
			finishExit();
		}, animMs(d, exitName, 3200));
	});
}

function playReaction(win) {
	reacting = true;
	const d = dict();
	const anim = win ? 'win_a' : 'lose_a';
	const token = seatToken;
	playScene(anim, 0);
	mp.timer.add(() => {
		if (token !== seatToken || !seated || leaving) return;
		reacting = false;
		playScene(ANIM_IDLE, 1);
	}, animMs(d, anim, 2200));
}

function startSpin(result) {
	if (!seated || reels.length < 3) {
		controlsLocked = false;
		return;
	}
	const now = Date.now();
	spin = { reels: [], result };
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
	if (!seatReady || controlsLocked || leaving) return;
	currentBetIndex = Math.max(0, Math.min(BET_LEVELS.length - 1, currentBetIndex + dir));
	updateScreen();
}

function doSpin() {
	if (!seatReady || leaving || controlsLocked || spin) return;
	controlsLocked = true;
	mp.events.callRemote('casino.slots.spin', BET_LEVELS[currentBetIndex]);
}

mp.events.add({
	'casino.area.enter': enter => {
		isInCasino = !!enter;
		if (!enter) {
			nearMachine = null;
			if (seated) exitSlot(true);
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
		if (!seatReady || controlsLocked || spin || leaving) return;
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

	// Камера автомата только после посадки, чтобы было видно, как садимся.
	if (seatReady) {
		try {
			mp.game.invoke('0x79C0E43EB9B944E2', CASINO_CAM_HASH);
		} catch (e) {}
	}

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
				setReelRot(reel.obj, ang % 360);
				if (t >= 1) reel.rest = ((r.to % 360) + 360) % 360;
			}
		}
		if (allDone) {
			const res = spin.result;
			spin = null;
			onSpinComplete(res);
		}
	} else if (seatReady && !leaving && !reacting) {
		for (let k = 0; k < reels.length; k++) {
			const reel = reels[k];
			if (reel && reel.obj) setReelRot(reel.obj, reel.rest || 0);
		}
		idleAcc += mp.game.misc.getFrameTime ? mp.game.misc.getFrameTime() * 1000 : 16;
		if (idleAcc >= 1000) {
			idleAcc = 0;
			if (!isPlaying(ANIM_IDLE)) playScene(ANIM_IDLE, 1);
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
