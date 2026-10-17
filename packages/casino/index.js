"use strict";

let wheel = require('./wheel.js');
let horseracing = require('./horseracing.js');
let slots = require('./slots.js');
let anticheat = call('anticheat');

let info = {
    x: 936.0476684570312,
    y: 47.1480598449707,
    z: 81.09574890136719,
    enter: {
        x: 936.0476684570312,
        y: 47.1480598449707,
        z: 81.09574890136719,
        toX: 1090.128662109375,
        toY: 208.46066284179688,
        toZ: -48.9999885559082,
        toD: 1,
        toH: 358.18463134765625
    },
    exit: {
        x: 1089.6820068359375,
        y: 205.87353515625,
        z: -48.999732971191406,
        d: 1,
        toX: 935.1140747070312,
        toY: 45.80738830566406,
        toZ: 81.09574890136719,
        toH: 140.51380920410156
    },
    area: {
        x: 1100.5877685546875,
        y: 219.75877380371094,
        z: -48.748653411865234
    }
}
let casinoArea;
let infoShape;
let wheelShape;
let itbShape;
let wheelDisc = null;
let wheelSpinning = false;
let wheelSpinTimer = null;
let wheelShowcaseVeh = null;

function normalizeAngle(angle) {
    return ((angle % 360) + 360) % 360;
}

module.exports = {
    minDiceCash: 100,
    maxDiceCash: 10000,
    wheel,
    horseracing,
    slots,
    getWheelDisc() {
        return wheelDisc;
    },
    isWheelSpinning() {
        return wheelSpinning;
    },
    /// Вращение колеса на сервере — алгоритм из aboba/DiamondCasino.cs Roll()
    /// Плавное ускорение → замедление → «дотягивание» с перелётом/недолётом
    spinWheel(winAngle, callback = () => {}) {
        if (wheelSpinning || !wheelDisc) return callback(false);

        wheelSpinning = true;
        wheelDisc.rotation = new mp.Vector3(0, 0, 0);

        let speedIntCnt = 1;
        let rollAngle = winAngle + (360 * wheel.FULL_ROTATIONS);
        const midLength = rollAngle / 2;
        let rotY = 0;

        if (wheelSpinTimer) clearInterval(wheelSpinTimer);
        wheelSpinTimer = setInterval(() => {
            if (rollAngle > midLength) speedIntCnt++;
            else {
                speedIntCnt--;
                if (speedIntCnt < 0) speedIntCnt = 0;
            }

            const rollspeed = speedIntCnt / wheel.SPIN_SPEED_DIVISOR;

            if (rollspeed > 0) {
                rotY -= rollspeed;
                rollAngle -= rollspeed;
            } else if (rollAngle > 0) {
                const step = rollAngle > 1 ? 0.15 : 0.08;
                rotY -= step;
                rollAngle -= step;
            } else if (rollAngle < 0) {
                const step = rollAngle < -1 ? 0.15 : 0.08;
                rotY += step;
                rollAngle += step;
            }

            wheelDisc.rotation = new mp.Vector3(0, rotY, 0);

            if (speedIntCnt <= 0 && rollAngle <= 0) {
                clearInterval(wheelSpinTimer);
                wheelSpinTimer = null;
                wheelSpinning = false;
                wheelDisc.rotation = new mp.Vector3(0, normalizeAngle(rotY), 0);
                callback(true);
            }
        }, wheel.SPIN_TICK_MS);
    },
    init() {
        mp.blips.new(617, new mp.Vector3(info.x, info.y, info.z),
            {
                name: "Казино",
                shortRange: true,
                color: 4
            });

        let enter = mp.colshapes.newSphere(info.enter.x, info.enter.y, info.enter.z, 1.5);
        enter.onEnter = (player) => {
            anticheat.allowMove(player);
            player.position = new mp.Vector3(info.enter.toX, info.enter.toY, info.enter.toZ);
            player.dimension = info.enter.toD;
            player.heading = info.enter.toH;
        }

        mp.markers.new(2, new mp.Vector3(info.enter.x, info.enter.y, info.enter.z - 0.3), 0.75, {
            rotation: new mp.Vector3(0, 180, 0),
            dimension: 0
        });

        let exit = mp.colshapes.newSphere(info.exit.x, info.exit.y, info.exit.z, 1.5);
        exit.dimension = info.exit.d;
        exit.onEnter = (player) => {
            anticheat.allowMove(player);
            player.position = new mp.Vector3(info.exit.toX, info.exit.toY, info.exit.toZ);
            player.dimension = 0;
            player.heading = info.exit.toH;
        }

        mp.markers.new(2, new mp.Vector3(info.exit.x, info.exit.y, info.exit.z - 0.05), 0.75, {
            rotation: new mp.Vector3(0, 180, 0),
            dimension: info.exit.d
        });

        casinoArea = mp.colshapes.newSphere(info.area.x, info.area.y, info.area.z, 100);
        casinoArea.dimension = 1;
        casinoArea.onEnter = (player) => {
            player.call('casino.area.enter', [true]);
        }
        casinoArea.onExit = (player) => {
            player.call('casino.area.enter', [false]);
        }

        infoShape = mp.colshapes.newSphere(1088.2305908203125, 219.5839080810547, -49.200382232666016, 1.2)
        infoShape.dimension = 1;
        infoShape.onEnter = (player) => {
            player.call('casino.info.show', [true]);
        }
        infoShape.onExit = (player) => {
            player.call('casino.info.show', [false]);
        }

        // Зона взаимодействия у колеса удачи
        wheelShape = mp.colshapes.newSphere(
            wheel.WHEEL_INTERACT_POS.x,
            wheel.WHEEL_INTERACT_POS.y,
            wheel.WHEEL_INTERACT_POS.z,
            wheel.WHEEL_INTERACT_RADIUS
        );
        wheelShape.dimension = wheel.WHEEL_DIMENSION;
        wheelShape.onEnter = (player) => {
            player.isNearWheel = true;
            player.call('casino.wheel.area.enter', [true]);
        }
        wheelShape.onExit = (player) => {
            player.isNearWheel = false;
            player.call('casino.wheel.area.enter', [false]);
        }

        // Маркер-подсказка на полу под колесом (на уровне ног игрока)
        mp.markers.new(27, new mp.Vector3(
            wheel.WHEEL_INTERACT_POS.x,
            wheel.WHEEL_INTERACT_POS.y,
            wheel.WHEEL_INTERACT_POS.z - 0.05
        ), 0.6, {
            color: [255, 215, 0, 100],
            dimension: wheel.WHEEL_DIMENSION
        });

        // Зона ITB-автомата скачек (Inside Track)
        const itb = horseracing.ITB_ZONE;
        itbShape = mp.colshapes.newSphere(itb.x, itb.y, itb.z, itb.radius);
        itbShape.dimension = itb.dimension;
        itbShape.onEnter = (player) => {
            player.isNearITB = true;
            player.call('casino.horse.area', [true]);
        }
        itbShape.onExit = (player) => {
            player.isNearITB = false;
            player.call('casino.horse.area', [false]);
        }

        // Маркер-подсказка под ITB-автоматом
        mp.markers.new(27, new mp.Vector3(itb.x, itb.y, itb.z - 0.05), 0.6, {
            color: [86, 173, 255, 110],
            dimension: itb.dimension
        });

        // Серверное колесо и витрина — отложенный спавн (нативный краш при создании в tick init)
        setTimeout(() => this.initWheelDisc(), 3000);
        setTimeout(() => this.initWheelShowcase(), 5000);
    },
    initWheelDisc() {
        try {
            if (wheelDisc && mp.objects.exists(wheelDisc)) return;
            wheelDisc = mp.objects.new(
                mp.joaat(wheel.WHEEL_DISC_MODEL),
                new mp.Vector3(wheel.WHEEL_OBJECT_POS.x, wheel.WHEEL_OBJECT_POS.y, wheel.WHEEL_OBJECT_POS.z),
                {
                    rotation: new mp.Vector3(0, 0, 0),
                    dimension: wheel.WHEEL_DIMENSION
                }
            );
            console.log('[CASINO] wheel disc spawned');
        } catch (e) {
            console.log('[CASINO] wheel disc spawn failed:', e);
        }
    },
    /// Витринный автомобиль у колеса (вращение — на клиенте, render)
    initWheelShowcase() {
        const cfg = wheel.WHEEL_SHOWCASE;
        if (wheelShowcaseVeh && mp.vehicles.exists(wheelShowcaseVeh)) {
            wheelShowcaseVeh.destroy();
        }

        try {
            wheelShowcaseVeh = mp.vehicles.new(
                cfg.model,
                new mp.Vector3(cfg.x, cfg.y, cfg.z),
                {
                    heading: cfg.h,
                    dimension: wheel.WHEEL_DIMENSION,
                    engine: false,
                    locked: true,
                }
            );
            wheelShowcaseVeh.setColor(cfg.color1, cfg.color2);
            wheelShowcaseVeh.numberPlate = 'CASINO';
            console.log('[CASINO] wheel showcase vehicle spawned');
        } catch (e) {
            console.log('[CASINO] wheel showcase spawn failed:', e);
        }
    },
    /// Выдача выигранного автомобиля (логика как в автосалоне)
    async giveWheelPrizeVehicle(player, prize) {
        const vehicles = call('vehicles');
        const houses = call('houses');
        const parkings = call('parkings');
        const inventory = call('inventory');

        if (!vehicles.isAbleToBuyVehicle(player)) {
            return { ok: false, reason: 'no_slot' };
        }

        const cant = inventory.cantAdd(player, 33, {});
        if (cant) {
            return { ok: false, reason: 'no_inventory', text: cant };
        }

        const hasHouse = houses.isHaveHouse(player.character.id);
        const carPlate = vehicles.generateVehiclePlate();
        const parking = parkings.getClosestParkingId(player);
        const now = new Date();
        const modelName = prize.modelName || wheel.WHEEL_SHOWCASE.model;
        const color1 = prize.color1 != null ? prize.color1 : wheel.WHEEL_SHOWCASE.color1;
        const color2 = prize.color2 != null ? prize.color2 : wheel.WHEEL_SHOWCASE.color2;

        const data = await db.Models.Vehicle.create({
            key: 'private',
            owner: player.character.id,
            modelName,
            color1,
            color2,
            x: 0,
            y: 0,
            z: 0,
            h: 0,
            parkingDate: hasHouse ? null : now,
            parkingId: parking,
            plate: carPlate,
            owners: 1,
            regDate: now,
        });

        const veh = {
            key: 'private',
            owner: player.character.id,
            modelName,
            color1,
            color2,
            x: 0,
            y: 0,
            z: 0,
            h: 0,
            parkingId: parking,
            parkingDate: hasHouse ? null : now,
            fuel: 50,
            mileage: 0,
            plate: carPlate,
            engineState: 0,
            fuelState: 0,
            steeringState: 0,
            brakeState: 0,
            destroys: 0,
            owners: 1,
            regDate: now,
        };
        veh.sqlId = data.id;
        veh.db = data;

        if (!hasHouse) {
            mp.events.call('parkings.vehicle.add', veh);
        } else {
            vehicles.spawnHomeVehicle(player, veh);
        }

        const props = vehicles.getVehiclePropertiesByModel(modelName);
        player.vehicleList.push({
            id: data.id,
            name: props.name,
            plate: data.plate,
            regDate: data.regDate,
            owners: data.owners,
            vehType: props.vehType,
            price: props.price,
            parkingDate: data.parkingDate,
        });

        inventory.fullDeleteItemsByParams(33, 'vehId', veh.db.id);
        return new Promise(resolve => {
            inventory.addItem(player, 33, {
                owner: player.character.id,
                vehId: veh.db.id,
                vehName: props.name,
            }, err => {
                if (err) resolve({ ok: false, reason: 'no_inventory', text: err });
                else resolve({ ok: true, name: props.name, plate: carPlate });
            });
        });
    },
    isPlayerInCasinoArea(player) {
        return casinoArea.isPointWithin(player.position);
    },
    isPlayerNearWheel(player) {
        return !!player.isNearWheel;
    },
    isPlayerNearITB(player) {
        return !!player.isNearITB;
    }
}

