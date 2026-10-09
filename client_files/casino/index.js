// Видеоэкраны казино (включает рекламные дисплеи внутри интерьера)
require('casino/screens.js');
// Скачки (Inside Track) — нативный экран забега
require('casino/horseracing.js');
// Слот-машины — нативная посадка, барабаны и камера
require('casino/slots.js');

let isInCasinoArea = false;
let isNearWheel = false;
let spinState = null;

const WHEEL_INTERACT_POS = { x: 1110.2363, y: 227.8508, z: -50.755817 };
const WHEEL_OBJECT_POS = { x: 1111.05, y: 229.81, z: -49.13 };
// Точка анимации у ручки (aboba/DiamondCasino.cs _wheelPos)
const WHEEL_ANIM_POS = { x: 1109.76, y: 227.89, z: -49.64 };
const WHEEL_ANIM_HEADING = ((Math.atan2(
	WHEEL_OBJECT_POS.x - WHEEL_ANIM_POS.x,
	WHEEL_OBJECT_POS.y - WHEEL_ANIM_POS.y,
) * 180 / Math.PI) + 360) % 360;
const WHEEL_DISC_MODEL = mp.game.joaat('vw_prop_vw_luckywheel_02a');
const WHEEL_BASE_MODEL = mp.game.joaat('vw_prop_vw_luckywheel_01a');
// Витрина у колеса — coords/sync с packages/casino/wheel.js WHEEL_SHOWCASE
const WHEEL_SHOWCASE = {
	x: 1098.97,
	y: 219.76,
	z: -48.75,
	h: 140,
	modelHash: mp.game.joaat('turismor'),
	findRadius: 4,
	rotateSpeedDegSec: 7,
};
const CASINO_INTERIOR_ID = 275201;
const ANIM_DICT_FEMALE = 'anim_casino_a@amb@casino@games@lucky7wheel@female';
const ANIM_DICT_MALE = 'anim_casino_a@amb@casino@games@lucky7wheel@male';
// Последовательность анимаций как в GTA Online
const ANIM_SEQUENCE = [
	{ name: 'enter_right_to_baseidle', duration: 2500 },
	{ name: 'enter_to_armraisedidle', duration: 1500 },
	{ name: 'armraisedidle_to_spinningidle_high', duration: 2000 },
	{ name: 'spinningidle_high', duration: -1, flag: 1 },
];

let peds = [
	{
		model: 's_m_y_valet_01',
		position: {
			x: 1088.1507568359375,
			y: 221.13722229003906,
			z: -49.200416564941406,
			d: 1,
		},
		heading: 179.3302764892578,
	},
];

let infoMarker = mp.markers.new(
	1,
	new mp.Vector3(
		1088.2305908203125,
		219.5839080810547,
		-49.200382232666016 - 1.1,
	),
	0.4,
	{
		color: [255, 143, 190, 111],
		visible: true,
		dimension: 1,
	},
);

/// Удаляет map-prop колеса из IPL (дубликат под серверным объектом)
function hideIplWheelProps() {
	const pos = WHEEL_OBJECT_POS;
	[WHEEL_DISC_MODEL, WHEEL_BASE_MODEL].forEach(modelHash => {
		try {
			const handle = mp.game.object.getClosestObjectOfType(
				pos.x,
				pos.y,
				pos.z,
				5.0,
				modelHash,
				false,
				false,
				false,
			);
			if (!handle) return;
			mp.game.entity.setEntityAsMissionEntity(handle, true, true);
			mp.game.object.deleteObject(handle);
		} catch (e) {}
	});
}

let showcaseVehicle = null;
let showcaseHeading = WHEEL_SHOWCASE.h;

function findShowcaseVehicle() {
	let best = null;
	let bestDist = WHEEL_SHOWCASE.findRadius * WHEEL_SHOWCASE.findRadius;
	mp.vehicles.forEachInStreamRange(veh => {
		if (veh.model !== WHEEL_SHOWCASE.modelHash) return;
		const pos = veh.position;
		const dx = pos.x - WHEEL_SHOWCASE.x;
		const dy = pos.y - WHEEL_SHOWCASE.y;
		const dz = pos.z - WHEEL_SHOWCASE.z;
		const dist = dx * dx + dy * dy + dz * dz;
		if (dist < bestDist) {
			bestDist = dist;
			best = veh;
		}
	});
	return best;
}

function resetShowcaseVehicle() {
	showcaseVehicle = null;
	showcaseHeading = WHEEL_SHOWCASE.h;
}

function updateShowcaseRotation() {
	if (!isInCasinoArea) return;
	if (!showcaseVehicle || !mp.vehicles.exists(showcaseVehicle)) {
		showcaseVehicle = findShowcaseVehicle();
		if (showcaseVehicle) {
			try {
				showcaseHeading = showcaseVehicle.getHeading();
			} catch (e) {
				showcaseHeading = WHEEL_SHOWCASE.h;
			}
		}
	}
	if (!showcaseVehicle) return;

	let frameTime = 0;
	try {
		frameTime = mp.game.misc.getFrameTime();
	} catch (e) {
		frameTime = 1 / 60;
	}
	showcaseHeading = (showcaseHeading + WHEEL_SHOWCASE.rotateSpeedDegSec * frameTime) % 360;
	try {
		showcaseVehicle.setHeading(showcaseHeading);
	} catch (e) {}
}

function setPlayerFrozen(frozen) {
	try {
		mp.players.local.freezePosition(!!frozen);
	} catch (e) {}
}

function finishSpin() {
	const state = spinState;
	spinState = null;
	setPlayerFrozen(false);

	if (!state) return;

	try {
		mp.players.local.clearTasksImmediately();
	} catch (e) {}

	mp.callCEFV(`wheelResult.prizeText = \`${state.prize.text.replace(/`/g, "'")}\`;
                  wheelResult.prizeType = \`${state.prize.type}\`;
                  wheelResult.show = true;`);
}

function tryStartSpin() {
	if (!isNearWheel) return;
	if (mp.busy.includes()) return;
	if (spinState) return;
	if (!mp.busy.add('casino.wheel', false, true)) return;
	mp.events.callRemote('casino.wheel.spin.try');
}

function playWheelAnim(onSpinPhase) {
	const player = mp.players.local;
	const isFemale = player.model !== mp.game.joaat('mp_m_freemode_01');
	const dict = isFemale ? ANIM_DICT_FEMALE : ANIM_DICT_MALE;
	const pos = WHEEL_ANIM_POS;
	const heading = WHEEL_ANIM_HEADING;

	const playStep = (stepIndex) => {
		if (stepIndex >= ANIM_SEQUENCE.length) return;
		const step = ANIM_SEQUENCE[stepIndex];
		try {
			player.taskPlayAnimAdvanced(
				dict,
				step.name,
				pos.x, pos.y, pos.z,
				0, 0, heading,
				8.0, -8.0,
				step.duration,
				step.flag || 0,
				0, false, false,
			);
		} catch (e) {
			try {
				player.taskPlayAnim(dict, step.name, 8.0, -8.0, step.duration, step.flag || 0, 0, false, false, false);
			} catch (e2) {}
		}
		if (stepIndex === ANIM_SEQUENCE.length - 1 && onSpinPhase) onSpinPhase();
		if (step.duration > 0 && stepIndex + 1 < ANIM_SEQUENCE.length) {
			mp.timer.add(() => playStep(stepIndex + 1), step.duration);
		}
	};

	const startSequence = () => {
		setPlayerFrozen(true);
		try {
			player.setCoordsNoOffset(pos.x, pos.y, pos.z, false, false, false);
			player.setHeading(heading);
		} catch (e) {}
		playStep(0);
	};

	if (mp.utils && mp.utils.requestAnimDict) {
		mp.utils.requestAnimDict(dict, startSequence);
		return;
	}

	try { mp.game.streaming.requestAnimDict(dict); } catch (e) {}
	let tries = 0;
	const poll = mp.timer.add(() => {
		tries++;
		let loaded = false;
		try { loaded = mp.game.streaming.hasAnimDictLoaded(dict); } catch (e) {}
		if (loaded) {
			mp.timer.remove(poll);
			startSequence();
		} else if (tries > 30) {
			mp.timer.remove(poll);
			startSequence();
		}
	}, 100);
}

function findClosestWheelHandle(modelHash, radius = 5.0) {
	try {
		const p = mp.players.local.position;
		return (
			mp.game.object.getClosestObjectOfType(
				p.x,
				p.y,
				p.z,
				radius,
				modelHash,
				false,
				false,
				false,
			) || 0
		);
	} catch (e) {
		return 0;
	}
}

mp.events.add({
	'casino.area.enter': enter => {
		isInCasinoArea = enter;
		if (enter) {
			resetShowcaseVehicle();
			mp.timer.add(() => mp.events.call('casino:loadVideoWall'), 500);
			let items = [{ text: `Бросить кости`, icon: `dice.svg` }];
			mp.callCEFV(
				`interactionMenu.addItems('player_interaction', ${JSON.stringify(items)})`,
			);
		} else {
			resetShowcaseVehicle();
			mp.events.call('casino:unloadVideoWall');
			mp.callCEFV(
				`interactionMenu.deleteItem('player_interaction', 'Бросить кости'`,
			);
		}
	},
	'casino.dice.offer.create': () => {
		let entity = mp.getCurrentInteractionEntity();
		if (!entity || entity.type != 'player') return;
		mp.callCEFV(`inputWindow.name = 'dice';
        inputWindow.header = "Игра в кости (ID: ${entity.remoteId})";
        inputWindow.hint = "Введите сумму";
        inputWindow.inputHint = "Сумма игры...";
        inputWindow.value = "";
        inputWindow.show = true;
        inputWindow.playerId = ${entity.remoteId}
        `);
	},
	'casino.dice.text.show': data => {
		data = JSON.parse(data);
		data.senderName = mp.chat.correctName(data.senderName);
		data.targetName = mp.chat.correctName(data.targetName);
		mp.events.call(
			'chat.message.push',
			`!{#dd90ff}${data.senderName}[${data.senderId}] и ${data.targetName}[${data.targetId}] бросили кости. Результат: !{#fff5a6}${data.senderCount}:${data.targetCount}`,
		);
	},
	'characterInit.done': () => {
		peds.forEach(current => {
			mp.events.call('NPC.create', current);
		});
	},
	'casino.info.show': show => {
		if (show) {
			mp.callCEFV(`modal.showByName('casino_help')`);
		} else {
			mp.callCEFV(`modal.show = false`);
		}
	},

	'casino.wheel.area.enter': enter => {
		isNearWheel = !!enter;
		if (enter) {
			hideIplWheelProps();
			mp.game.graphics.notify(
				'~y~Колесо удачи~w~: нажмите ~b~E~w~ для прокрутки',
			);
		}
	},

	'casino.wheel.spin.start': data => {
		if (typeof data === 'string') data = JSON.parse(data);
		if (!data) {
			mp.busy.remove('casino.wheel', true);
			return;
		}

		spinState = { prize: data.prize };
		if (!mp.busy.includes('casino.wheel')) {
			mp.busy.add('casino.wheel', false, true);
		}
		playWheelAnim(() => {
			mp.events.callRemote('casino.wheel.spin.anim.ready');
		});
	},

	/// Сервер завершил вращение — показываем модалку с призом
	'casino.wheel.spin.done': prize => {
		if (typeof prize === 'string') prize = JSON.parse(prize);
		if (prize && spinState) spinState.prize = prize;
		finishSpin();
	},

	'casino.wheel.spin.fail': () => {
		spinState = null;
		setPlayerFrozen(false);
		mp.busy.remove('casino.wheel', true);
		try {
			mp.players.local.clearTasksImmediately();
		} catch (e) {}
	},

	'casino.wheel.result.close': () => {
		mp.events.callRemote('casino.wheel.spin.finish');
		mp.busy.remove('casino.wheel', true);
		setPlayerFrozen(false);
		try {
			mp.players.local.clearTasksImmediately();
		} catch (e) {}
	},

	'casino.wheel.debug.player': () => {
		const p = mp.players.local.position;
		const interior = mp.game.interior.getInteriorAtCoords(p.x, p.y, p.z);
		const inCasino = interior === CASINO_INTERIOR_ID;
		const disc = findClosestWheelHandle(WHEEL_DISC_MODEL);
		const base = findClosestWheelHandle(WHEEL_BASE_MODEL);
		const msg = `[wheel] pos=${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)} interior=${interior} casino=${inCasino} disc=${disc} base=${base} isNearWheel=${isNearWheel}`;
		mp.events.call('chat.message.push', [`!{#ffd600}${msg}`]);
		try {
			mp.console.logInfo(msg);
		} catch (e) {}
	},
});

mp.keys.bind(0x45, true, () => {
	if (!isNearWheel) return;
	tryStartSpin();
});

mp.events.add('render', updateShowcaseRotation);
