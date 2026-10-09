/// Видеостены Diamond Casino — aboba/casinoscreens.js
'use strict';

let enabled = false;
let loading = false;
let renderTarget = null;

const SCREEN_DIAMONDS = 'CASINO_DIA_PL';
const targetName = 'casinoscreen_01';
const targetModel = mp.game.joaat('vw_vwint01_video_overlay');
const textureDict = 'Prop_Screen_Vinewood';
const textureName = 'BG_Wall_Colour_4x4';
const CASINO_INTERIOR_ID = 275201;

async function loadVideoWall() {
	if (loading || enabled) return;
	loading = true;

	try {
		unloadVideoWall();
		await mp.game.waitAsync(100);

		mp.game.graphics.requestStreamedTextureDict(textureDict, false);

		let tries = 0;
		while (!mp.game.graphics.hasStreamedTextureDictLoaded(textureDict)) {
			tries++;
			if (tries > 100) return;
			await mp.game.waitAsync(100);
		}

		mp.game.ui.registerNamedRendertarget(targetName, false);
		mp.game.ui.linkNamedRendertarget(targetModel);
		// SET_TV_CHANNEL_PLAYLIST
		mp.game.invoke('0xF7B38B8305F1FE8B', 0, SCREEN_DIAMONDS, true);
		mp.game.graphics.setTvAudioFrontend(true);
		mp.game.graphics.setTvVolume(-100);
		mp.game.graphics.setTvChannel(0);

		renderTarget = mp.game.ui.getNamedRendertargetRenderId(targetName);
		enabled = true;
	} catch (e) {
		try {
			mp.console.logInfo('[casino screens] load error: ' + e);
		} catch (e2) {}
	} finally {
		loading = false;
	}
}

function unloadVideoWall() {
	enabled = false;
	renderTarget = null;
	try {
		mp.game.graphics.setTvChannel(-1);
	} catch (e) {}
}

function isInCasinoInterior() {
	try {
		const p = mp.players.local.position;
		return mp.game.interior.getInteriorAtCoords(p.x, p.y, p.z) === CASINO_INTERIOR_ID;
	} catch (e) {
		return false;
	}
}

mp.events.add('casino:loadVideoWall', () => {
	loadVideoWall();
});

mp.events.add('casino:unloadVideoWall', () => {
	unloadVideoWall();
});

mp.events.add('render', () => {
	if (!enabled || !renderTarget) return;

	mp.game.ui.setTextRenderId(renderTarget);
	mp.game.invoke('0x61BB1D9B3A95D802', 4); // SET_SCRIPT_GFX_DRAW_ORDER
	mp.game.invoke('0xC6372ECD45D73BCD', true); // SET_SCRIPT_GFX_DRAW_BEHIND_PAUSEMENU
	// _DRAW_INTERACTIVE_SPRITE
	mp.game.invoke(
		'0x2BC54A8188768488',
		textureDict,
		textureName,
		0.25,
		0.5,
		0.5,
		1.0,
		0.0,
		255,
		255,
		255,
		255,
	);
	mp.game.graphics.drawTvChannel(0.5, 0.5, 1.0, 1.0, 0.0, 255, 255, 255, 255);
	mp.game.ui.setTextRenderId(1);
});

/// Fallback: если игрок уже в интерьере при загрузке клиента
mp.events.add('characterInit.done', () => {
	mp.timer.add(() => {
		if (!enabled && isInCasinoInterior()) {
			mp.events.call('casino:loadVideoWall');
		}
	}, 2000);
});
