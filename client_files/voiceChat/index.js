'use strict';

mp.voiceChat.muted = true;
mp.events.add('characterInit.done', function () {
	mp.keys.bind(0x4e, true, function () {
		// N
		if (mp.game.ui.isPauseMenuActive()) return;
		if (mp.busy.includes(['chat', 'terminal'])) return;
		if (!mp.busy.add('voicechat', false)) return;
		if (mp.chat.clearMuteTime) {
			if (mp.chat.clearMuteTime < Date.now()) {
				mp.chat.clearMuteTime = 0;
				mp.notify.success(
					`Использование чатов снова доступно. Не нарушайте правила сервера.`,
					`MUTE`,
				);
				mp.events.callRemote(`chat.mute.clear`);
				mp.events.call('hud.setData', {
					mute: false,
				});
			} else {
				var mins = Math.ceil((mp.chat.clearMuteTime - Date.now()) / 1000 / 60);
				return mp.notify.error(
					`До разблокировки войс-чата осталось ${mins} мин!`,
				);
			}
		}
		mp.voiceChat.muted = false;
		mp.events.call('hud.setData', { voice: true });
		playVoiceAnimation(mp.players.local);
		if (voiceMode !== 'off') {
			mp.events.callRemote('voiceChat.loopback', true);
			applyVoiceFx(mp.players.local, voiceMode);
		}
	});

	mp.keys.bind(0x4e, false, function () {
		// N
		if (mp.game.ui.isPauseMenuActive()) return;
		mp.voiceChat.muted = true;
		mp.events.call('hud.setData', { voice: false });
		mp.busy.remove('voicechat');
		stopVoiceAnimation(mp.players.local);
		if (voiceMode !== 'off') mp.events.callRemote('voiceChat.loopback', false);
	});

	mp.keys.bind(0x73, false, function () {
		// F4
		if (!mp.voiceChat.muted)
			return mp.notify.error('Отпустите клавишу N', 'Голосовой чат');
		mp.voiceChat.cleanupAndReload(true, true, true);
		mp.notify.success('Голосовой чат был перезагружен', 'Голосовой чат');
	});

	mp.keys.bind(0x77, true, function () {
		// F8 — прослушка себя со сменой эффекта
		if (mp.game.ui.isPauseMenuActive()) return;
		if (mp.busy.includes(['chat', 'terminal'])) return;
		var index = voiceModes.indexOf(voiceMode);
		setVoiceMode(voiceModes[(index + 1) % voiceModes.length]);
	});

	mp.keys.bind(0x14, true, startRadio);
	mp.keys.bind(0x14, false, () => stopRadio(true));
});

mp.speechChanel = {};

let listeners = [];
let channels = {};

/// Добавить канал связи с требуемыми настройками
/// maxRange = 0 - на любой дистанции volume = 1
/// autoConnection будет ли автоматически подключаться/отключаться
mp.speechChanel.addChannel = (
	name,
	maxRange = 0,
	autoConnection = false,
	use3d = false,
	effect = '',
) => {
	channels[name] = {
		maxRange: maxRange,
		autoConnection: autoConnection,
		use3d: use3d,
		effect: effect || '',
	};
};

/// Подключить выбранного игрока к каналу связи
mp.speechChanel.connect = (player, channel, outgoing = true) => {
	if (player == null) return;
	let index = listeners.findIndex(x => x.playerId === player.remoteId);
	if (index !== -1) {
		if (!listeners[index].channels.includes(channel)) {
			listeners[index].channels.push(channel);
			updateCurrent(player, index, channel);
		}
	} else {
		listeners.push({
			playerId: player.remoteId,
			current: channel,
			channels: [channel],
		});
		if (outgoing) mp.events.callRemote('voiceChat.add', player);
		player.voice3d = channels[channel].use3d;
		applyVoiceFx(player, channels[channel].effect || '');
	}

	player.voiceVolume = 1.0;
};
mp.events.add('voiceChat.connect', (playerId, channel) => {
	mp.speechChanel.connect(mp.players.atRemoteId(playerId), channel);
});

/// Отключить выбранного игрока от канала связи
mp.speechChanel.disconnect = (player, channel, isSend = false) => {
	if (player == null) return;
	let index = listeners.findIndex(x => x.playerId === player.remoteId);
	if (index === -1) return;
	if (channel == null) {
		clearVoiceFx(player);
		listeners.splice(index, 1);
	} else {
		let channelIndex = listeners[index].channels.findIndex(x => x == channel);
		if (channelIndex !== -1) {
			listeners[index].channels.splice(channelIndex, 1);
			listeners[index].current = null;
		}
		if (listeners[index].channels.length === 0) {
			clearVoiceFx(player);
			listeners.splice(index, 1);
			mp.events.callRemote('voiceChat.remove', player);
		} else {
			updateCurrent(player, index);
		}
	}
	if (channel == null && isSend) {
		mp.events.callRemote('voiceChat.remove', player);
	}
};
mp.events.add('voiceChat.disconnect', (playerId, channel) => {
	mp.speechChanel.disconnect(mp.players.atRemoteId(playerId), channel);
});

let updateCurrent = function (player, index, newCh) {
	if (listeners[index].current != null) {
		if (channels[listeners[index].current].maxRange === 0) return;
	}

	let maxChannel = listeners[index].current;
	if (newCh && listeners[index].current != null) {
		if (
			channels[newCh].maxRange === 0 ||
			channels[newCh].maxRange > channels[listeners[index].current].maxRange
		) {
			maxChannel = newCh;
		}
	} else {
		for (let i = 0, max = -1; i < listeners[index].channels.length; i++) {
			if (channels[listeners[index].channels[i]].maxRange === 0) {
				maxChannel = listeners[index].channels[i];
				break;
			}
			if (channels[listeners[index].channels[i]].maxRange > max) {
				max = channels[listeners[index].channels[i]].maxRange;
				maxChannel = listeners[index].channels[i];
			}
		}
	}
	listeners[index].current = maxChannel;
	player.voice3d = channels[maxChannel].use3d;
	applyVoiceFx(player, channels[maxChannel].effect || '');
};

mp.speechChanel.addChannel('voice', 10, true, true);
mp.speechChanel.addChannel('radio', 0, false, false, 'radio');
/// Обработчик изменения состояния игроков для изменения состояния голосовой связи
mp.timer.addInterval(() => {
	/// Автоматическое подключение к заданным каналам всех игроков в зоне стрима
	mp.players.forEachInStreamRange(player => {
		if (
			player != mp.players.local &&
			mp.players.local.dimension === player.dimension
		) {
			let dist = mp.game.system.vdist(
				player.position.x,
				player.position.y,
				player.position.z,
				mp.players.local.position.x,
				mp.players.local.position.y,
				mp.players.local.position.z,
			);
			for (let key in channels) {
				if (!channels[key].autoConnection) continue;
				if (dist <= channels[key].maxRange) {
					mp.speechChanel.connect(player, key);
				}
			}
		}
	});
	/// Автоматическое отключение заданных каналов всех игроков
	for (let i = 0; i < listeners.length; i++) {
		let player = mp.players.atRemoteId(listeners[i].playerId);
		if (player == null) return;
		if (channels[listeners[i].current].maxRange != 0) {
			let dist = mp.game.system.vdist(
				player.position.x,
				player.position.y,
				player.position.z,
				mp.players.local.position.x,
				mp.players.local.position.y,
				mp.players.local.position.z,
			);

			if (
				dist > channels[listeners[i].current].maxRange ||
				player.dimension !== mp.players.local.dimension
			) {
				mp.speechChanel.disconnect(player, listeners[i].current);
				i--;
			} else {
				player.voiceVolume = 1 - dist / channels[listeners[i].current].maxRange;
			}
		} else {
			player.voiceVolume = 1;
		}
	}
}, 250);

mp.events.add('playerQuit', player => {
	if (player.remoteId !== mp.players.local.remoteId) {
		mp.speechChanel.disconnect(player, null);
	}
});

mp.events.add('playerDeath', player => {
	if (player.remoteId === mp.players.local.remoteId) {
		stopRadio(true);
		if (voiceMode !== 'off') {
			voiceMode = 'off';
			clearVoiceFx(mp.players.local);
			mp.events.callRemote('voiceChat.loopback', false);
		}
		while (listeners.length !== 0) {
			mp.events.callRemote(
				'voiceChat.remove',
				mp.players.atRemoteId(listeners[0].playerId),
			);
			listeners.splice(0, 1);
		}
	} else {
		mp.speechChanel.disconnect(player, null, true);
	}
});

mp.timer.addInterval(() => {
	mp.players.forEachInStreamRange(player => {
		if (
			player == mp.players.local ||
			mp.vdist(mp.players.local.position, player.position) > 20
		)
			return;
		if (player.isVoiceActive) playVoiceAnimation(player);
		else stopVoiceAnimation(player);
		var effect = listenerEffect(player);
		if (effect && player.isVoiceActive && !player.__voiceFx) applyVoiceFx(player, effect);
		if (player.isVoiceActive && !player.__voiceWas && effect === 'phone') playPhoneClick();
		player.__voiceWas = !!player.isVoiceActive;
	});
}, 250);

function playVoiceAnimation(player) {
	player.playFacialAnim('mic_chatter', 'mp_facial');
}

function stopVoiceAnimation(player) {
	player.playFacialAnim('mood_normal_1', 'facials@gen_male@variations@normal');
}

var BASS_ECHO = 3;
var BASS_BQF = 65555;
var BQF_LOWPASS = 0;
var BQF_HIGHPASS = 1;
var voiceModes = ['off', 'radio', 'phone', 'megaphone'];
var voiceTitles = {
	off: 'Обычный голос',
	radio: 'Рация',
	phone: 'Телефон',
	megaphone: 'Громкоговоритель',
};
var voiceMode = 'off';

function clearVoiceFx(player) {
	var handles = player && player.__voiceFx;
	if (!handles) return;
	for (var i = 0; i < handles.length; i++) {
		try { player.removeVoiceFx(handles[i]); } catch (err) {}
	}
	player.__voiceFx = null;
}

function addVoiceFx(player, type, priority) {
	var handle = player.setVoiceFx(type, priority || 0);
	if (!handle) return 0;
	if (!player.__voiceFx) player.__voiceFx = [];
	player.__voiceFx.push(handle);
	return handle;
}

function bqf(player, filter, center, bandwidth, priority) {
	var handle = addVoiceFx(player, BASS_BQF, priority);
	if (!handle) return;
	player.setVoiceFxBQF(handle, {
		lFilter: filter,
		fCenter: center,
		fGain: 0,
		fBandwidth: bandwidth,
		fQ: 0,
		fS: 0,
		lChannel: -1,
	});
}

function echo(player, wet, feedback, delay, priority) {
	var handle = addVoiceFx(player, BASS_ECHO, priority);
	if (!handle) return;
	player.setVoiceFxEcho(handle, {
		fWetDryMix: wet,
		fFeedback: feedback,
		fLeftDelay: delay,
		fRightDelay: delay + 25,
		lPanDelay: 0,
	});
}

function volume(player, level, priority) {
	var handle = addVoiceFx(player, 9, priority);
	if (!handle) return;
	player.setVoiceFxVolume(handle, {
		fTarget: level,
		fCurrent: level,
		fTime: 0,
		lCurve: 0,
	});
}

function applyVoiceFx(player, effect) {
	if (!player) return;
	clearVoiceFx(player);
	if (!effect) return;
	try {
		if (effect === 'radio') {
			bqf(player, BQF_HIGHPASS, 1100, 0.55, 6);
			bqf(player, BQF_LOWPASS, 2600, 0.55, 5);
			return;
		}
		if (effect === 'phone') {
			bqf(player, BQF_HIGHPASS, 900, 0.4, 6);
			bqf(player, BQF_LOWPASS, 1800, 0.4, 5);
			volume(player, 0.4, 1);
			return;
		}
		if (effect === 'megaphone') {
			bqf(player, BQF_HIGHPASS, 1400, 0.4, 6);
			bqf(player, BQF_LOWPASS, 3400, 0.45, 5);
			try {
				echo(player, 48, 28, 160, 2);
			} catch (err) {}
		}
	} catch (err) {
		clearVoiceFx(player);
		if (!player.__voiceFxError) {
			player.__voiceFxError = true;
			mp.notify.error('Клиент не принял эффект голоса', 'Голос');
		}
	}
}

function setVoiceMode(mode) {
	if (voiceModes.indexOf(mode) === -1) mode = 'off';
	voiceMode = mode;
	var local = mp.players.local;
	stopRadioNoise();
	if (mode === 'off') {
		clearVoiceFx(local);
		mp.events.callRemote('voiceChat.loopback', false);
		mp.notify.success('Прослушка себя выключена', 'Голос');
		return;
	}
	applyVoiceFx(local, mode);
	if (!mp.voiceChat.muted) mp.events.callRemote('voiceChat.loopback', true);
	mp.notify.info(voiceTitles[mode] + '. Зажми N и говори', 'Слышишь себя');
}

function listenerEffect(player) {
	var index = listeners.findIndex(item => item.playerId === player.remoteId);
	if (index === -1) return '';
	var name = listeners[index].current;
	if (!name || !channels[name]) return '';
	return channels[name].effect || '';
}

function stopRadioNoise() {
	try {
		mp.game.audio.playSoundFrontend(-1, 'End_Squelch', 'CB_RADIO_SFX', true);
	} catch (err) {}
}

var radioHeld = false;

function startRadio() {
	if (radioHeld) return;
	if (mp.game.ui.isPauseMenuActive()) return;
	if (mp.busy.includes(['chat', 'terminal'])) return;
	if (mp.chat.clearMuteTime && mp.chat.clearMuteTime >= Date.now()) {
		var mins = Math.ceil((mp.chat.clearMuteTime - Date.now()) / 1000 / 60);
		return mp.notify.error(`До разблокировки войс-чата осталось ${mins} мин!`);
	}
	radioHeld = true;
	mp.voiceChat.muted = false;
	mp.events.call('hud.setData', { voice: true });
	mp.events.callRemote('voiceRadio.start');
}

function stopRadio(send) {
	if (!radioHeld) return;
	radioHeld = false;
	if (!mp.busy.includes('voicechat')) {
		mp.voiceChat.muted = true;
		mp.events.call('hud.setData', { voice: false });
	}
	if (send) mp.events.callRemote('voiceRadio.stop');
}

stopRadioNoise();

function playPhoneClick() {
	try {
		mp.game.audio.playSoundFrontend(-1, 'Menu_Accept', 'Phone_SoundSet_Default', true);
	} catch (err) {}
}

mp.voiceFx = {
	get mode() {
		return voiceMode;
	},
	set: setVoiceMode,
};

mp.events.add('voiceFx.use', mode => setVoiceMode(mode));

mp.events.add('voiceRadio.hear', playerId => {
	var player = mp.players.atRemoteId(playerId);
	if (!player || player === mp.players.local) return;
	mp.speechChanel.connect(player, 'radio', false);
});

mp.events.add('voiceRadio.silence', playerId => {
	mp.speechChanel.disconnect(mp.players.atRemoteId(playerId), 'radio');
});

mp.events.add('voiceRadio.denied', () => stopRadio(false));
