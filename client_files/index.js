"use strict";
/// Подключение всех модулей на сервере

/*let api = {"chat:push": chatAPI.push, "chat:clear": chatAPI.clear, "chat:activate": chatAPI.activate, "chat:show": chatAPI.show};
for (let fn in api) {
    mp.events.add(fn, api[fn]);
}*/

// mp.events.callRemote('console', `Тест`); // вывод текста в консоль

mp.gui.cursor.show(true, false);

/// Служебные модули
require('base');
require('utils');
require('browser');

let browserLoaded = false;
let initDone = false;
let serverReady = false;

const preloadPos = new mp.Vector3(-1685.21, -1653.46, 183.55);
mp.preload = true;
let preloadCam = false;

function awayFromPreload(pos) {
    const dx = pos.x - preloadPos.x;
    const dy = pos.y - preloadPos.y;
    const dz = pos.z - preloadPos.z;
    return dx * dx + dy * dy + dz * dz > 4;
}

function holdPreload() {
    const player = mp.players.local;
    if (!player) return;
    player.freezePosition(true);
    player.setAlpha(0);
    if (player.position && awayFromPreload(player.position)) player.position = preloadPos;
    mp.game.ui.displayRadar(false);
    mp.game.ui.displayHud(false);
    if (!preloadCam) {
        mp.utils.cam.create(-1685.21, -1653.46, 193.55, -1639.35, -1575.13, 187.48);
        preloadCam = true;
    }
}

mp.events.add('render', () => {
    if (!mp.preload) return;
    holdPreload();
    mp.game.controls.disableAllControlActions(0);
    mp.game.controls.disableAllControlActions(1);
    mp.game.controls.disableAllControlActions(2);
    mp.game.graphics.drawText("Идёт загрузка мода", [0.5, 0.5], {
        font: 0,
        color: [252, 223, 3, 200],
        scale: [0.55, 0.55],
        outline: true,
        centre: true
    });
});

function askServer() {
    if (serverReady) return;
    mp.events.callRemote('player.join');
}

const askTimer = setInterval(askServer, 2000);
askServer();

/// Автоподключение клиентских модулей
mp.events.add('init', (activeModules) => {
    if (serverReady) return;
    serverReady = true;
    clearInterval(askTimer);
    activeModules.forEach(moduleName => {
        require(moduleName);
    });
    if (browserLoaded) {
        mp.events.callRemote('player.joined');
    }
    initDone = true;
});

mp.events.add('browserDomReady', (browser) => {
    if (initDone) {
        mp.events.callRemote('player.joined');
    }
    browserLoaded = true;
});