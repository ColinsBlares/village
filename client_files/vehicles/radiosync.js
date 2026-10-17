const NATIVES = {
    GET_PLAYER_RADIO_STATION_INDEX: '0xE8AF77C4C06ADC93',
    GET_RADIO_STATION_NAME: '0xB28ECA15046CA8B9',
    SET_FRONTEND_RADIO_ACTIVE: '0xF7F26C6E9CC9EBB8',
    SET_RADIO_TO_STATION_INDEX: '0xA619B168B8A8570F',
    SET_VEH_RADIO_STATION: '0x1B9C0099CB942AC6'
}

let player = mp.players.local;
let radioSyncTimer;
let holdUploadUntil = 0;

mp.events.add({
    "playerEnterVehicle": (vehicle) => {
        mp.timer.remove(radioSyncTimer);
        var index = vehicle ? vehicle.getVariable('radioIndex') : null;
        if (index != null) {
            applyVehicleRadio(vehicle, index);
            applyFrontend(index);
            holdUploadUntil = Date.now() + 2000;
        }
        radioSyncTimer = mp.timer.addInterval(syncRadio, 1000);
    },
    "playerLeaveVehicle": () => {
        mp.timer.remove(radioSyncTimer);
    },
    "entityStreamIn": (entity) => {
        if (!entity || entity.type != 'vehicle') return;
        applyVehicleRadio(entity, entity.getVariable('radioIndex'));
        var remoteId = entity.remoteId;
        mp.timer.add(() => {
            var veh = mp.vehicles.atRemoteId(remoteId);
            if (!veh || !veh.handle) return;
            applyVehicleRadio(veh, veh.getVariable('radioIndex'));
        }, 400);
    }
});

mp.events.addDataHandler('radioIndex', (entity, value) => {
    applyVehicleRadio(entity, value);
    if (!entity || !entity.handle) return;
    if (player.vehicle != entity || player.handle == entity.getPedInSeat(-1)) return;
    applyFrontend(value);
});

function stationName(radioIndex) {
    if (radioIndex === 255) return 'OFF';
    var name = mp.game.invoke(NATIVES.GET_RADIO_STATION_NAME, radioIndex);
    return typeof name == 'string' && name ? name : null;
}

function applyVehicleRadio(vehicle, radioIndex) {
    if (!vehicle || vehicle.type != 'vehicle' || !vehicle.handle || radioIndex == null) return;
    var station = stationName(radioIndex);
    if (!station) return;
    mp.game.invoke(NATIVES.SET_VEH_RADIO_STATION, vehicle.handle, station);
}

function applyFrontend(radioIndex) {
    if (radioIndex == null) return;
    let currentRadioIndex = mp.game.invoke(NATIVES.GET_PLAYER_RADIO_STATION_INDEX);
    if (radioIndex == currentRadioIndex) return;
    if (radioIndex === 255) {
        mp.game.audio.setRadioToStationName("OFF");
        return;
    }
    mp.game.invoke(NATIVES.SET_FRONTEND_RADIO_ACTIVE, true);
    mp.game.invoke(NATIVES.SET_RADIO_TO_STATION_INDEX, radioIndex);
}

function syncRadio() {
    try {
        let vehicle = player.vehicle;
        if (!vehicle) return;
        let radioIndex = vehicle.getVariable('radioIndex');
        let currentRadioIndex = mp.game.invoke(NATIVES.GET_PLAYER_RADIO_STATION_INDEX);
        if (player.handle == vehicle.getPedInSeat(-1)) {
            if (Date.now() < holdUploadUntil) return;
            if (radioIndex != currentRadioIndex) mp.events.callRemote('vehicles.radio.set', currentRadioIndex);
        } else if (radioIndex == null) {
            mp.events.callRemote('vehicles.radio.set', currentRadioIndex);
        } else {
            applyFrontend(radioIndex);
        }
    } catch (err) {
        mp.chat.debug(err.message);
        mp.timer.remove(radioSyncTimer);
    }
}
