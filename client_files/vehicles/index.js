let breakdowns = require('vehicles/breakdowns.js');
let sell = require('vehicles/sell.js');
let garage = require('vehicles/garage.js');
let radiosync = require('vehicles/radiosync.js');
let own = require('vehicles/own.js');
let currentSirenState = false;
let isCurrentVehicleElectric = false;
mp.speedometerEnabled = true;

// Смещения от центра кузова, в которых снимается вмятина
var DAMAGE_OFFSETS = [
    [0, 1.5, 0.4],
    [0, -1.5, 0.4],
    [-0.9, 0.6, 0.4],
    [0.9, 0.6, 0.4],
    [-0.9, -0.6, 0.4],
    [0.9, -0.6, 0.4],
    [0, 1.2, 0.8],
    [0, -1.2, 0.7],
    [-0.9, 0, 0.6],
    [0.9, 0, 0.6],
    [0, 0.5, 1.0],
    [0, -0.5, 1.0]
];
// Биты маски: 0, 1, 4, 5 — те же колёса, что бьёт ограбление
var WHEEL_IDS = [0, 1, 4, 5];

function isLocalDriver(vehicle) {
    var local = mp.players.local;
    return !!(vehicle && local.vehicle === vehicle && vehicle.getPedInSeat(-1) === local.handle);
}

function applyEngine(vehicle, engine) {
    if (!vehicle || vehicle.type != 'vehicle' || !vehicle.handle) return;
    vehicle.setUndriveable(!engine);
    vehicle.setEngineOn(!!engine, true, true);
}

function isDoorDamaged(vehicle, door) {
    try {
        if (typeof vehicle.isDoorDamaged == 'function') return !!vehicle.isDoorDamaged(door);
        return !!mp.game.vehicle.isVehicleDoorDamaged(vehicle.handle, door);
    } catch (err) {
        return false;
    }
}

function applyHoodTrunk(vehicle, doorsMask) {
    if (!vehicle || vehicle.type != 'vehicle' || !vehicle.handle) return;
    if (vehicle.getVariable('robbed')) return;
    var hoodBroken = doorsMask != null ? !!(doorsMask & 16) : isDoorDamaged(vehicle, 4);
    var trunkBroken = doorsMask != null ? !!(doorsMask & 32) : isDoorDamaged(vehicle, 5);
    if (!hoodBroken) {
        if (vehicle.getVariable('hood')) vehicle.setDoorOpen(4, false, false);
        else vehicle.setDoorShut(4, false);
    }
    if (!trunkBroken) {
        if (vehicle.getVariable('trunk')) vehicle.setDoorOpen(5, false, false);
        else vehicle.setDoorShut(5, false);
    }
}

function applySignals(vehicle) {
    if (!vehicle || vehicle.type != 'vehicle' || !vehicle.handle) return;
    vehicle.setIndicatorLights(1, !!vehicle.getVariable('leftTurnSignal'));
    vehicle.setIndicatorLights(0, !!vehicle.getVariable('rightTurnSignal'));
}

function applySiren(vehicle) {
    if (!vehicle || vehicle.type != 'vehicle' || !vehicle.handle) return;
    vehicle.setSiren(!!vehicle.getVariable('sirenLights'));
    vehicle.setSirenSound(!!vehicle.getVariable('sirenSound'));
}

// 0 выкл, 1 дальний, 2 ближний, 3 оба. Водитель не трогаем: у него фары уже свои
function applyLights(vehicle, state) {
    if (!vehicle || vehicle.type != 'vehicle' || !vehicle.handle || isLocalDriver(vehicle)) return;
    if (state == null) state = vehicle.getVariable('lights');
    if (state == null) return;
    var on = state == 2 || state == 3;
    var high = state == 1 || state == 3;
    try {
        if (typeof vehicle.setLights == 'function') vehicle.setLights(on ? 2 : 1);
        else mp.game.vehicle.setVehicleLights(vehicle.handle, on ? 2 : 1);
        if (typeof vehicle.setFullbeam == 'function') vehicle.setFullbeam(high);
        else mp.game.vehicle.setVehicleFullbeam(vehicle.handle, high);
    } catch (err) {}
}

function applyHeading(entity, value) {
    if (value == null || !entity || !entity.handle) return;
    if (entity.type == 'vehicle' && isLocalDriver(entity)) return;
    entity.setHeading(value);
}

function damageStamp(snapshot) {
    if (!snapshot || !snapshot.length) return '';
    return snapshot.join(',');
}

// Снимок не накладывается на водителя: повторный setDamage удваивает вмятину
function applyDamage(vehicle, snapshot) {
    if (!vehicle || vehicle.type != "vehicle") return;
    if (!snapshot) vehicle.__brokenWindows = 0;
    if (!vehicle.handle) return;
    if (vehicle.getVariable("robbed")) return;
    if (isLocalDriver(vehicle)) return;
    var stamp = damageStamp(snapshot);
    if (vehicle.__damageStamp === stamp) return;
    var had = !!vehicle.__damageStamp;
    vehicle.__damageStamp = stamp;
    if (!stamp) {
        if (!had) return;
        vehicle.setFixed();
        applyEngine(vehicle, vehicle.getVariable('engine'));
        applySignals(vehicle);
        applyHoodTrunk(vehicle, 0);
        applySiren(vehicle);
        return;
    }
    if (had && typeof vehicle.setDeformationFixed == "function") vehicle.setDeformationFixed();
    var doors = snapshot[0] | 0;
    var windows = snapshot[1] | 0;
    var wheels = snapshot[2] | 0;
    var dirt = snapshot[3] || 0;
    var i;
    for (i = 0; i < 6; i++) {
        if (doors & (1 << i)) vehicle.setDoorBroken(i, false);
    }
    for (i = 0; i < 8; i++) {
        if (!(windows & (1 << i))) continue;
        try {
            mp.game.vehicle.smashVehicleWindow(vehicle.handle, i);
        } catch (err) {}
    }
    for (i = 0; i < WHEEL_IDS.length; i++) {
        if (wheels & (1 << i)) vehicle.setTyreBurst(WHEEL_IDS[i], true, 1000);
    }
    if (typeof vehicle.setDirtLevel == 'function') vehicle.setDirtLevel(dirt);
    for (i = 4; i + 3 < snapshot.length; i += 4) {
        var amount = snapshot[i + 3];
        vehicle.setDamage(snapshot[i], snapshot[i + 1], snapshot[i + 2], amount < 10 ? amount * 100 : amount, 50, false);
    }
    applyEngine(vehicle, vehicle.getVariable('engine'));
    applySignals(vehicle);
    applyHoodTrunk(vehicle, doors);
    applySiren(vehicle);
}

function collectDamage(vehicle) {
    var doors = 0;
    var windows = 0;
    var wheels = 0;
    var i;
    for (i = 0; i < 6; i++) {
        if (isDoorDamaged(vehicle, i)) doors |= (1 << i);
    }
    for (i = 0; i < 8; i++) {
        try {
            var rolled = vehicle.getVariable("windowsDown") | 0;
            if (!rolled || !(rolled & (1 << i))) {
                if (!mp.game.vehicle.isVehicleWindowIntact(vehicle.handle, i)) windows |= (1 << i);
            }
        } catch (err) {}
    }
    windows |= vehicle.__brokenWindows | 0;
    var saved = vehicle.getVariable("damage");
    if (saved) windows |= saved[1] | 0;
    for (i = 0; i < WHEEL_IDS.length; i++) {
        try {
            if (mp.game.vehicle.isVehicleTyreBurst(vehicle.handle, WHEEL_IDS[i], false)) wheels |= (1 << i);
        } catch (err) {}
    }
    var dirt = 0;
    try {
        dirt = typeof vehicle.getDirtLevel == 'function' ? vehicle.getDirtLevel() : mp.game.vehicle.getVehicleDirtLevel(vehicle.handle);
    } catch (err) {
        dirt = 0;
    }
    var snapshot = [doors, windows, wheels, Math.round((dirt || 0) * 10) / 10];
    for (i = 0; i < DAMAGE_OFFSETS.length && snapshot.length < 52; i++) {
        var offset = DAMAGE_OFFSETS[i];
        var amount = 0;
        try {
            amount = mp.game.vehicle.getVehicleDeformationAtPos(vehicle.handle, offset[0], offset[1], offset[2]);
        } catch (err) {
            amount = 0;
        }
        if (!(amount > 0.15)) continue;
        snapshot.push(offset[0], offset[1], offset[2], Math.round(amount * 100) / 100);
    }
    return snapshot;
}

mp.events.add("playerLeaveVehicle", () => {
    mp.callCEFV('speedometer.arrow = 0');
    mp.callCEFV('speedometer.emergency = false');
    mp.timer.add(() => {
        try {
            currentSirenState = false;
        } catch (err) {
            mp.chat.debug('currentSirenState = false error')
        }

    }, 2000);

});

mp.events.addDataHandler("engine", (entity, value) => {
    applyEngine(entity, value);
});

mp.timer.addInterval(() => { /// GTA глушит мотор у водителя, чужие машины берёт стрим
    try {
        var player = mp.players.local;
        var vehicle = player.vehicle;
        if (!vehicle || !mp.vehicles.exists(vehicle)) return;
        if (vehicle.getPedInSeat(-1) !== player.handle) return;
        applyEngine(vehicle, vehicle.getVariable('engine') || false);
    } catch (err) {
        mp.chat.debug('engine sync error');
    }

}, 100);

mp.timer.addInterval(() => {
    try {
        var player = mp.players.local;
        var vehicle = player.vehicle;
        if (!vehicle || !mp.vehicles.exists(vehicle) || !vehicle.handle) return;
        if (vehicle.getPedInSeat(-1) !== player.handle) return;
        if (vehicle.getVariable('robbed')) return;
        var snapshot = collectDamage(vehicle);
        var clean = snapshot[0] == 0 && snapshot[1] == 0 && snapshot[2] == 0 && snapshot[3] < 0.05 && snapshot.length == 4;
        var key = clean ? '' : snapshot.join(',');
        if (vehicle.__damageSent === key) return;
        vehicle.__damageSent = key;
        mp.events.callRemote('vehicles.damage.sync', JSON.stringify(clean ? [0, 0, 0, 0] : snapshot));
    } catch (err) {
        mp.chat.debug('damage sync error');
    }
}, 1000);

mp.timer.addInterval(() => {
    mp.vehicles.forEachInStreamRange((vehicle) => {
        if (!vehicle.handle) return;
        var bits = vehicle.__brokenWindows | 0;
        var saved = vehicle.getVariable("damage");
        if (saved) bits |= saved[1] | 0;
        var rolled = vehicle.getVariable("windowsDown") | 0;
        if (!bits && !rolled) return;
        for (var n = 0; n < 4; n++) {
            try {
                if (rolled & (1 << n)) {
                    mp.game.vehicle.rollDownWindow(vehicle.handle, n);
                    continue;
                }
                if (bits & (1 << n)) mp.game.vehicle.smashVehicleWindow(vehicle.handle, n);
            } catch (err) {}
        }
    });
}, 1000);

let lastLightState;
let lightState = 0;
let lastLockStatus;

speedometerUpdateTimer = mp.timer.addInterval(() => { /// Обновление спидометра

    try {
        if ((!mp.players.local.vehicle) || (mp.players.local.vehicle.getPedInSeat(-1) != mp.players.local.handle)) return;

        let engine = mp.players.local.vehicle.getIsEngineRunning();
        let lastEngine;
        if (engine != lastEngine) {
            if (!engine) {
                mp.callCEFV(`speedometer.isActive = false`);
                lastEngine = false;
            } else {
                mp.callCEFV(`speedometer.isActive = true`);
                lastEngine = true;
            }
        }

        let speed = Math.floor(mp.players.local.vehicle.getSpeed() * 3.6);
        mp.callCEFV(`speedometer.speed = ${speed}`);

        let lights = mp.players.local.vehicle.getLightsState(1, 1); /// Фары

        let low = lights.lightsOn;
        let high = lights.highbeamsOn;
        if (low == 0 && high == 0) lightState = 0;
        if (low == 0 && high == 1) lightState = 1;
        if (low == 1 && high == 0) lightState = 2;
        if (low == 1 && high == 1) lightState = 3;
        if (lastLightState != lightState) {
            mp.callCEFV(`speedometer.headlights = ${lightState}`);
            lastLightState = lightState;
            mp.events.callRemote('vehicles.lights.set', lightState);
        }
        let lockStatus = mp.players.local.vehicle.getDoorLockStatus();
        if (lockStatus != lastLockStatus) {
            lastLockStatus = lockStatus;
            if (lockStatus == 1) {
                mp.callCEFV(`speedometer.lock = 0`);
            } else {
                mp.callCEFV(`speedometer.lock = 1`);
            }
        }
    } catch (err) {
        mp.chat.debug('speedometerUpdateTimer error');
    }


}, 100);

function applyRolledWindows(vehicle) {
    if (!vehicle || vehicle.type != "vehicle" || !vehicle.handle) return;
    var bits = vehicle.getVariable("windowsDown") | 0;
    for (var i = 0; i < 4; i++) {
        try {
            if (bits & (1 << i)) mp.game.vehicle.rollDownWindow(vehicle.handle, i);
            else mp.game.vehicle.rollUpWindow(vehicle.handle, i);
        } catch (err) {}
    }
}

mp.events.addDataHandler("windowsDown", (entity) => {
    applyRolledWindows(entity);
});

mp.keys.bind(0x5A, true, function() {
    if (mp.busy.includes(['chat', 'cuffs', 'terminal'])) return;
    var vehicle = mp.players.local.vehicle;
    if (!vehicle) return;
    var handle = mp.players.local.handle;
    var seat = -2;
    if (vehicle.getPedInSeat(-1) === handle) seat = -1;
    else {
        for (var i = 0; i < 3; i++) {
            if (vehicle.getPedInSeat(i) === handle) {
                seat = i;
                break;
            }
        }
    }
    if (seat < -1) return;
    var index = seat === -1 ? 0 : seat + 1;
    if (seat === -1 && mp.keys.isDown(0x11)) index = -1;
    mp.events.callRemote("vehicles.window.roll", index);
});

mp.keys.bind(0x32, true, function() {
    if (mp.busy.includes(['chat', 'cuffs', 'terminal'])) return;
    if (!mp.players.local.vehicle) return;
    if (mp.players.local.vehicle.getPedInSeat(-1) === mp.players.local.handle) {
        mp.events.callRemote('vehicles.engine.toggle');
    }
});

mp.events.add('vehicles.engine.toggle', (state) => {
    mp.callCEFV(`speedometer.isActive = ${state}`);
})

mp.events.add('vehicles.speedometer.show', (state, isElectric = isCurrentVehicleElectric) => {
    isCurrentVehicleElectric = isElectric;
    if (mp.speedometerEnabled) {
        if (state) {
            let vehicle = mp.players.local.vehicle;
            if (!vehicle) return;
            let engine = vehicle.getIsEngineRunning()
            mp.callCEFV(`speedometer.isElectricCar = ${isElectric}`);
            mp.callCEFV(`speedometer.isActive = ${engine}`);
            mp.callCEFV('speedometer.show = true');
        } else {
            mp.callCEFV('speedometer.show = false');
        }
    }

});

mp.events.add('vehicles.speedometer.sync', () => {

    let vehicle = mp.players.local.vehicle;
    if (!vehicle) return;
    var left = vehicle.getVariable(`leftTurnSignal`);
    var right = vehicle.getVariable(`rightTurnSignal`);

    if (left && right) {
        mp.callCEFV('speedometer.emergency = true');
    }
    if (left && !right) {
        mp.callCEFV('speedometer.arrow = 1');
    }
    if (!left && right) {
        mp.callCEFV('speedometer.arrow = 2');
    }
});

mp.events.add('vehicles.speedometer.fuel.update', (litres) => {
    mp.callCEFV(`speedometer.fuel = ${litres}`);
});

mp.events.add('vehicles.speedometer.mileage.update', (mileage) => {
    mileage = parseInt(mileage);
    mp.callCEFV(`speedometer.mileage = ${mileage}`);
});

mp.events.add('vehicles.speedometer.max.update', (fuel) => {
    mp.callCEFV(`speedometer.maxFuel = ${fuel}`);
    let vehicle = mp.players.local.vehicle;
    if (!vehicle) return;
    let maxSpeed = (mp.game.vehicle.getVehicleModelMaxSpeed(vehicle.model) * 3.6).toFixed(0);
    mp.callCEFV(`speedometer.maxSpeed = ${maxSpeed}`);
});

var mileageTimer, mileageUpdateTimer, lastPos, currentDist = 0;

mp.events.add('vehicles.mileage.start', (value) => {
    if (mp.players.local.vehicle) {
        mp.players.local.vehicle.mileage = value;
    }
    startMileageCounter();
});

function startMileageCounter() {

    var player = mp.players.local;
    lastPos = player.position;
    stopMileageCounter();
    mileageTimer = mp.timer.addInterval(() => {
        var vehicle = player.vehicle;
        if (!vehicle) return stopMileageCounter();

        var dist = (vehicle.position.x - lastPos.x) * (vehicle.position.x - lastPos.x) + (vehicle.position.y - lastPos.y) * (vehicle.position.y - lastPos.y) +
            (vehicle.position.z - lastPos.z) * (vehicle.position.z - lastPos.z);
        dist = Math.sqrt(dist);
        if (dist > 200) dist = 50;
        dist /= 1000;

        currentDist += dist;
        lastPos = vehicle.position;

        var mileage = vehicle.mileage + currentDist;
        mp.events.call('vehicles.speedometer.mileage.update', mileage);
    }, 1000);
    mileageUpdateTimer = mp.timer.addInterval(() => {
        try {
            var vehicle = player.vehicle;
            if (!vehicle) return stopMileageCounter();
            if (currentDist < 0.1) return;
            mp.events.callRemote(`vehicles.mileage.add`, currentDist);
            vehicle.mileage += currentDist;
            currentDist = 0;
        } catch (err) {
            mp.chat.debug('mileageUpdateTimer error');
        }
    }, 60000);
};

function stopMileageCounter() {

    mp.timer.remove(mileageTimer);
    mp.timer.remove(mileageUpdateTimer);

    if (currentDist < 0.1) return;
    mp.events.callRemote(`vehicles.mileage.add`, currentDist);
    currentDist = 0;
};

mp.keys.bind(0x25, true, function() {
    if (mp.busy.includes()) return;
    var player = mp.players.local;
    var vehicle = player.vehicle;
    if (!vehicle) return;
    if (vehicle.getPedInSeat(-1) != player.handle) return;

    var left = vehicle.getVariable(`leftTurnSignal`);
    var right = vehicle.getVariable(`rightTurnSignal`);
    mp.callCEFV('speedometer.arrow = 0');
    if (!left || !right) {
        mp.events.callRemote("vehicles.signals.left", !left);
        if (!left) {
            mp.callCEFV('speedometer.arrow = 0');
            mp.callCEFV('speedometer.arrow = 1');
        } else {
            mp.callCEFV('speedometer.arrow = 0');
        }

    }
});

mp.keys.bind(0x27, true, function() {
    if (mp.busy.includes()) return;
    var player = mp.players.local;
    var vehicle = player.vehicle;
    if (!vehicle) return;
    if (vehicle.getPedInSeat(-1) != player.handle) return;

    var left = vehicle.getVariable(`leftTurnSignal`);
    var right = vehicle.getVariable(`rightTurnSignal`);
    mp.callCEFV('speedometer.arrow = 0');
    if (!left || !right) {
        mp.events.callRemote("vehicles.signals.right", !right);
        if (!right) {
            mp.callCEFV('speedometer.arrow = 0');
            mp.callCEFV('speedometer.arrow = 2');
        } else {
            mp.callCEFV('speedometer.arrow = 0');
        }
    }
});


mp.keys.bind(0x28, true, () => {
    if (mp.busy.includes()) return;
    var player = mp.players.local;
    var vehicle = player.vehicle;
    if (!vehicle) return;
    if (vehicle.getPedInSeat(-1) != player.handle) return;

    var left = vehicle.getVariable(`leftTurnSignal`);
    var right = vehicle.getVariable(`rightTurnSignal`);

    if (left && right) {
        mp.events.callRemote(`vehicles.signals.emergency`, false);
        mp.callCEFV('speedometer.arrow = 0');
        mp.callCEFV('speedometer.emergency = false');
    } else {
        mp.events.callRemote(`vehicles.signals.emergency`, true);
        mp.callCEFV('speedometer.arrow = 0');
        mp.callCEFV('speedometer.emergency = true');
    }
});

mp.keys.bind(87, true, () => { // W
    var player = mp.players.local;
    if (!player.autopilot || !player.vehicle) return;
    delete player.autopilot;
    player.clearTasks();
    mp.notify.info("Автопилот деактивирован");
});

mp.events.addDataHandler("leftTurnSignal", (entity) => {
    applySignals(entity);
});

mp.events.addDataHandler("rightTurnSignal", (entity) => {
    applySignals(entity);
});

mp.events.addDataHandler("hood", (entity) => {
    applyHoodTrunk(entity);
});

mp.events.addDataHandler("trunk", (entity) => {
    applyHoodTrunk(entity);
});

mp.events.addDataHandler("sirenSound", (entity) => {
    applySiren(entity);
});

mp.events.addDataHandler("sirenLights", (entity) => {
    applySiren(entity);
});

mp.events.addDataHandler("heading", (entity, value) => {
    applyHeading(entity, value);
});

mp.events.addDataHandler("damage", (entity, value) => {
    applyDamage(entity, value);
});

mp.events.addDataHandler("lights", (entity, value) => {
    applyLights(entity, value);
});

mp.events.add('entityStreamIn', (entity) => {
    if (entity.type != 'vehicle') return;
    applyEngine(entity, entity.getVariable('engine'));
    applySignals(entity);
    applySiren(entity);
    applyLights(entity, entity.getVariable('lights'));
    applyRolledWindows(entity);
    if (entity.getVariable('robbed')) return;
    applyDamage(entity, entity.getVariable('damage'));
    applyHoodTrunk(entity);

    var rotation = entity.getVariable("rotation");
    if (rotation && !isLocalDriver(entity)) entity.setRotation(rotation);
});

mp.events.add('vehicles.lock', () => {
    let veh = mp.getCurrentInteractionEntity();
    if (!veh) return;
    if (veh.type != 'vehicle') return;
    if (mp.moduleVehicles.nearBootVehicleId != null || mp.moduleVehicles.nearHoodVehicleId != null)
        return mp.notify.error(`Необходимо находиться у двери`, `Авто`);
    mp.events.callRemote('vehicles.lock', veh.remoteId);
})

mp.events.add('vehicles.hood', () => {
    let veh = mp.getCurrentInteractionEntity();
    if (!veh) return;
    if (veh.type != 'vehicle') return;
    if (mp.moduleVehicles.nearHoodVehicleId == null || mp.moduleVehicles.nearHoodVehicleId != veh.remoteId)
        return mp.notify.error(`Необходимо находиться у капота`, `Авто`);

    if (veh.getVariable("hood")) {
        mp.events.callRemote('vehicles.hood', veh.remoteId, false);
    } else {
        mp.events.callRemote('vehicles.hood', veh.remoteId, true);
    }
});

mp.events.add('vehicles.trunk', () => {
    let veh = mp.getCurrentInteractionEntity();
    if (!veh) return;
    if (veh.type != 'vehicle') return;
    if (mp.moduleVehicles.nearBootVehicleId == null || mp.moduleVehicles.nearBootVehicleId != veh.remoteId)
        return mp.notify.error(`Необходимо находиться у багажника`, `Авто`);

    if (veh.getVariable("trunk")) {
        mp.events.callRemote('vehicles.trunk', veh.remoteId, false);
    } else {
        mp.events.callRemote('vehicles.trunk', veh.remoteId, true);
    }
});

mp.events.add('vehicles.explode', () => {
    let veh = mp.getCurrentInteractionEntity();
    if (!veh) return;
    if (veh.type != 'vehicle') return;
    mp.events.callRemote('vehicles.explode', veh.remoteId);
});

mp.events.add('vehicles.siren.sound', () => {
    let veh = mp.getCurrentInteractionEntity();
    if (!veh) return;
    if (veh.type != 'vehicle') return;
    mp.events.callRemote('vehicles.siren.sound', veh.remoteId);
});

let sirenLightsUpdater = mp.timer.addInterval(() => {
    try {
        var vehicle = mp.players.local.vehicle;
        if (!vehicle || vehicle.getPedInSeat(-1) !== mp.players.local.handle) return;
        if (currentSirenState == vehicle.isSirenOn()) return;
        mp.events.callRemote('vehicles.siren.lights');
        currentSirenState = vehicle.isSirenOn();
    } catch (err) {
        mp.chat.debug('sirenLightsUpdater error');
    }

}, 1000);


mp.vehicles.getVehiclePosition = (vehicle) => {
    let data = {
        x: vehicle.position.x,
        y: vehicle.position.y,
        z: vehicle.position.z,
        h: vehicle.getHeading()
    }
    return data;
}

mp.events.add('vehicles.heading.set', (heading) => {
    let veh = mp.players.local.vehicle;
    if (!veh) return;

    veh.setHeading(heading);
    veh.setOnGroundProperly();
});

mp.events.add('vehicles.onGroundProperly.set', () => {
    let veh = mp.players.local.vehicle;
    if (!veh) return;
    veh.setOnGroundProperly();
});


mp.events.add('vehicles.speedometer.enabled', (enabled) => {
    mp.speedometerEnabled = enabled;
});
mp.events.add("time.main.tick", () => {
    var start = Date.now();
    // var entity = mp.utils.getNearPlayerOrVehicle(mp.players.local.position, 10);
    var vehicle = mp.utils.getNearVehicle(mp.players.local.position, 10);

    if (vehicle && vehicle.type == "vehicle") {
        var bootPos = mp.utils.getBootPosition(vehicle);
        var distToBoot = mp.vdist(mp.players.local.position, bootPos);
        if (distToBoot < 1) {
            if (mp.moduleVehicles.nearBootVehicleId == null) {
                mp.moduleVehicles.nearBootVehicleId = vehicle.remoteId;
                mp.events.call("playerEnterVehicleBoot", mp.players.local, vehicle);
            }
        } else {
            if (mp.moduleVehicles.nearBootVehicleId != null) {
                mp.events.call("playerExitVehicleBoot", mp.players.local, mp.vehicles.atRemoteId(mp.moduleVehicles.nearBootVehicleId));
                mp.moduleVehicles.nearBootVehicleId = null;
            }
        }

        var hoodPos = mp.utils.getHoodPosition(vehicle);
        var distToHood = mp.vdist(mp.players.local.position, hoodPos);
        if (distToHood < 1) {
            if (mp.moduleVehicles.nearHoodVehicleId == null) {
                mp.moduleVehicles.nearHoodVehicleId = vehicle.remoteId;
                mp.events.call("playerEnterVehicleHood", mp.players.local, vehicle);
            }
        } else {
            if (mp.moduleVehicles.nearHoodVehicleId != null) {
                mp.events.call("playerExitVehicleHood", mp.players.local, mp.vehicles.atRemoteId(mp.moduleVehicles.nearHoodVehicleId));
                mp.moduleVehicles.nearHoodVehicleId = null;
            }
        }
    } else {
        if (mp.moduleVehicles.nearBootVehicleId != null) {
            mp.events.call("playerExitVehicleBoot", mp.players.local, mp.vehicles.atRemoteId(mp.moduleVehicles.nearBootVehicleId));
            mp.moduleVehicles.nearBootVehicleId = null;
        }
        if (mp.moduleVehicles.nearHoodVehicleId != null) {
            mp.events.call("playerExitVehicleHood", mp.players.local, mp.vehicles.atRemoteId(mp.moduleVehicles.nearHoodVehicleId));
            mp.moduleVehicles.nearHoodVehicleId = null;
        }
    }

    var player = mp.players.local;
    if (player.autopilot && player.vehicle) {
        var coord = mp.utils.getWaypointCoord();
        if (!coord) {
            delete player.autopilot;
            player.clearTasks();
            mp.notify.info("Автопилот деактивирован");
        } else {
            var dist = mp.vdist(player.position, coord);
            if (dist < 50 && coord.z - player.position.z > 2) {
                delete player.autopilot;
                player.clearTasks();
                mp.notify.info("Вы прибыли на место", "Автопилот");
            }
        }
    }

    mp.timeMainChecker.modules.vehicles = Date.now() - start;
});

mp.moduleVehicles = {
    nearBootVehicleId: null,
    nearHoodVehicleId: null,
    disabledControl: false,

    getSeat(player) {
        if (!player.vehicle) return null;

        var seats = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
        for (var i = 0; i < seats.length; i++) {
            if (player.vehicle.getPedInSeat(seats[i]) == player.handle) return seats[i];
        }

        return null;
    },
    disableControl(enable) {
        this.disabledControl = enable;
    },
}

mp.events.add({
    "vehicles.disableControl": (enable) => {
        mp.moduleVehicles.disableControl(enable);
    },
    "playerEnterVehicleBoot": (player, vehicle) => {
        if (player.vehicle) return;
        if (vehicle.getVariable("static")) return;
        if (!vehicle.getVariable("trunk")) {
            mp.prompt.showByName("vehicle_open_boot");
        }
    },
    "playerEnterVehicleHood": (player, vehicle) => {
        if (player.vehicle) return;
        if (vehicle.getVariable("static")) return;
        if (!vehicle.getVariable("hood")) {
            mp.prompt.showByName("vehicle_open_hood");
        } else mp.prompt.showByName("vehicle_close_hood");
    },
    "playerExitVehicleBoot": (player, vehicle) => {
        mp.prompt.hide();
    },
    "playerExitVehicleHood": (player, vehicle) => {
        mp.prompt.hide();
    },
});

mp.events.addDataHandler("hood", (vehicle, value) => {
    if (mp.moduleVehicles.nearHoodVehicleId == null) return;
    if (mp.moduleVehicles.nearHoodVehicleId != vehicle.remoteId) return;
    if (value) mp.prompt.showByName("vehicle_close_hood");
    else mp.prompt.showByName("vehicle_open_hood");
});

mp.events.add('render', () => {
    var start = Date.now();
    mp.vehicles.forEachInStreamRange((vehicle) => {
        if (mp.vdist(mp.players.local.position, vehicle.position) > 10) return;
        if (vehicle.getVariable('label')) {
            let label = vehicle.getVariable('label');
            mp.game.graphics.drawText(label, [vehicle.position.x, vehicle.position.y, vehicle.position.z + 2.7], {
                font: 0,
                color: [255, 255, 255, 255],
                scale: [0.35, 0.35],
                outline: true,
                centre: true
            });
        }
        if (vehicle.getVariable('unload')) {
            var bootPos = mp.utils.getBootPosition(vehicle);
            mp.game.graphics.drawText(`Разгрузка...`, [bootPos.x, bootPos.y, bootPos.z + 1], {
                font: 0,
                color: [187, 255, 0, 255],
                scale: [0.25, 0.25],
                outline: true,
                centre: true
            });
        }
    });
    if (mp.moduleVehicles.disabledControl) {
        mp.game.controls.disableControlAction(0, 59, true); /// INPUT_VEH_MOVE_LR
        mp.game.controls.disableControlAction(0, 60, true); /// INPUT_VEH_MOVE_UD
        mp.game.controls.disableControlAction(0, 71, true); /// INPUT_VEH_ACCELERATE
        mp.game.controls.disableControlAction(0, 72, true); /// INPUT_VEH_BRAKE
        // mp.game.controls.disableControlAction(0, 75, true); /// INPUT_VEH_EXIT
    }
    if (mp.renderChecker) mp.utils.drawText2d(`vehicles rend: ${Date.now() - start} ms`, [0.8, 0.67]);
});

mp.events.add('vehicles.add.menu.show', () => {
    mp.events.call('selectMenu.show', 'vehiclePropAdd');
});

let autopilotIsEnabled = false;
mp.events.add('vehicles.autopilot.enable', (enable) => {
    autopilotIsEnabled = enable;
});

mp.events.add('vehicles.autopilot', () => {
    var player = mp.players.local;
    var veh = player.vehicle;
    if (!autopilotIsEnabled) return mp.notify.warning("На этот транспорт не установлен автопилот");
    if (!veh) return mp.notify.error("Вы не в авто");
    var pos = mp.utils.getWaypointCoord();
    if (!pos) return mp.notify.warning("Укажите точку на карте");

    var speed = 25;
    var drivingStyle = 1074528293;
    var stopRange = 50;

    player.autopilot = true;
    player.taskVehicleDriveToCoordLongrange(veh.handle, pos.x, pos.y, pos.z + 2, speed, drivingStyle, stopRange);
    mp.notify.success("Автопилот активирован");
    mp.prompt.showByName("vehicle_autopilot");
});

mp.events.add('characterInit.done', () => {
    mp.timer.addInterval(async () => {
        mp.vehicles.forEachInStreamRange((vehicle) => {
            if (mp.vdist(mp.players.local.position, vehicle.position) > 30) return;
            if (vehicle.remoteId == null) return;
            if (!vehicle.getVariable('isValid')) {
                mp.events.callRemote('vehicles.invalid.found', vehicle.remoteId);
            }
        });
    }, 1000);
});
