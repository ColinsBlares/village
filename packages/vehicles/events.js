"use strict";
var vehicles = require('./index.js')
var inventory = call('inventory');
var notifs = call('notifications');
var utils = call('utils');
var timer = call('timer');

let money = call('money');
let houses = call('houses');
let anticheat = call('anticheat');

function readMusicQueue(vehicle) {
    var raw = vehicle.getVariable("musicQueue");
    if (!raw || typeof raw != "string") return [];
    try {
        var list = JSON.parse(raw);
        if (!Array.isArray(list)) return [];
        return list.filter((item) => typeof item == "string" && item.length > 0 && item.length <= 300).slice(0, 15);
    } catch (err) {
        return [];
    }
}

function applyMusicQueue(vehicle, queue, index) {
    if (!queue.length || index < 0 || index >= queue.length) {
        vehicle.setVariable("musicQueue", null);
        vehicle.setVariable("musicIndex", null);
        vehicle.setVariable("musicUrl", null);
        vehicle.setVariable("musicAt", null);
        return;
    }
    var at = Date.now();
    vehicle.setVariable("musicQueue", JSON.stringify(queue));
    vehicle.setVariable("musicIndex", index);
    vehicle.setVariable("musicAt", at);
    vehicle.setVariable("musicUrl", queue[index]);
}

function musicDriver(player) {
    if (!player.character) return null;
    if (!player.vehicle || player.seat != 0) {
        notifs.error(player, `Нужно быть за рулём`, `Музыка`);
        return null;
    }
    return player.vehicle;
}

function musicUrlOk(raw) {
    return typeof raw == "string" && raw.length <= 300 && /^https?:\/\/\S+$/i.test(raw);
}

module.exports = {
    "init": async () => {
        await vehicles.init();
        inited(__dirname);
    },
    "playerEnterVehicle": (player, vehicle, seat) => {
        if (!player.character) return;
        player.call('vehicles.garage', [vehicle.isInGarage]);

        if (vehicle.key == 'job' && vehicle.owner != player.character.job && seat == 0) {
            player.removeFromVehicle();
            player.call('notifications.push.error', ["Это рабочий транспорт", "Нет доступа"]);
            return;
        }

        let isPrivate = false;
        if (vehicle.key == 'private' && vehicle.owner == player.character.id) {
            isPrivate = true;
        }
        player.call('vehicles.enter.private', [isPrivate]);

        let enableAutopilot = vehicle.properties.isElectric;
        player.call('vehicles.autopilot.enable', [enableAutopilot]);
        
        if (!vehicle.engine && seat == 0 && !vehicle.isInGarage && vehicle.properties.vehType != 2) {
            player.call('prompt.showByName', ['vehicle_engine']);
        }
        if (seat == 0) {
            let enabled = vehicle.properties.vehType == 2 ? false : true;
            player.call('vehicles.speedometer.enabled', [enabled]);
            player.call('vehicles.speedometer.show', [true, vehicle.properties.isElectric]);
            player.call('vehicles.speedometer.max.update', [vehicle.properties.maxFuel]);
            player.call('vehicles.speedometer.sync');
            timer.remove(player.indicatorsUpdateTimer);

            let playerId = player.id;
            let characterId = player.character.id;
            player.indicatorsUpdateTimer = timer.addInterval(() => {
                try {
                    let target = mp.players.at(playerId);
                    if (!target || !target.character || target.character.id != characterId) return timer.remove(player.indicatorsUpdateTimer);
                    player.call('vehicles.speedometer.fuel.update', [Math.ceil(vehicle.fuel)]);
                } catch (err) {
                    console.log(err);
                    timer.remove(player.indicatorsUpdateTimer);
                }
            }, 1000, true);
        }
        player.call('vehicles.mileage.start', [vehicle.mileage]);

        mp.events.call('vehicle.ready', player, vehicle, seat);
    },
    "playerQuit": (player) => {
        if (player.indicatorsUpdateTimer) {
            timer.remove(player.indicatorsUpdateTimer);
        }
        if (player.vehicle) player.vehicle.lastPlayerTime = Date.now();
    },
    "vehicleDeath": (vehicle) => {
        vehicles.respawnVehicle(vehicle);
    },
    "playerExitVehicle": (player, vehicle) => {
        if (player.indicatorsUpdateTimer) {
            timer.remove(player.indicatorsUpdateTimer);
        }
        player.call('vehicles.indicators.show', [false]);
        player.call('vehicles.speedometer.show', [false]);
        player.call('vehicles.garage', [false]);
        player.call('prompt.hide');

        vehicle.lastPlayerTime = Date.now();
        if (player.vehicleDisabledControl) vehicles.disableControl(player, false);
    },
    "playerStartExitVehicle": (player) => {
        if (player.vehicle.engine) player.vehicle.engine = true;
    },
    "vehicles.engine.toggle": (player) => { /// Включение/выключение двигателя
        if (!player.vehicle) return;
        if (player.vehicleDisabledControl) return;
        if (player.vehicle.key == "market") return;
        if (player.vehicle.key == "rent" && !player.vehicle.isActiveRent) return;
        if (player.vehicle.key == "job" && player.vehicle.owner == 2 && !player.vehicle.isActiveTaxi) return;
        if (player.vehicle.key == "job" && player.vehicle.owner == 3 && !player.vehicle.isActiveBus) return;
        if (player.vehicle.key == "job" && player.vehicle.owner == 4 && !player.vehicle.driver) return;
        if (player.vehicle.properties.vehType == 2) return; // велосипед
        if (player.vehicle.isBeingRepaired) return player.call('notifications.push.warning', ['Двигатель завести нельзя', 'Ремонт']);
        if (player.vehicle.isBeingTuned) return;
        if (player.vehicle.fuel <= 0) return player.call('notifications.push.error', [player.vehicle.properties.isElectric ? 'Нет зарядки' :'Нет топлива', 'Транспорт']);
        if (player.vehicle.engine == true) {
            player.vehicle.engine = false;
            player.call('vehicles.engine.toggle', [false]);
            player.vehicle.setVariable("engine", false);
        } else {
            if (player.vehicle.key == 'private' && !vehicles.haveKeys(player, player.vehicle)) return notifs.error(player, `Вы не имеете ключи`, player.vehicle.properties.name);
            player.vehicle.engine = true;
            player.call('vehicles.engine.toggle', [true]);
            player.vehicle.setVariable("engine", true);
            player.call('prompt.hide');
            if (player.vehicle.key == 'private') {
                vehicles.generateBreakdowns(player.vehicle);
            }
            mp.events.call('vehicles.breakdowns.init', player);
        }
    },
    'vehicles.breakdowns.init': (player) => {
        if (!player.vehicle) return;
        let vehicle = player.vehicle;
        try {
            let data = {
                engineState: vehicle.engineState,
                steeringState: vehicle.steeringState,
                fuelState: vehicle.fuelState,
                brakeState: vehicle.brakeState
            }
            player.call('vehicles.breakdowns.init', [data]);
        } catch (err) {
            console.log(err);
        }
    },
    "vehicles.mileage.add": (player, value) => {
        if (!player.vehicle) return;

        if (value < 0.1) return;
        player.vehicle.mileage += value;
        vehicles.updateMileage(player);
        //player.call('chat.message.push', [`!{#adff9e} Пробег ${player.vehicle.mileage}`]);
    },
    "entityCreated": (entity) => {
        if (entity.type == "vehicle") {
            entity.setVariable("leftTurnSignal", false);
            entity.setVariable("rightTurnSignal", false);
            entity.setVariable("hood", false);
            entity.setVariable("trunk", false);
        }
    },
    "vehicles.signals.left": (player, state) => {
        if (!player.vehicle) return;
        player.vehicle.setVariable("leftTurnSignal", state);
        player.vehicle.setVariable("rightTurnSignal", false);
    },
    "vehicles.signals.right": (player, state) => {
        if (!player.vehicle) return;
        player.vehicle.setVariable("rightTurnSignal", state);
        player.vehicle.setVariable("leftTurnSignal", false);
    },
    "vehicles.signals.emergency": (player, state) => {
        if (!player.vehicle) return;
        player.vehicle.setVariable("rightTurnSignal", state);
        player.vehicle.setVariable("leftTurnSignal", state);
    },
    "vehicles.hood": (player, vehicleId, state) => {
        if (!anticheat.guard(player, 'vehicles.hood')) return;
        if (!player.character) return;
        let vehicle = mp.vehicles.at(vehicleId);
        if (!vehicle) return;
        if (vehicle.dimension != player.dimension || player.dist(vehicle.position) > 12) return;
        if (vehicle.key == 'private' && !vehicles.haveKeys(player, vehicle)) return notifs.error(player, `Вы не имеете ключи`, vehicle.properties.name);
        if (vehicle.db && vehicle.db.key == 'faction' && player.character.factionId != vehicle.db.owner) return notifs.error(player, `Нет доступа`, vehicle.properties.name);

        vehicle.setVariable("hood", state);
    },
    "vehicles.trunk": (player, vehicleId, state) => {
        if (!anticheat.guard(player, 'vehicles.trunk')) return;
        if (!player.character) return;
        let vehicle = mp.vehicles.at(vehicleId);
        if (!vehicle) return;
        if (vehicle.dimension != player.dimension || player.dist(vehicle.position) > 12) return;
        if (vehicle.db && vehicle.db.key == 'private' && !vehicles.haveKeys(player, vehicle)) return notifs.error(player, `Вы не имеете ключи`, vehicle.properties.name);
        if (vehicle.db && vehicle.db.key == 'faction' && player.character.factionId != vehicle.db.owner) return notifs.error(player, `Нет доступа`, vehicle.properties.name);

        vehicle.setVariable("trunk", state);

        var unload = vehicle.getVariable("unload");
        if (unload && !state) vehicle.setVariable("unload", null);
    },
    "characterInit.done": (player) => {
        mp.events.call('vehicles.private.load', player);
    },
    "vehicles.private.load": (player) => {
        vehicles.loadPrivateVehicles(player);
    },
    "vehicles.lock": (player, vehicleId) => {
        if (!anticheat.guard(player, 'vehicles.lock')) return;
        if (!player.character) return;
        let vehicle = mp.vehicles.at(vehicleId);
        if (!vehicle) return;
        if (vehicle.dimension != player.dimension || player.dist(vehicle.position) > 12) return;
        
        let allowedKeys = ['faction', 'private'];
        if (!allowedKeys.includes(vehicle.key)) return notifs.error(player, `Это не ваш транспорт`);
        
        if (vehicle.key == 'faction' && vehicle.owner != player.character.factionId) return notifs.error(player, `Это не ваш транспорт`);
        if (vehicle.key == 'private' && !vehicles.haveKeys(player, vehicle)) return notifs.error(player, `У вас нет ключей`, vehicle.properties.name);

        let state = vehicle.locked;
        if (state) {
            vehicle.locked = false;
            player.call('notifications.push.success', ['Вы открыли транспорт', 'Успешно']);
        } else {
            vehicle.locked = true;
            player.call('notifications.push.success', ['Вы закрыли транспорт', 'Успешно']);
        }
    },
    "vehicles.explode": (player, vehicleId) => {
        if (!anticheat.guard(player, 'vehicles.explode', 3, 5000)) return;
        if (!player.character) return;
        let vehicle = mp.vehicles.at(vehicleId);
        if (!vehicle) return;
        // Удаление чужой целой машины по id — только админу или уже мёртвой рядом
        if (vehicle.dimension != player.dimension || player.dist(vehicle.position) > 10) return;
        if (player.character.admin < 4 && !vehicles.isDead(vehicle)) return anticheat.trigger(player, 'explosion', `vehicles.explode целой машины ${vehicle.id}`);
        timer.add(() => {
            if (!mp.vehicles.exists(vehicle)) return;
            vehicle.explode();
            vehicle.destroy();
        }, 2000);
    },
    "vehicles.ejectlist.get": (player, vehicleId) => {
        let vehicle = mp.vehicles.at(vehicleId);
        if (!vehicle) return;
        let occupants = vehicles.getOccupants(vehicle);
        if (occupants.length == 0) return;

        let ejectList = [];

        occupants.forEach((current) => {
            if ((current.id != player.id) && (current.seat != 0)) {
                ejectList.push({
                    id: current.id,
                    name: current.name
                });
            }
        });
        if (ejectList.length == 0) return player.call('notifications.push.error', ['В т/с нет пассажиров', 'Транспорт']);;
        player.call('interaction.ejectlist.show', [ejectList]);
    },
    "vehicles.eject": (player, playerToEject) => {
        if (!playerToEject) return;
        playerToEject = JSON.parse(playerToEject);

        let target = mp.players.at(playerToEject.id);
        if (!target) return;
        if (!target.vehicle) return;
        if (target.name != playerToEject.name) return;

        try {
            target.removeFromVehicle();
            target.call('notifications.push.warning', ['Вас вытолкнули из т/с', 'Транспорт']);
            player.call('notifications.push.success', ['Вы вытолкнули пассажира', 'Транспорт']);
        } catch (err) {
            console.log(err);
        }
    },
    "vehicles.siren.sound": (player, vehicleId) => {
        if (!player.vehicle) return;
        let vehicle = mp.vehicles.at(vehicleId);
        if (!vehicle) return;

        var sirenSound = vehicle.getVariable("sirenSound");
        vehicle.setVariable("sirenSound", !sirenSound);
    },
    "vehicles.siren.lights": (player) => {
        if (!player.vehicle || player.seat != 0) return;

        var sirenLights = player.vehicle.getVariable("sirenLights");
        if (sirenLights == player.vehicle.siren) return;
        player.vehicle.setVariable("sirenLights", player.vehicle.siren);
    },
    "vehicles.damage.sync": (player, raw) => {
        if (!player.vehicle || player.seat != 0) return;
        if (player.vehicle.getVariable('robbed')) return;
        var now = Date.now();
        if (player.damageSyncAt && now - player.damageSyncAt < 700) return;
        player.damageSyncAt = now;
        if (typeof raw != 'string' || raw.length > 700) return;
        var snapshot;
        try {
            snapshot = JSON.parse(raw);
        } catch (err) {
            return;
        }
        if (!Array.isArray(snapshot) || snapshot.length < 4 || snapshot.length > 52) return;
        for (var i = 0; i < snapshot.length; i++) {
            if (typeof snapshot[i] != 'number' || !isFinite(snapshot[i])) return;
        }
        snapshot[1] = (snapshot[1] | 0) | (player.vehicle.brokenWindows | 0);
        var clean = snapshot[0] == 0 && snapshot[1] == 0 && snapshot[2] == 0 && snapshot[3] < 0.05 && snapshot.length == 4;
        var nextKey = clean ? '' : snapshot.join(',');
        if ((player.vehicle.__damageKey || '') == nextKey) return;
        player.vehicle.__damageKey = nextKey;
        player.vehicle.setVariable('damage', clean ? null : snapshot);
    },
    "vehicles.lights.set": (player, state) => {
        if (!player.vehicle || player.seat != 0) return;
        state = state | 0;
        if (state < 0 || state > 3) return;
        if (player.vehicle.getVariable('lights') === state) return;
        player.vehicle.setVariable('lights', state);
    },
    "vehicles.window.roll": (player, index) => {
        if (!player.character || !player.vehicle) return;
        if (player.vehicle.getVariable("robbed")) return;
        index = index | 0;
        if (player.seat != 0 && index != player.seat) return;
        if (index != -1 && (index < 0 || index > 3)) return;
        var broken = player.vehicle.brokenWindows | 0;
        var bits = player.vehicle.getVariable("windowsDown") | 0;
        if (index == -1) {
            if (player.seat != 0) return;
            var open = false;
            for (var i = 0; i < 4; i++) {
                if (broken & (1 << i)) continue;
                if (!(bits & (1 << i))) open = true;
            }
            for (var n = 0; n < 4; n++) {
                if (broken & (1 << n)) continue;
                if (open) bits |= (1 << n);
                else bits &= ~(1 << n);
            }
        } else {
            if (broken & (1 << index)) return notifs.error(player, `Стекло разбито`, `Окна`);
            if (bits & (1 << index)) bits &= ~(1 << index);
            else bits |= (1 << index);
        }
        bits &= ~broken;
        var prev = player.vehicle.getVariable("windowsDown") | 0;
        if (bits === prev) return;
        player.vehicle.setVariable("windowsDown", bits ? bits : null);
        if (index == -1) notifs.info(player, open ? `Стёкла опущены` : `Стёкла подняты`, `Окна`);
        else notifs.info(player, bits & (1 << index) ? `Стекло опущено` : `Стекло поднято`, `Окна`);
    },
    "vehicles.sell.send": (player, data) => {
        data = JSON.parse(data);
        if (!player.vehicle) return player.call('vehicles.sell.send.ans', [0]);

        if (player.vehicle.key != 'private' || player.vehicle.owner != player.character.id) return player.call('vehicles.sell.send.ans', [1]);

        if (player.id == data.id) return player.call('vehicles.sell.send.ans', [6]);

        let price = parseInt(data.price);
        if (isNaN(price) || price < 1) return player.call('vehicles.sell.send.ans', [2]);

        let target = mp.players.at(data.id);
        if (!target) return player.call('vehicles.sell.send.ans', [3]);

        if (player.dist(target.position) > 10) return player.call('vehicles.sell.send.ans', [4]);

        let vehicle = player.vehicle;

        let carSellData = {
            targetName: target.name,
            vehicleName: vehicle.properties.name,
            price: price
        }
        player.call('vehicles.sell.send.ans', [5, carSellData]);
    },
    "vehicles.sell.seller.accept": (player, data) => {
        data = JSON.parse(data);

        let price = parseInt(data.price);
        if (isNaN(price) || price < 1) return player.call('notifications.push.error', ['Неверная цена', 'Ошибка']);

        let target = mp.players.at(data.id);
        if (!target) return player.call('notifications.push.error', ['Нет игрока', 'Ошибка']);

        if (player.dist(target.position) > 10) return player.call('notifications.push.error', ['Игрок далеко', 'Ошибка']);

        let vehicle = player.vehicle;
        if (!vehicle) return player.call('notifications.push.error', ['Вы не в транспорте', 'Ошибка']);
        if (player.vehicle.key != 'private' || player.vehicle.owner != player.character.id) return player.call('notifications.push.error', ['Это не ваш транспорт', 'Ошибка']);
        let vehId = vehicle.sqlId;

        target.sellCarTargetOffer = {
            seller: player,
            vehicle: vehicle,
            price: price,
            vehId: vehId
        }
        player.sellCarSenderOffer = {
            vehId: vehId
        }

        target.call('offerDialog.show', ["vehicles_sell", {
            name: player.character.name,
            model: vehicle.properties.name,
            price: price,
            plate: vehicle.plate
        }]);
    },
    "vehicles.sell.offer.accept": (player, accept) => {
        if (!player.sellCarTargetOffer) return;
        let target = player;
        let seller = target.sellCarTargetOffer.seller;

        if (accept) {
            let vehicle = seller.vehicle;
            if (!vehicle || vehicle.sqlId != target.sellCarTargetOffer.vehId) {
                target.call('vehicles.sell.target.final', [2]);
                seller.call('vehicles.sell.seller.final', [2]);
                delete target.sellCarTargetOffer;
                delete seller.sellCarSenderOffer;
                return;
            }
            if (target.character.cash < target.sellCarTargetOffer.price) {
                //target.call('notifications.push.error', ['Недостаточно денег', 'Ошибка']);
                target.call('vehicles.sell.target.final', [0]);
                seller.call('vehicles.sell.seller.final', [0]);
                delete target.sellCarTargetOffer;
                delete seller.sellCarSenderOffer;
                return;
            }
            if (!vehicles.isAbleToBuyVehicle(target)) {
                target.call('vehicles.sell.target.final', [3]);
                seller.call('vehicles.sell.seller.final', [3]);
                delete target.sellCarTargetOffer;
                delete seller.sellCarSenderOffer;
                return;
            }

            var cant = inventory.cantAdd(target, 33, {});
            if (cant) {
                target.call('vehicles.sell.target.final', [4, {
                    text: cant
                }]);
                // seller.call('vehicles.sell.seller.final', [4, {
                //     text: cant
                // }]);
                delete target.sellCarTargetOffer;
                delete seller.sellCarSenderOffer;
                return;
            }

            let price = target.sellCarTargetOffer.price;
            let vehId = target.sellCarTargetOffer.vehId;
            let owners = vehicle.owners;

            const car = vehicles.getVehicleBySqlId(vehId);
            if (car && car.isInGarage) {
                target.call('notifications.push.error', ['Машина в гараже', 'Ошибка']);
                seller.call('notifications.push.error', ['Машина в гараже', 'Ошибка']);
                delete target.sellCarTargetOffer;
                delete seller.sellCarSenderOffer;
                return;
            }

            money.moveCash(target, seller, price, function(result) {
                if (result) {
                    //target.call('notifications.push.success', ['Вы купили транспорт', 'Успешно']);
                    target.call('vehicles.sell.target.final', [1]);
                    //seller.call('notifications.push.success', ['Вы продали транспорт', 'Успешно']);
                    seller.call('vehicles.sell.seller.final', [1]);
                    db.Models.Vehicle.update({
                        owner: target.character.id,
                        owners: owners + 1
                    }, {
                        where: {
                            id: vehId
                        }
                    });
                    let veh = vehicles.getVehicleBySqlId(vehId);
                    if (veh) {
                        veh.db.owner = target.character.id;
                        veh.db.owners = veh.owners + 1;
                        veh.owner = target.character.id;
                        veh.owners = veh.owners + 1;
                    }
                    if (seller.vehicle) {
                        seller.removeFromVehicle();
                    }

                    vehicles.removeVehicleFromPlayerVehicleList(seller, vehId);
                    vehicles.removeVehicleFromCarPlace(seller, veh);


                    // TODO на парковке или нет
                    let props = vehicles.getVehiclePropertiesByModel(veh.modelName)
                    target.vehicleList.push({
                        id: veh.sqlId,
                        name: props.name,
                        plate: veh.plate,
                        regDate: veh.regDate,
                        owners: veh.owners,
                        vehType: props.vehType,
                        price: props.price,
                        parkingDate: veh.parkingDate
                    });
                    let hasHouse = houses.isHaveHouse(player.character.id);
                    if (hasHouse && veh) vehicles.setVehicleHomeSpawnPlaceByVeh(player, veh);

                    inventory.fullDeleteItemsByParams(33, 'vehId', vehId);
                    // выдача ключей в инвентарь
                    inventory.addItem(target, 33, {
                        owner: target.character.id,
                        vehId: vehId,
                        vehName: props.name
                    }, (e) => {
                        if (e) return player.call('vehicles.sell.target.final', [4, {
                            text: e
                        }]);
                    });
                    // удаление ключей у продавца
                    // inventory.deleteByParams(seller, 33, 'vehId', vehId);

                    delete target.sellCarTargetOffer;
                    delete seller.sellCarSenderOffer;
                } else {
                    //target.call('notifications.push.error', ['Не удалось купить т/с', 'Ошибка']);
                    target.call('vehicles.sell.target.final', [2]);
                    seller.call('vehicles.sell.seller.final', [2]);
                    //seller.call('notifications.push.error', ['Не удалось продать т/с', 'Ошибка']);
                    delete target.sellCarTargetOffer;
                    delete seller.sellCarSenderOffer;
                }
            }, `Покупка/продажа т/с ${vehicle.properties.name} (#${vehicle.sqlId}) с рук`, `Покупка/продажа т/с ${vehicle.properties.name} (#${vehicle.sqlId}) с рук`);
        } else {
            delete target.sellCarTargetOffer;
            delete seller.sellCarSenderOffer;
        }
    },
    "vehicles.garage.leave": (player) => {
        if (!player.vehicle) return;
        if (!player.vehicle.isInGarage) return;
        if (player.vehicle.key != 'private' || player.vehicle.owner != player.character.id) return;

        let streetPlace = player.carPlaces.find(x => x.d == 0);

        if (!streetPlace) return;
        player.vehicle.isInGarage = false;
        player.call('vehicles.garage', false);
        anticheat.allowMove(player);
        player.vehicle.position = new mp.Vector3(streetPlace.x, streetPlace.y, streetPlace.z);
        //player.vehicle.rotation = new mp.Vector3(0, 0, 0);
        //player.vehicle.setHeading(streetPlace.h);
        player.call('vehicles.heading.set', [streetPlace.h]);

        anticheat.allowMove(player);
        player.vehicle.dimension = 0;
    },
    "vehicles.music": (player, raw) => {
        var vehicle = musicDriver(player);
        if (!vehicle) return;
        raw = typeof raw == 'string' ? raw.trim() : '';
        var volMatch = raw.match(/^(?:volume|vol|громкость)\s+(\d{1,3})$/i);
        if (volMatch) {
            var level = Math.max(0, Math.min(100, parseInt(volMatch[1], 10)));
            vehicle.setVariable('musicVol', level);
            return notifs.info(player, `Громкость ${level}%`, `Музыка`);
        }
        if (!raw || raw == 'off' || raw == 'stop') {
            applyMusicQueue(vehicle, [], 0);
            return notifs.info(player, `Музыка выключена`, `Музыка`);
        }
        if (!musicUrlOk(raw)) return notifs.error(player, `Нужна прямая ссылка http или https`, `Музыка`);
        var now = Date.now();
        if (player.musicSetAt && now - player.musicSetAt < 400) return;
        player.musicSetAt = now;
        var queue = readMusicQueue(vehicle);
        if (queue.length >= 15) return notifs.error(player, `В очереди уже 15 треков`, `Музыка`);
        queue.push(raw);
        if (vehicle.getVariable('musicUrl')) {
            vehicle.setVariable('musicQueue', JSON.stringify(queue));
            return notifs.success(player, `Трек добавлен в очередь`, `Музыка`);
        }
        applyMusicQueue(vehicle, queue, 0);
        notifs.success(player, `Трек включён в машине`, `Музыка`);
    },
    "vehicles.music.add": (player, raw) => {
        mp.events.call('vehicles.music', player, typeof raw == 'string' ? raw.trim() : '');
    },
    "vehicles.music.volume": (player, level) => {
        var vehicle = musicDriver(player);
        if (!vehicle) return;
        level = Math.max(0, Math.min(100, parseInt(level, 10) || 0));
        if (vehicle.getVariable('musicVol') === level) return;
        vehicle.setVariable('musicVol', level);
    },
    "vehicles.music.stop": (player) => {
        var vehicle = musicDriver(player);
        if (!vehicle) return;
        applyMusicQueue(vehicle, [], 0);
    },
    "vehicles.music.play": (player, index) => {
        var vehicle = musicDriver(player);
        if (!vehicle) return;
        var queue = readMusicQueue(vehicle);
        index = parseInt(index, 10);
        if (!queue.length || index < 0 || index >= queue.length) return;
        applyMusicQueue(vehicle, queue, index);
    },
    "vehicles.music.remove": (player, index) => {
        var vehicle = musicDriver(player);
        if (!vehicle) return;
        var queue = readMusicQueue(vehicle);
        index = parseInt(index, 10);
        if (index < 0 || index >= queue.length) return;
        var current = vehicle.getVariable('musicIndex');
        if (current == null) current = 0;
        queue.splice(index, 1);
        if (!queue.length) return applyMusicQueue(vehicle, [], 0);
        if (index < current) return applyMusicQueue(vehicle, queue, current - 1);
        if (index == current) return applyMusicQueue(vehicle, queue, Math.min(index, queue.length - 1));
        vehicle.setVariable('musicQueue', JSON.stringify(queue));
        vehicle.setVariable('musicIndex', current);
    },
    "vehicles.music.next": (player) => {
        var vehicle = musicDriver(player);
        if (!vehicle) return;
        var queue = readMusicQueue(vehicle);
        var index = (vehicle.getVariable('musicIndex') | 0) + 1;
        applyMusicQueue(vehicle, queue, index);
    },
    "vehicles.music.prev": (player) => {
        var vehicle = musicDriver(player);
        if (!vehicle) return;
        var queue = readMusicQueue(vehicle);
        var index = (vehicle.getVariable('musicIndex') | 0) - 1;
        if (index < 0) index = 0;
        applyMusicQueue(vehicle, queue, index);
    },
    "vehicles.music.seek": (player, seconds) => {
        var vehicle = musicDriver(player);
        if (!vehicle || !vehicle.getVariable('musicUrl')) return;
        seconds = Math.max(0, Math.min(3600, Number(seconds) || 0));
        var now = Date.now();
        if (vehicle.musicSeekAt && now - vehicle.musicSeekAt < 250) return;
        vehicle.musicSeekAt = now;
        vehicle.setVariable('musicAt', now - Math.round(seconds * 1000));
    },
    "vehicles.music.ended": (player, remoteId) => {
        if (!player.character) return;
        var vehicle = mp.vehicles.at(remoteId);
        if (!vehicle || !vehicle.getVariable('musicUrl')) return;
        if (player.dimension != vehicle.dimension || player.dist(vehicle.position) > 80) return;
        var now = Date.now();
        var started = vehicle.getVariable('musicAt') || 0;
        if (now - started < 1500) return;
        if (vehicle.musicEndAt && now - vehicle.musicEndAt < 2000) return;
        vehicle.musicEndAt = now;
        var queue = readMusicQueue(vehicle);
        var index = vehicle.getVariable('musicIndex');
        if (index == null) index = -1;
        applyMusicQueue(vehicle, queue, index + 1);
    },
    "vehicles.window.broke": (player, remoteId, index) => {
        if (!player.character) return;
        var vehicle = mp.vehicles.at(remoteId);
        if (!vehicle) return;
        if (player.dimension != vehicle.dimension || player.dist(vehicle.position) > 25) return;
        index = index | 0;
        if (index < 0 || index > 7) return;
        vehicle.brokenWindows = (vehicle.brokenWindows | 0) | (1 << index);
        var damage = vehicle.getVariable("damage");
        if (!damage || !damage.length) damage = [0, 0, 0, 0];
        else damage = damage.slice();
        var bits = (damage[1] | 0) | vehicle.brokenWindows;
        if (bits === (damage[1] | 0)) return;
        damage[1] = bits;
        vehicle.__damageKey = damage.join(",");
        vehicle.setVariable("damage", damage);
    },
    "vehicles.radio.set": (player, radioIndex) => {
        if (!player.vehicle) return;
        if (player.seat != 0 && player.vehicle.getVariable('radioIndex') != null) return;
        radioIndex = radioIndex | 0;
        if (player.vehicle.getVariable('radioIndex') === radioIndex) return;
        player.vehicle.setVariable('radioIndex', radioIndex);
    },
    "time.main.tick": (ticks) => {
        if (ticks % 5) return;

        var start = new Date();
        mp.vehicles.forEach(veh => {
            if (!veh.db) return;
            if (!veh.lastPlayerTime) return;
            if (veh.db.key == 'private' || veh.db.key == 'market' || veh.db.key == 'rent') return;
            if (start.getTime() - veh.lastPlayerTime < vehicles.vehWaitSpawn) return;
            if (vehicles.getOccupants(veh).length) return;

            var spawnPos = new mp.Vector3(veh.db.x, veh.db.y, veh.db.z);
            var vehPos = veh.position;
            var dist = utils.vdist(spawnPos, vehPos);
            var isDead = vehicles.isDead(veh);
            if (dist > 10 || isDead) {
                vehicles.respawn(veh);
            }
        });
        // var diff = Date.now() - start.getTime();
        // debug(`time now: ${new Date()}`)
        // debug(`free vehicles was spawned: ${diff} ms`)
        // debug(`all vehicles: ${mp.vehicles.length}`)
    },
    "vehicles.props.add": async (player, data) => {
        console.log(data);
        data = JSON.parse(data);
        try {
            let prop = await db.Models.VehicleProperties.create({
                model: data.model,
                name: data.name,
                vehType: data.type,
                price: data.price,
                maxFuel: data.maxFuel,
                consumption: data.consumption
            });
            if (data.isAvailable) {
                await db.Models.CarList.create({
                    carShowId: data.carShowId,
                    vehiclePropertyModel: data.model,
                    percentage: data.percentage
                });
                player.call('notifications.push.success', ['Т/с добавлено']);
            }
        } catch (err) {
            console.log(err.message);
            player.call('notifications.push.error', [`${err.message.slice(0, 50)}...`, `Ошибка`]);
        }
    },
    "vehicles.invalid.found": (player, vehId) => {
        let vehicle = mp.vehicles.at(vehId);
        if (!vehicle) return;

        vehicle.setVariable("isValid", true);
        if (!vehicle.db) return;

        vehicle.setColor(vehicle.db.color1, vehicle.db.color2);
        vehicle.numberPlate = vehicle.db.plate;
        console.log(`[vehicles] Invalid vehicle found & fixed by ${player.name}`);
    },
    "vehicles.own.list.show": (player) => {
        if (!player.character) return;
        if (player.vehicleList.length == 0) return notifs.error(player, `У вас нет транспорта`);
        player.call('vehicles.own.list.show', [player.vehicleList, vehicles.ownVehicleRespawnPrice]);
    },
    "vehicles.own.deliver": (player, id) => {
        if (!player.character) return;
        let hasHouse = houses.isHaveHouse(player.character.id);
        let vehicle = mp.vehicles.toArray().find(x => x.sqlId == id);
        let price = vehicles.ownVehicleRespawnPrice;
        if (player.character.cash < price) return notifs.error(player, `Недостаточно денег`);
        if (!vehicle) return hasHouse ? notifs.warning(player, `Транспорт не найден`) :
            notifs.warning(player, `Не удалось отследить ваше т/с, ищите его на парковке`);

        if (vehicle.key != 'private' || vehicle.owner != player.character.id) return;
        money.removeCash(player, price, function(result) {
            if (result) {
                vehicles.respawnVehicle(vehicle);
            } else {
                notifs.error(player, `Ошибка финансовой операции`);
            }
        }, `Доставка т/с к дому`)

        notifs.success(player, `Транспортное средство доставлено ${hasHouse ? 'к дому' : 'на парковку'}`, 'Доставка');
    },
    "vehicles.own.find": (player, id) => {
        if (!player.character) return;
        let hasHouse = houses.isHaveHouse(player.character.id);
        let vehicle = mp.vehicles.toArray().find(x => x.sqlId == id);
        if (!vehicle) return hasHouse ? notifs.error(player, `Транспорт не найден`, `GPS`) :
            notifs.warning(player, `Не удалось отследить ваше т/с, ищите его на парковке`, `GPS`);

        if (vehicle.key != 'private' || vehicle.owner != player.character.id) return;

        if (vehicle.dimension != 0) return notifs.warning(player, `Не удалось отследить ваше т/с, попробуйте выполнить доставку`, `GPS`);
        let pos = vehicle.position;
        player.call('vehicles.own.destination.create', [pos]);
        notifs.success(player, 'Транспортное средство отмечено на карте', 'GPS');
    }
}
