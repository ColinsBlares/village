"use strict";

/*
    Объёмный звук. Пока источник один — радио машины.
    Целый кузов глушит и слышен дальше. Выбитое или опущенное окно
    даёт громкий звук только рядом с этим стеклом.
*/

var FORCE_RADIO = "0xC1805D05E6D4FE10";
var RADIO_LOUD = "0xBB6F1CAEC68B0BCE";
var FRONTEND_RADIO = "0xF7F26C6E9CC9EBB8";
var POSITION_MUTE = "0x02E93C796ABD3A97";
var POSITION_EMITTER = "0xDA07819E452FFE8F";

var OPEN_RANGE = 7;
var BODY_RANGE = 42;
var CLOSED_GAIN = 0.16;
var OPEN_HEIGHT = 6;
var BODY_HEIGHT = 5;

// 0 переднее левое, 1 переднее правое, 2 заднее левое, 3 заднее правое
var WINDOWS = [
    { bone: "window_lf", index: 0, side: -0.9, forward: 0.4 },
    { bone: "window_rf", index: 1, side: 0.9, forward: 0.4 },
    { bone: "window_lr", index: 2, side: -0.9, forward: -0.5 },
    { bone: "window_rr", index: 3, side: 0.9, forward: -0.5 },
    { bone: "windscreen", index: 6, side: 0, forward: 1.2 },
    { bone: "windscreen_r", index: 7, side: 0, forward: -1.4 }
];

mp.audio3d = {
    openRange: OPEN_RANGE,
    bodyRange: BODY_RANGE,

    listener() {
        return mp.players.local.position;
    },

    // Громкость даёт самое слышное место: выбитое окно рядом или тихий корпус вдалеке
    solve(points, listener) {
        if (!points || !points.length) return null;
        var ear = listener || this.listener();
        var best = null;
        for (var i = 0; i < points.length; i++) {
            var point = points[i];
            var dx = ear.x - point.x;
            var dy = ear.y - point.y;
            var dz = Math.abs(ear.z - point.z);
            var horizontal = Math.sqrt(dx * dx + dy * dy);
            var range = point.body ? this.bodyRange : this.openRange;
            var height = point.body ? BODY_HEIGHT : OPEN_HEIGHT;
            if (horizontal >= range || dz >= height) continue;
            var horizontalFade = Math.pow(1 - horizontal / range, point.body ? 2 : 2);
            var heightFade = Math.pow(1 - dz / height, 2);
            var leak = horizontalFade * heightFade * (point.body ? CLOSED_GAIN : 1);
            if (!point.body && horizontal < 2.4 && dz < 2.2) leak = 1;
            if (best && leak <= best.gain) continue;
            best = {
                gain: leak,
                open: point.body ? 0 : 1,
                x: point.x,
                y: point.y,
                z: point.z
            };
        }
        return best;
    }
};

function windowOpen(vehicle, index) {
    if (vehicle.__brokenWindows & (1 << index)) return true;
    var rolled = vehicle.getVariable("windowsDown") | 0;
    if (rolled & (1 << index)) return true;
    var damage = vehicle.getVariable("damage");
    if (damage && (damage[1] & (1 << index))) return true;
    try {
        var intact = mp.game.vehicle.isVehicleWindowIntact(vehicle.handle, index);
        if (intact === false || intact === 0) return true;
    } catch (err) {}
    return false;
}

function rememberWindow(vehicle, index) {
    var bit = 1 << index;
    if (vehicle.__brokenWindows & bit) return;
    vehicle.__brokenWindows = (vehicle.__brokenWindows || 0) | bit;
    try {
        mp.game.vehicle.smashVehicleWindow(vehicle.handle, index);
    } catch (err) {}
    mp.events.callRemote("vehicles.window.broke", vehicle.remoteId, index);
}

function markWindowHit(vehicle, pos) {
    if (!vehicle || vehicle.type != "vehicle" || !vehicle.handle || !pos) return;
    var best = null;
    var bestDist = 1.3;
    for (var i = 0; i < WINDOWS.length; i++) {
        var spec = WINDOWS[i];
        var point = bonePoint(vehicle, spec.bone) || offsetPoint(vehicle, spec);
        var dx = point.x - pos.x;
        var dy = point.y - pos.y;
        var dz = point.z - pos.z;
        var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < bestDist) {
            bestDist = dist;
            best = spec;
        }
    }
    if (best) rememberWindow(vehicle, best.index);
}

function bonePoint(vehicle, bone) {
    try {
        var index = vehicle.getBoneIndexByName(bone);
        if (index == null || index < 0) return null;
        var pos = vehicle.getWorldPositionOfBone(index);
        if (!pos) return null;
        var dx = pos.x - vehicle.position.x;
        var dy = pos.y - vehicle.position.y;
        var dz = pos.z - vehicle.position.z;
        if (dx * dx + dy * dy + dz * dz > 25) return null;
        return { x: pos.x, y: pos.y, z: pos.z, open: 1 };
    } catch (err) {
        return null;
    }
}

function offsetPoint(vehicle, spec) {
    var heading = vehicle.heading * Math.PI / 180;
    var fx = -Math.sin(heading);
    var fy = Math.cos(heading);
    var rx = Math.cos(heading);
    var ry = Math.sin(heading);
    var pos = vehicle.position;
    return {
        x: pos.x + fx * spec.forward + rx * spec.side,
        y: pos.y + fy * spec.forward + ry * spec.side,
        z: pos.z + 0.7,
        open: 1
    };
}

function vehiclePoints(vehicle) {
    var pos = vehicle.position;
    var points = [{ x: pos.x, y: pos.y, z: pos.z + 0.5, open: 0, body: 1 }];
    for (var i = 0; i < WINDOWS.length; i++) {
        var spec = WINDOWS[i];
        if (!windowOpen(vehicle, spec.index)) continue;
        points.push(bonePoint(vehicle, spec.bone) || offsetPoint(vehicle, spec));
    }
    return points;
}

function radioOn(vehicle) {
    if (musicUrl(vehicle)) return false;
    var index = vehicle.getVariable("radioIndex");
    return index != null && index !== 255;
}

function musicUrl(vehicle) {
    var url = vehicle.getVariable("musicUrl");
    return typeof url == "string" && url.length > 0 ? url : "";
}

function musicLevel(vehicle) {
    if (vehicle.__volPreview != null) return vehicle.__volPreview;
    var value = Number(vehicle.getVariable("musicVol"));
    if (!isFinite(value)) return 1;
    return Math.max(0, Math.min(100, value)) / 100;
}

function musicStamp(vehicle) {
    var url = musicUrl(vehicle);
    if (!url) return "";
    return url + "\n" + (vehicle.getVariable("musicAt") || 0);
}

function glide(current, target) {
    if (current == null || !isFinite(current)) return target;
    return current + (target - current) * 0.12;
}

function setLoud(vehicle, loud) {
    if (!!vehicle.__radioLoud === !!loud) return;
    vehicle.__radioLoud = !!loud;
    mp.game.invoke(RADIO_LOUD, vehicle.handle, !!loud);
}

function inCabin(vehicle, ear) {
    if (mp.players.local.vehicle !== vehicle) return false;
    var pos = vehicle.position;
    return mp.game.system.vdist(ear.x, ear.y, ear.z, pos.x, pos.y, pos.z) < 4;
}

mp.game.invoke(POSITION_MUTE, false);
mp.game.invoke(POSITION_EMITTER, true);

var musicBrowser = mp.browsers.new("package://" + ["audio3d", "index.html"].join("/"));
musicBrowser.active = true;
musicBrowser.inputEnabled = false;
musicBrowser.mouseInputEnabled = false;
var musicReady = false;
var musicQueue = [];
var musicPlaying = {};

function markMusicReady() {
    if (musicReady) return;
    musicReady = true;
    flushMusic();
}

function callMusic() {
    var args = Array.prototype.slice.call(arguments);
    var method = args.shift();
    var code = "audio3d." + method + "(" + args.map(function (arg) { return JSON.stringify(arg); }).join(",") + ")";
    if (!musicReady) musicQueue.push(code);
    else musicBrowser.execute(code);
}

function flushMusic() {
    if (!musicReady) return;
    for (var i = 0; i < musicQueue.length; i++) musicBrowser.execute(musicQueue[i]);
    musicQueue = [];
}

var musicSyncWait = {};

function syncMusic(vehicle) {
    if (!vehicle || vehicle.type != "vehicle") return;
    var id = vehicle.remoteId;
    if (musicSyncWait[id]) return;
    musicSyncWait[id] = true;
    setTimeout(() => {
        delete musicSyncWait[id];
        if (!mp.vehicles.exists(vehicle)) return;
        applyMusicSync(vehicle);
    }, 40);
}

function applyMusicSync(vehicle) {
    if (!vehicle || vehicle.type != "vehicle") return;
    var id = vehicle.remoteId;
    var stamp = musicStamp(vehicle);
    if (!stamp) {
        if (!musicPlaying[id]) return;
        delete musicPlaying[id];
        callMusic("stop", id);
        if (playerOpen && mp.players.local.vehicle === vehicle) pushPanel(vehicle);
        return;
    }
    if (musicPlaying[id] === stamp) return;
    musicPlaying[id] = stamp;
    vehicle.__mixVol = null;
    vehicle.__musicMix = null;
    var at = vehicle.getVariable("musicAt") || Date.now();
    callMusic("set", id, musicUrl(vehicle), Math.max(0, (Date.now() - at) / 1000), 0.85 * musicLevel(vehicle));
    if (playerOpen && mp.players.local.vehicle === vehicle) pushPanel(vehicle);
}

function earSpace(point, ear) {
    try {
        var rot = mp.game.cam.getGameplayCamRot(2);
        var rz = rot.z * Math.PI / 180;
        var rx = rot.x * Math.PI / 180;
        var dx = point.x - ear.x;
        var dy = point.y - ear.y;
        var dz = point.z - ear.z;
        var fx = -Math.sin(rz) * Math.abs(Math.cos(rx));
        var fy = Math.cos(rz) * Math.abs(Math.cos(rx));
        var fz = Math.sin(rx);
        var rightX = Math.cos(rz);
        var rightY = Math.sin(rz);
        var localRight = dx * rightX + dy * rightY;
        var localForward = dx * fx + dy * fy + dz * fz;
        var dist = Math.sqrt(localRight * localRight + localForward * localForward + dz * dz) || 1;
        var place = Math.max(1.5, Math.min(dist, 10));
        var pan = localRight / 1.2;
        if (pan > 1) pan = 1;
        if (pan < -1) pan = -1;
        return {
            x: pan * 2,
            y: dz / dist * place,
            z: -localForward / dist * place
        };
    } catch (err) {
        return { x: 0, y: 0, z: -1 };
    }
}

mp.events.add({
    "browserDomReady": (browser) => {
        if (browser === musicBrowser) markMusicReady();
    },
    "audio3d.ready": () => {
        markMusicReady();
    },
    "audio3d.error": (id) => {
        var vehicle = mp.vehicles.atRemoteId(parseInt(id, 10));
        var local = mp.players.local;
        if (!vehicle || local.vehicle != vehicle || vehicle.getPedInSeat(-1) != local.handle) return;
        if (vehicle.__musicError === musicPlaying[id]) return;
        vehicle.__musicError = musicPlaying[id];
        mp.notify.error("Ссылка не воспроизводится", "Музыка");
    },
    "entityStreamIn": (entity) => {
        syncMusic(entity);
    },
    "entityStreamOut": (entity) => {
        if (!entity || entity.type != "vehicle") return;
        if (!musicPlaying[entity.remoteId]) return;
        delete musicPlaying[entity.remoteId];
        callMusic("stop", entity.remoteId);
    }
});

mp.events.addDataHandler("musicUrl", (entity) => {
    syncMusic(entity);
});

mp.events.addDataHandler("musicAt", (entity) => {
    syncMusic(entity);
});

mp.events.addDataHandler("musicVol", (entity) => {
    if (entity) entity.__volPreview = null;
    if (playerOpen && mp.players.local.vehicle === entity) pushPanel(entity);
});

mp.events.addDataHandler("musicQueue", (entity) => {
    if (playerOpen && mp.players.local.vehicle === entity) pushPanel(entity);
});

mp.events.addDataHandler("musicIndex", (entity) => {
    if (playerOpen && mp.players.local.vehicle === entity) pushPanel(entity);
});

mp.events.add("playerWeaponShot", (targetPos) => {
    try {
        if (!targetPos || typeof targetPos.x != "number") return;
        var vehicle = null;
        var nearest = 6;
        mp.vehicles.forEachInStreamRange((current) => {
            if (!current.handle) return;
            var dist = mp.game.system.vdist(targetPos.x, targetPos.y, targetPos.z, current.position.x, current.position.y, current.position.z);
            if (dist < nearest) {
                nearest = dist;
                vehicle = current;
            }
        });
        markWindowHit(vehicle, targetPos);
    } catch (err) {}
});

setInterval(() => {
    try {
    var ear = mp.audio3d.listener();
    var local = mp.players.local;
    for (var id in musicPlaying) {
        var vehicle = mp.vehicles.atRemoteId(parseInt(id, 10));
        var stamp = musicStamp(vehicle);
        if (!vehicle || !vehicle.handle || !stamp) {
            delete musicPlaying[id];
            callMusic("stop", parseInt(id, 10));
            continue;
        }
        if (musicPlaying[id] !== stamp) {
            syncMusic(vehicle);
            continue;
        }
        var volume = 0;
        var space = { x: 0, y: 0, z: -0.6 };
        var cutoff = 18000;
        var level = musicLevel(vehicle);
        if (local.vehicle === vehicle) {
            volume = Math.round(0.85 * level * 100) / 100;
            vehicle.__mixVol = volume;
            vehicle.__mixX = 0;
            vehicle.__mixY = 0;
            vehicle.__mixZ = -0.6;
            vehicle.__mixCut = 18000;
            callMusic("update", vehicle.remoteId, volume, 0, 0, -0.6, 18000);
            continue;
        }
        var heard = mp.audio3d.solve(vehiclePoints(vehicle), ear);
        if (heard && heard.gain > 0) {
            volume = Math.min(0.9, heard.gain);
            space = earSpace(heard, ear);
            cutoff = 900 + heard.open * 15100;
        }
        volume = Math.round(volume * level * 100) / 100;
        vehicle.__mixVol = glide(vehicle.__mixVol, volume);
        vehicle.__mixX = glide(vehicle.__mixX, space.x);
        vehicle.__mixY = glide(vehicle.__mixY, space.y);
        vehicle.__mixZ = glide(vehicle.__mixZ, space.z);
        vehicle.__mixCut = glide(vehicle.__mixCut, cutoff);
        var stamp = vehicle.__mixVol.toFixed(2) + "|" + vehicle.__mixX.toFixed(2) + "|" + vehicle.__mixZ.toFixed(2) + "|" + Math.round(vehicle.__mixCut);
        if (vehicle.__musicMix === stamp) continue;
        vehicle.__musicMix = stamp;
        callMusic("update", vehicle.remoteId, vehicle.__mixVol, vehicle.__mixX, vehicle.__mixY, vehicle.__mixZ, vehicle.__mixCut);
    }
    if (local.vehicle && musicUrl(local.vehicle)) mp.game.invoke(FRONTEND_RADIO, false);
    } catch (err) {}
}, 100);

mp.events.add("render", () => {
    try {
    var local = mp.players.local;
    var ear = mp.audio3d.listener();
    var cabin = local.vehicle;
    if (cabin && mp.vehicles.exists(cabin)) {
        if (radioOn(cabin)) setLoud(cabin, false);
        return;
    }

    mp.game.invoke(FRONTEND_RADIO, false);

    var winner = null;
    var heard = null;
    mp.vehicles.forEachInStreamRange((vehicle) => {
        if (!vehicle.handle || !radioOn(vehicle)) {
            if (vehicle.__radioLoud) setLoud(vehicle, false);
            return;
        }
        var heardAt = mp.audio3d.solve(vehiclePoints(vehicle), ear);
        if (!heardAt || heardAt.gain <= 0) {
            setLoud(vehicle, false);
            return;
        }
        if (!winner || heardAt.gain > heard.gain) {
            if (winner) setLoud(winner, false);
            winner = vehicle;
            heard = heardAt;
        } else {
            setLoud(vehicle, false);
        }
    });

    if (!winner || !heard) return;
    setLoud(winner, heard.open > 0.55 && heard.gain > 0.25);
    if ((heard.open > 0.55 ? heard.gain > 0.04 : heard.gain > 0.1)) {
        mp.game.invoke(FORCE_RADIO, winner.handle);
    }
    } catch (err) {}
});

var playerOpen = false;
var volumeSend = null;

function pushPanel(vehicle) {
    if (!vehicle) return;
    var queue = [];
    try {
        var raw = vehicle.getVariable("musicQueue");
        if (raw) queue = JSON.parse(raw);
    } catch (err) {}
    if (!Array.isArray(queue)) queue = [];
    var index = vehicle.getVariable("musicIndex");
    callMusic("panel", {
        id: vehicle.remoteId,
        queue: queue,
        index: index == null ? -1 : index | 0,
        volume: Math.round(musicLevel(vehicle) * 100),
        url: musicUrl(vehicle)
    });
}

function driverVehicle() {
    var vehicle = mp.players.local.vehicle;
    if (!vehicle || vehicle.getPedInSeat(-1) != mp.players.local.handle) return null;
    return vehicle;
}

function openPlayer() {
    if (mp.game.ui.isPauseMenuActive()) return;
    var vehicle = mp.players.local.vehicle;
    if (!vehicle) return mp.notify.error("Нужно быть в машине", "Музыка");
    if (!driverVehicle()) return mp.notify.error("Нужно быть за рулём", "Музыка");
    if (mp.busy.includes() && !mp.busy.includes("music")) return;
    if (!playerOpen && !mp.busy.add("music", true)) return;
    playerOpen = true;
    musicBrowser.inputEnabled = true;
    musicBrowser.mouseInputEnabled = true;
    pushPanel(vehicle);
}

function closePlayer() {
    if (!playerOpen) return;
    playerOpen = false;
    musicBrowser.inputEnabled = false;
    musicBrowser.mouseInputEnabled = false;
    mp.busy.remove("music");
    callMusic("panelHide");
}

mp.keys.bind(0x4B, true, function () {
    if (playerOpen) closePlayer();
    else openPlayer();
});

mp.keys.bind(0x1B, false, function () {
    if (playerOpen) closePlayer();
});

mp.events.add("playerLeaveVehicle", () => {
    closePlayer();
});

mp.events.add({
    "audio3d.ui.close": () => closePlayer(),
    "audio3d.ui.add": (url) => {
        if (!playerOpen || !driverVehicle()) return;
        mp.events.callRemote("vehicles.music.add", String(url || ""));
    },
    "audio3d.ui.volume": (level) => {
        var vehicle = driverVehicle();
        if (!playerOpen || !vehicle) return;
        level = Math.max(0, Math.min(100, parseInt(level, 10) || 0));
        vehicle.__volPreview = level / 100;
        if (volumeSend) return;
        volumeSend = setTimeout(() => {
            volumeSend = null;
            var current = driverVehicle();
            if (!current || current.__volPreview == null) return;
            mp.events.callRemote("vehicles.music.volume", Math.round(current.__volPreview * 100));
        }, 150);
    },
    "audio3d.ui.stop": () => {
        if (!playerOpen || !driverVehicle()) return;
        mp.events.callRemote("vehicles.music.stop");
    },
    "audio3d.ui.next": () => {
        if (!playerOpen || !driverVehicle()) return;
        mp.events.callRemote("vehicles.music.next");
    },
    "audio3d.ui.prev": () => {
        if (!playerOpen || !driverVehicle()) return;
        mp.events.callRemote("vehicles.music.prev");
    },
    "audio3d.ui.play": (index) => {
        if (!playerOpen || !driverVehicle()) return;
        mp.events.callRemote("vehicles.music.play", parseInt(index, 10) || 0);
    },
    "audio3d.ui.remove": (index) => {
        if (!playerOpen || !driverVehicle()) return;
        mp.events.callRemote("vehicles.music.remove", parseInt(index, 10) || 0);
    },
    "audio3d.ui.seek": (seconds) => {
        if (!playerOpen || !driverVehicle()) return;
        mp.events.callRemote("vehicles.music.seek", parseInt(seconds, 10) || 0);
    },
    "audio3d.trackEnded": (id) => {
        id = parseInt(id, 10);
        var vehicle = mp.vehicles.atRemoteId(id);
        if (!vehicle || !musicPlaying[id]) return;
        var local = mp.players.local;
        if (local.vehicle === vehicle) {
            var driver = vehicle.getPedInSeat(-1);
            if (driver && driver !== local.handle) return;
        } else if (vehicle.handle && vehicle.getPedInSeat(-1)) {
            return;
        }
        mp.events.callRemote("vehicles.music.ended", vehicle.remoteId);
    }
});
