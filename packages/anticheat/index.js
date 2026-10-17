"use strict";

/*
    Серверный античит.

    Сервер — источник правды по здоровью, броне, оружию, патронам и позиции.
    Клиент только сигналит, отвечает на пульс и сбрасывает нативы.
*/

const u32 = h => (Number(h) >>> 0);

const UNARMED = 2725352035;
const PARACHUTE = 4222310262;
const OBJECT_WEAPON = 966099553;
const MINIGUN = 1119849093;
const HEAD_BONE = 20;

// Кулдаун одного и того же срабатывания по игроку
const TRIGGER_COOLDOWN = 10000;
// Окно разрешения после серверной записи
const GRACE = 2000;
// Пульс
const PING_INTERVAL = 15000;
const PING_MISSES = 3;
// Окно сведения урона стрелка и урона жертвы
const DAMAGE_WINDOW = 2000;
// Запас дистанции на задержку синхронизации
const RANGE_LAG = 3;
// Запас патронов на задержку синхронизации
const AMMO_LAG = 5;
// Запас выстрелов подряд на джиттер сети
const FIRE_BURST = 3;

const PARAMS = [
    ['weapon', 1, 'kick', 'Оружие не из слота рук'],
    ['ammo', 1, 'kick', 'Патронов больше, чем в предмете'],
    ['health', 1, 'notify', 'Лечение без серверного источника'],
    ['godmode', 1, 'kick', 'Урон не снимает здоровье'],
    ['armour', 1, 'notify', 'Броня без надетого бронежилета'],
    ['teleport', 1, 'kick', 'Скачок позиции'],
    ['speed', 1, 'notify', 'Скорость пешком выше спринта'],
    ['explosion', 1, 'kick', 'Взрыв без оружия'],
    ['projectile', 1, 'kick', 'Снаряд без оружия в руках'],
    ['vehicle', 1, 'notify', 'Вход в машину без серверного ключа'],
    ['repair', 1, 'notify', 'Починка машины без сервиса'],
    ['jail', 1, 'kick', 'Выход из тюрьмы или КПЗ'],
    ['flood', 1, 'kick', 'Флуд репортов и взрывов'],
    ['native', 1, 'kick', 'Событие __ragemp_cheat_detected'],
    ['rules', 0, 'notify', 'Провал max-ping / min-fps / max-packet-loss'],
    ['spectate', 1, 'notify', 'Режим наблюдения'],
    ['damage', 1, 'kick', 'Аномальный исходящий урон'],
    ['invisible', 1, 'notify', 'Локальная невидимость'],
    ['model', 0, 'notify', 'Смена модели игрока'],
    ['fly', 1, 'kick', 'Набор высоты без транспорта и парашюта'],
    ['warp', 1, 'kick', 'Посадка в машину с большого расстояния'],
    ['flycar', 1, 'notify', 'Наземная машина набирает высоту'],
    ['firerate', 1, 'kick', 'Очередь быстрее темпа оружия'],
    ['range', 1, 'kick', 'Попадание дальше дистанции оружия'],
    ['modifier', 1, 'kick', 'Множитель урона, бега или бесконечные патроны'],
    ['freecam', 1, 'notify', 'Камера далеко от педа'],
    ['heartbeat', 1, 'kick', 'Клиентский античит не отвечает'],
    ['peace', 1, 'kick', 'Урон или выстрел в мирной зоне'],
    ['cuffs', 1, 'kick', 'Действие в наручниках'],
    ['money', 1, 'kick', 'Деньги или предмет мимо серверного сценария'],
    ['job', 1, 'kick', 'Награда работы раньше таймера'],
    ['logspam', 1, 'kick', 'Клиентский logger.log'],
];

// Срабатывания, которые работают до выбора персонажа
const PRE_CHARACTER = ['native', 'flood'];
// Имена, которые клиент может прислать в anticheat.report
const CLIENT_REPORTS = ['weapon', 'jail', 'spectate', 'invisible', 'godmode', 'damage', 'modifier', 'freecam', 'rules', 'health'];
// Клиентские сигналы, которые сервер сам не подтверждает: только оповещение
const SOFT_REPORTS = ['spectate', 'invisible', 'godmode', 'damage', 'freecam', 'rules', 'health'];

const EXPLOSIVE_NAMES = [
    'weapon_rpg', 'weapon_grenadelauncher', 'weapon_grenadelauncher_smoke', 'weapon_hominglauncher',
    'weapon_compactlauncher', 'weapon_firework', 'weapon_grenade', 'weapon_bzgas', 'weapon_molotov',
    'weapon_stickybomb', 'weapon_proxmine', 'weapon_pipebomb', 'weapon_smokegrenade',
];
const LAUNCHER_NAMES = [
    'weapon_rpg', 'weapon_grenadelauncher', 'weapon_grenadelauncher_smoke', 'weapon_hominglauncher',
    'weapon_compactlauncher', 'weapon_firework',
];
// Типы взрывов от оружия. Остальные (машины, бочки, колонки) считаются только во флуд
const WEAPON_EXPLOSIONS = [0, 1, 2, 3, 4, 5, 18, 19, 20, 21, 22, 25, 32, 33];

// Группы оружия по client_files/weapons/data.js
const GROUPS = {
    melee: [UNARMED, 2578778090, 1737195953, 1317494643, 2508868239, 1141786504, 2227010557, 2460120199,
        4192643659, 3638508604, 3713923289, 3756226112, 4191993645, 3441901897, 2484171525, 419712736, 2343591895],
    pistol: [453432689, 3219281620, 1593441988, 584646201, 2578377531, 3523564046, 3218215474, 2285322324,
        137902532, 3249783761, 3415619887, 2548703416, 3696079510, 911657153],
    smg: [324215364, 736523883, 2024373456, 171789620, 4024951519, 3173288789, 3675956304, 1627465347],
    rifle: [3220176749, 961495388, 2210333304, 4208062921, 2937143193, 3231910285, 2526821735, 2132975508,
        2228681469, 1649403952, 2634544996, 2144741730, 3686625920, MINIGUN],
    shotgun: [487013001, 1432025498, 2017895192, 2640438543, 3800352039, 4019527611, 984333226, 317205821],
    sniper: [100416529, 205991906, 177293209, 3342088282, 1785463520, 2828843422],
    // Урон не от оружия в руках: наезд, таран, огонь, падение, взрыв
    special: [2741846334, 133987706, 539292904, 3750660587, 3452007600, 4194021054, 148160082, 2461879995,
        3425972830, 341774354, 1223143800, 4284007675, 1936677264, 2339582971],
};
const RANGE = { melee: 4, pistol: 120, smg: 140, rifle: 250, shotgun: 40, sniper: 400, special: 180, other: 180 };
const DAMAGE_CAP = { sniper: 70, shotgun: 50 };
const DAMAGE_CAP_DEFAULT = 40;
// Минимальный интервал между выстрелами, мс
const FIRE_RATE = {
    453432689: 180, 1593441988: 180, 137902532: 180, 3218215474: 180, 3523564046: 180, 2578377531: 180,
    584646201: 80,
    324215364: 70, 736523883: 70, 2024373456: 70, 171789620: 70,
    3220176749: 80, 2210333304: 80, 2937143193: 80, 3231910285: 80, 2132975508: 80,
    487013001: 700, 4019527611: 700,
    100416529: 900, 205991906: 900, 177293209: 900,
    911657153: 1500,
    [MINIGUN]: 40,
};
const FIRE_RATE_AUTO = 80;
const FIRE_RATE_DEFAULT = 250;
const FIRE_RATE_LAUNCHER = 800;

// Тюрьма и КПЗ, как mp.police.jailInfo на клиенте
const JAIL = [
    { x: 455.70, y: -986.90, z: 34.20, r: 50 },
    { x: 1689.79, y: 2598.76, z: 45.56, r: 300 },
    { x: -439.45, y: 5989.65, z: 31.72, r: 25 },
];

const GROUP_BY_HASH = {};
for (let group in GROUPS) GROUPS[group].forEach(hash => GROUP_BY_HASH[hash] = group);
const AUTO_GROUPS = ['smg', 'rifle'];

const distXY = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const toPos = p => ({ x: p.x, y: p.y, z: p.z });

function findDescriptor(proto, key) {
    var obj = proto;
    while (obj && obj !== Object.prototype) {
        var desc = Object.getOwnPropertyDescriptor(obj, key);
        if (desc) return desc;
        obj = Object.getPrototypeOf(obj);
    }
    return null;
}

module.exports = {
    params: [],
    punishments: ['notify', 'kick', 'ban'],
    reports: CLIENT_REPORTS,
    banSerials: new Set(),
    banRgsc: new Set(),
    explosive: new Set(),
    launchers: new Set(),
    // Что удалось перехватить на прототипах
    patched: [],
    // Запись идёт из самого античита, хуки не срабатывают
    internal: false,
    interval: null,

    async init() {
        await this.loadParamsFromDB();
        await this.seedParams();
        await this.loadBans();
        EXPLOSIVE_NAMES.forEach(name => this.explosive.add(u32(mp.joaat(name))));
        LAUNCHER_NAMES.forEach(name => this.launchers.add(u32(mp.joaat(name))));
        this.patchEntities();
        if (this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => this.tick(), 1000);
    },
    async loadParamsFromDB() {
        this.params = await db.Models.AntiCheatParam.findAll();
        console.log(`[ANTICHEAT] Параметры загружены (${this.params.length} шт.)`);
    },
    async seedParams() {
        for (var i = 0; i < PARAMS.length; i++) {
            var [name, enable, punish, description] = PARAMS[i];
            if (this.params.find(x => x.name == name)) continue;
            var [param] = await db.Models.AntiCheatParam.findOrCreate({
                where: { name },
                defaults: { enable, punish, description }
            });
            this.params.push(param);
        }
    },
    async loadBans() {
        var bans = await db.Models.AntiCheatBan.findAll();
        this.banSerials.clear();
        this.banRgsc.clear();
        bans.forEach(ban => {
            if (ban.serial) this.banSerials.add(ban.serial);
            if (ban.rgscId) this.banRgsc.add(ban.rgscId);
        });
        console.log(`[ANTICHEAT] Банов загружено (${bans.length} шт.)`);
    },
    getParam(name) {
        return this.params.find(x => x.name == name);
    },
    isEnabled(name) {
        var param = this.getParam(name);
        return !!(param && param.enable);
    },
    enableParam(id, enable) {
        var param = this.params.find(x => x.id == id);
        if (!param) return;
        param.enable = enable;
        param.save();
        mp.players.forEach(rec => {
            if (!rec.character) return;
            rec.call(`anticheat.param.set`, [param.name, enable]);
        });
    },
    setPunishParam(id, punish) {
        var param = this.params.find(x => x.id == id);
        if (!param) return;
        param.punish = punish;
        param.save();
    },
    initForPlayer(player) {
        var old = player.ac;
        // Повторный вызов на того же персонажа приходит только удалённо с клиента
        if (old && old.ready && old.characterId == player.character.id) return this.flood(player, 'characterInit.done');
        var ac = this.createState();
        ac.characterId = player.character.id;
        if (old) {
            ac.adminWeapons = old.adminWeapons;
            ac.serverWeapons = old.serverWeapons;
            ac.peace = old.peace;
        }
        var now = Date.now();
        ac.ready = true;
        // Выбор персонажа и спавн на месте выхода — это не телепорт
        ac.loginUntil = now + 8000;
        ac.moveGrace = ac.loginUntil;
        ac.healGrace = now + 5000;
        ac.armourGrace = now + 5000;
        ac.modelGrace = now + 3000;
        ac.pingAt = now + PING_INTERVAL;
        player.ac = ac;

        let params = {};
        this.params.forEach(p => {
            params[p.name] = p.enable;
        });
        player.call(`anticheat.init`, [params]);
    },
    createState() {
        return {
            ready: false,
            kicked: false,
            dead: false,
            pos: null,
            posAt: 0,
            dim: null,
            inVeh: false,
            moveGrace: 0,
            holdUntil: 0,
            jump: null,
            flyFrom: null,
            speedTicks: 0,
            flyTicks: 0,
            flycarTicks: 0,
            rollbacks: [],
            health: null,
            healGrace: 0,
            armour: null,
            armourGrace: 0,
            modelGrace: 0,
            preDamage: null,
            godTicks: 0,
            enforced: null,
            lastSplit: { health: 0, armour: 0 },
            debt: 0,
            debtTotal: 0,
            debtAt: 0,
            loss: 0,
            lossAt: 0,
            refund: 0,
            refundAt: 0,
            adminWeapons: [],
            serverWeapons: [],
            ammoAllow: 0,
            ammoTicks: 0,
            ammoItem: null,
            fire: {},
            credit: 0,
            creditAt: 0,
            lastMelee: 0,
            lastProjectile: null,
            noclip: false,
            peace: false,
            peaceStrikes: [],
            triggers: {},
            counters: {},
            floods: {},
            jobs: {},
            jobStrikes: [],
            veh: null,
            engine: null,
            pingNonce: null,
            pingAt: 0,
            pingMisses: 0,
        };
    },
    state(player) {
        if (!player.ac) player.ac = this.createState();
        return player.ac;
    },
    clearPlayer(player) {
        var ac = player.ac;
        if (!ac) return;
        this.flushAmmo(player, ac);
        var hands = this.getHandsWeapon(player);
        ac.adminWeapons.forEach(hash => {
            if (hands && hands.hash == hash) return;
            this.internalCall(() => player.removeWeapon(hash));
        });
        // Состояние не удаляем: playerQuit других модулей ещё читает legalHealth
        ac.ready = false;
    },
    // Здоровье, которое видел сервер, без непроверенного роста
    legalHealth(player) {
        var ac = player.ac;
        if (!ac || ac.health == null || Date.now() < ac.healGrace) return player.health;
        return Math.min(player.health, ac.health);
    },

    // Наказание
    trigger(player, name, reason, soft = false) {
        if (!player || !mp.players.exists(player)) return false;
        if (!player.character && !PRE_CHARACTER.includes(name)) return false;
        var param = this.getParam(name);
        if (!param || !param.enable) return false;
        var ac = this.state(player);
        if (ac.kicked) return true;

        var now = Date.now();
        var punish = param.punish;
        if (soft || !this.punishments.includes(punish)) punish = 'notify';
        if (punish == 'notify' && ac.triggers[name] && now - ac.triggers[name] < TRIGGER_COOLDOWN) return true;
        ac.triggers[name] = now;

        reason = String(reason || '').slice(0, 100);
        var text = `!{#ff0000} ANTICHEAT (${name}): ${player.name}[${player.id}] (${reason})`;
        if (punish == 'ban') text += ` banned`;
        else if (punish == 'kick') text += ` kicked`;

        this.log(player, name, reason, punish);
        mp.events.call("admin.notify.all", text);
        if (punish == 'ban') this.ban(player, `${name}: ${reason}`);
        if (punish == 'kick' || punish == 'ban') this.kick(player);
        return true;
    },
    log(player, name, reason, punish) {
        var pos = player.position;
        var text = `${name}: ${reason} [${Math.round(pos.x)}, ${Math.round(pos.y)}, ${Math.round(pos.z)}] ${punish}`.slice(0, 250);
        if (!player.character) return console.log(`[ANTICHEAT] ${player.name}[${player.id}] ${text}`);
        try {
            call('logger').log(text, 'anticheat', player);
        } catch (e) {
            console.log(e);
        }
    },
    kick(player) {
        this.state(player).kicked = true;
        try {
            player.kick('Anticheat');
        } catch (e) {
            console.log(e);
        }
    },
    async ban(player, reason) {
        var serial = player.serial ? String(player.serial).slice(0, 128) : null;
        var rgscId = player.rgscId ? String(player.rgscId).slice(0, 64) : null;
        var data = {
            serial,
            rgscId,
            ip: player.ip ? String(player.ip).slice(0, 64) : null,
            reason: String(reason).slice(0, 128),
            name: String(player.name).slice(0, 64),
            date: new Date()
        };
        if (serial) this.banSerials.add(serial);
        if (rgscId) this.banRgsc.add(rgscId);
        try {
            await db.Models.AntiCheatBan.create(data);
        } catch (e) {
            console.log(e);
        }
    },
    async unban(id) {
        var ban = await db.Models.AntiCheatBan.findByPk(id);
        if (!ban) return null;
        await ban.destroy();
        await this.loadBans();
        return ban;
    },
    // Причина отказа во входе или null
    checkConnection(ip, serial, rgscName, rgscId) {
        if (!serial || !rgscId) return 'пустой serial или rgscId';
        if (this.banSerials.has(String(serial)) || this.banRgsc.has(String(rgscId))) return 'бан';
        return null;
    },

    // Разрешения на серверные записи
    allowMove(player, ms = GRACE) {
        if (!player) return;
        var ac = this.state(player);
        ac.moveGrace = Math.max(ac.moveGrace, Date.now() + ms);
        ac.pos = null;
        ac.jump = null;
        ac.flyFrom = null;
        ac.holdUntil = 0;
    },
    // Серверная запись с известной точкой: следующий скачок считается уже от неё
    moveTo(player, pos) {
        if (!player) return;
        if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y) || !Number.isFinite(pos.z)) return this.allowMove(player);
        var ac = this.state(player);
        var now = Date.now();
        ac.pos = toPos(pos);
        ac.posAt = now + 1500;
        ac.holdUntil = now + 1500;
        // Окно спавна не обнуляем: иначе точка выбора персонажа становится «честной»
        ac.aim = ac.pos;
        ac.aimUntil = now + 8000;
        ac.dim = player.dimension;
        ac.inVeh = !!player.vehicle;
        ac.jump = null;
        ac.flyFrom = null;
    },
    // Вход в магазин в личном измерении: клиент сам ставит педа в интерьер
    enterInterior(player) {
        if (!player) return;
        var ac = this.state(player);
        if (player.dimension == 0) ac.interiorFrom = toPos(player.position);
        this.allowMove(player);
    },
    // Выход из магазина: клиент возвращает педа к точке входа, дальше неё не пускаем
    exitInterior(player) {
        if (!player) return;
        var ac = this.state(player);
        var from = ac.interiorFrom;
        ac.interiorFrom = null;
        if (!from) return;
        this.moveTo(player, from);
        ac.holdUntil = Date.now() + 3000;
        ac.posAt = ac.holdUntil;
    },
    allowHeal(player, ms = GRACE) {
        if (!player) return;
        var ac = this.state(player);
        ac.healGrace = Math.max(ac.healGrace, Date.now() + ms);
        ac.preDamage = null;
        ac.godTicks = 0;
        ac.enforced = null;
        ac.debt = 0;
        ac.debtTotal = 0;
    },
    allowArmour(player, ms = GRACE) {
        if (!player) return;
        var ac = this.state(player);
        ac.armourGrace = Math.max(ac.armourGrace, Date.now() + ms);
    },
    allowModel(player, ms = 3000) {
        if (!player) return;
        var ac = this.state(player);
        ac.modelGrace = Math.max(ac.modelGrace, Date.now() + ms);
    },
    allowAmmo(player, ms = GRACE) {
        if (!player) return;
        this.state(player).ammoAllow = Date.now() + ms;
    },
    // Серверный спавн: позиция, здоровье и ожидаемое воскрешение на клиенте
    allowSpawn(player) {
        if (!player) return;
        this.state(player).dead = false;
        this.allowMove(player);
        this.allowHeal(player);
        this.expectRevive(player);
    },
    expectRevive(player) {
        if (!player || !mp.players.exists(player)) return;
        player.call('anticheat.expectRevive');
    },
    addAdminWeapon(player, hash) {
        var ac = this.state(player);
        hash = u32(hash);
        if (!ac.adminWeapons.includes(hash)) ac.adminWeapons.push(hash);
    },
    setPeace(player, inside) {
        this.state(player).peace = !!inside;
    },
    setNoclip(player, enable, x, y, z, h) {
        if (!player.character) return;
        if (!(player.character.admin > 0)) return this.trigger(player, 'speed', 'ноуклип без админки');
        enable = enable === true || enable === 1 || enable === 'true';
        var ac = this.state(player);
        if (enable) {
            player.noclip = true;
            ac.noclip = true;
            this.allowMove(player);
            return;
        }
        if (!player.noclip && !ac.noclip) return;
        player.noclip = false;
        ac.noclip = false;
        if ([x, y, z].every(function (n) { return Number.isFinite(Number(n)); })) {
            this.moveTo(player, { x: Number(x), y: Number(y), z: Number(z) });
        } else {
            this.allowMove(player, 3000);
        }
    },
    internalCall(fn) {
        var prev = this.internal;
        this.internal = true;
        try {
            fn();
        } catch (e) {
            console.log(e);
        } finally {
            this.internal = prev;
        }
    },

    // Счётчик событий в окне. true — лимит превышен
    hit(player, key, limit, windowMs) {
        var ac = this.state(player);
        var now = Date.now();
        var counter = ac.counters[key];
        if (!counter || now - counter.start > windowMs) counter = ac.counters[key] = { start: now, count: 0 };
        counter.count++;
        return counter.count > limit;
    },
    flood(player, key) {
        var ac = this.state(player);
        var now = Date.now();
        if (ac.floods[key] && now - ac.floods[key] < TRIGGER_COOLDOWN) return;
        ac.floods[key] = now;
        this.trigger(player, 'flood', `флуд ${key}`);
    },
    // Первая строка клиентских обработчиков. false — выйти из обработчика
    guard(player, key, limit = 8, ms = 3000) {
        if (!player || !mp.players.exists(player)) return false;
        if (!this.isEnabled('flood')) return true;
        if (!this.hit(player, key, limit, ms)) return true;
        this.flood(player, key);
        return false;
    },
    // Отказ с параметром. Всегда false, чтобы писать `return anticheat.reject(...)`
    reject(player, name, reason) {
        this.trigger(player, name, reason);
        return false;
    },
    // Награда работы не раньше серверного таймера
    jobReady(player, key) {
        var ac = this.state(player);
        var now = Date.now();
        if (!ac.jobs[key] || now >= ac.jobs[key]) return true;
        ac.jobStrikes = ac.jobStrikes.filter(t => now - t < 10000);
        ac.jobStrikes.push(now);
        // Одиночный ранний вызов — джиттер сети, кик с третьего за 10 с
        if (ac.jobStrikes.length >= 3) this.trigger(player, 'job', `${key} раньше таймера`);
        return false;
    },
    jobStart(player, key, ms) {
        this.state(player).jobs[key] = Date.now() + ms;
    },
    jobCooldown(player, key, ms) {
        if (!this.jobReady(player, key)) return false;
        this.jobStart(player, key, ms);
        return true;
    },
    isNear(player, pos, radius) {
        if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y) || !Number.isFinite(pos.z)) return false;
        return dist3(player.position, pos) <= radius;
    },
    // Для точек с getGroundZFor3dCoord: Z может прийти 0
    isNearXY(player, pos, radius) {
        if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y) || !Number.isFinite(pos.z)) return false;
        return distXY(player.position, pos) <= radius;
    },
    isDead(player) {
        return player.health <= 0 || !!(player.ac && player.ac.dead);
    },
    isKnocked(player) {
        return !!player.getVariable('knocked');
    },
    isAfk(player) {
        return !!player.getVariable('afk');
    },

    // Оружие
    isEmptyWeapon(hash) {
        return !hash || hash == UNARMED || hash == PARACHUTE || hash == OBJECT_WEAPON;
    },
    getHandsWeapon(player) {
        if (!player.inventory || !player.inventory.items) return null;
        var inventory = call('inventory');
        var item = inventory.getHandsItem(player);
        if (!item || !item.params) return null;
        var hashParam = inventory.getParam(item, 'weaponHash');
        if (!hashParam) return null;
        return {
            item,
            hash: u32(hashParam.value),
            ammo: inventory.getParam(item, 'ammo')
        };
    },
    isLegalWeapon(player, hash) {
        hash = u32(hash);
        var ac = this.state(player);
        if (ac.adminWeapons.includes(hash) || ac.serverWeapons.includes(hash)) return true;
        var weapon = this.getHandsWeapon(player);
        return !!weapon && weapon.hash == hash;
    },
    weaponGroup(hash) {
        return GROUP_BY_HASH[hash] || 'other';
    },
    fireInterval(hash) {
        if (FIRE_RATE[hash]) return FIRE_RATE[hash];
        if (this.launchers.has(hash)) return FIRE_RATE_LAUNCHER;
        return AUTO_GROUPS.includes(this.weaponGroup(hash)) ? FIRE_RATE_AUTO : FIRE_RATE_DEFAULT;
    },
    checkWeapon(player, ac) {
        if (!this.isEnabled('weapon')) return;
        var hash = u32(player.weapon);
        if (this.isEmptyWeapon(hash) || this.isLegalWeapon(player, hash)) return;
        this.internalCall(() => player.removeWeapon(hash));
        this.trigger(player, 'weapon', `оружие ${hash} не выдавалось сервером`);
    },
    checkAmmo(player, ac, now) {
        if (!this.isEnabled('ammo') || now < ac.ammoAllow || typeof player.getWeaponAmmo != 'function') {
            ac.ammoTicks = 0;
            return;
        }
        var weapon = this.getHandsWeapon(player);
        if (!weapon || !weapon.ammo) return;
        var allowed = parseInt(weapon.ammo.value) || 0;
        var current = player.getWeaponAmmo(weapon.hash);
        // Сервер списывает патрон сразу, клиентский счётчик догоняет с задержкой
        var drift = Math.ceil(1500 / this.fireInterval(weapon.hash)) + AMMO_LAG;
        if (!(current > allowed + drift)) {
            ac.ammoTicks = 0;
            return;
        }
        // Два тика подряд, чтобы не ловить задержку синхронизации
        if (++ac.ammoTicks < 2) return;
        ac.ammoTicks = 0;
        this.internalCall(() => player.setWeaponAmmo(weapon.hash, allowed));
        this.trigger(player, 'ammo', `патронов ${current}, на сервере ${allowed}`);
    },
    flushAmmo(player, ac) {
        var item = ac.ammoItem;
        if (!item) return;
        ac.ammoItem = null;
        var param = call('inventory').getParam(item, 'ammo');
        if (!param) return;
        param.save();
        player.call(`inventory.setItemParam`, [item.id, 'ammo', param.value]);
    },

    // Выстрел и урон
    canShoot(player, ac, now) {
        if (player.cuffs) {
            this.trigger(player, 'cuffs', 'выстрел в наручниках');
            return false;
        }
        if (ac.noclip || player.health <= 0 || this.isKnocked(player)) return false;
        if (ac.peace) {
            ac.peaceStrikes = ac.peaceStrikes.filter(t => now - t < 10000);
            ac.peaceStrikes.push(now);
            // Первый выстрел на границе зоны не кикает
            this.trigger(player, 'peace', 'выстрел в мирной зоне', ac.peaceStrikes.length < 2);
            return false;
        }
        return true;
    },
    checkFireRate(player, ac, hash, now) {
        if (!this.isEnabled('firerate')) return true;
        var state = ac.fire[hash];
        if (!state) state = ac.fire[hash] = { at: 0, batch: 0, start: now, count: 0 };
        // Выстрелы автомата и дроби приходят на сервер одной пачкой с одним Date.now()
        if (now == state.at) {
            state.batch++;
            var batchLimit = hash == MINIGUN ? 40 : 12;
            if (state.batch <= batchLimit) return true;
            this.trigger(player, 'firerate', `${hash}: ${state.batch} выстрелов в одну миллисекунду`);
            return false;
        }
        state.at = now;
        state.batch = 1;
        if (now - state.start > 1000) {
            state.start = now;
            state.count = 0;
        }
        state.count++;
        var interval = this.fireInterval(hash);
        var limit = Math.ceil(1000 / interval) + 6;
        if (hash == MINIGUN) limit = 80;
        if (state.count <= limit) return true;
        this.trigger(player, 'firerate', `${hash}: ${state.count} за секунду, лимит ${limit}`);
        return false;
    },
    onShot(player, hash) {
        // Миниган стреляет чаще 25 в секунду штатно
        if (this.hit(player, 'shot', u32(hash) == MINIGUN ? 90 : 40, 1000)) return this.flood(player, 'anticheat.shot');
        var ac = player.ac;
        if (!ac || !ac.ready || ac.kicked || !player.character) return;
        var now = Date.now();
        hash = u32(hash);
        if (!this.canShoot(player, ac, now)) return;
        if (!this.isLegalWeapon(player, hash)) {
            if (!this.isEnabled('weapon')) return;
            this.internalCall(() => player.removeWeapon(hash));
            return this.trigger(player, 'weapon', `выстрел из ${hash}, которого нет в руках`);
        }
        if (!this.checkFireRate(player, ac, hash, now)) return;

        var weapon = this.getHandsWeapon(player);
        if (weapon && weapon.hash == hash && weapon.ammo) {
            var ammo = parseInt(weapon.ammo.value) || 0;
            if (ammo <= 0) return this.internalCall(() => player.setWeaponAmmo(hash, 0));
            weapon.ammo.value = ammo - 1;
            ac.ammoItem = weapon.item;
        }
        if (now - ac.creditAt > 1000) ac.credit = Math.min(ac.credit, 0);
        ac.credit = Math.min(16, ac.credit + 1);
        ac.creditAt = now;
    },
    onHit(player, targetId, hash, bone, damage) {
        if (this.hit(player, 'hit', 15, 1000)) return this.flood(player, 'anticheat.hit');
        var ac = player.ac;
        if (!ac || !ac.ready || ac.kicked || !player.character) return;
        var target = mp.players.at(parseInt(targetId));
        if (!target || target == player || !mp.players.exists(target) || !target.character || !target.ac) return;
        hash = u32(hash);
        bone = Number(bone);
        damage = Number(damage);
        if (!Number.isFinite(damage) || damage <= 0) return;

        var now = Date.now();
        if (!this.canShoot(player, ac, now)) return this.refundHit(target, damage);
        var group = this.weaponGroup(hash);
        if (group != 'special' && hash != UNARMED && !this.isLegalWeapon(player, hash)) {
            // Оружие транспорта и неизвестный урон из машины не считаем оружием в руках
            if (player.vehicle && group == 'other') group = 'special';
            else {
                if (this.isEnabled('weapon')) this.trigger(player, 'weapon', `попадание из ${hash}, которого нет в руках`);
                return this.refundHit(target, damage);
            }
        }
        if (player.dimension != target.dimension) return this.refundHit(target, damage);

        var distance = dist3(player.position, target.position);
        if (this.isEnabled('range') && distance > RANGE[group] + RANGE_LAG) {
            this.trigger(player, 'range', `${Math.round(distance)} м из ${hash}`);
            return this.refundHit(target, damage);
        }
        if (group == 'melee') {
            if (now - ac.lastMelee < 250) return this.refundHit(target, damage);
            ac.lastMelee = now;
        } else if (group != 'special' && this.isEnabled('firerate')) {
            // Попадание тратит принятый выстрел, допускаем опережение на 2 из-за порядка пакетов
            if (now - ac.creditAt > 1000) ac.credit = Math.min(ac.credit, 0);
            if (ac.credit <= -2) {
                this.trigger(player, 'firerate', `попадание без выстрела из ${hash}`);
                return this.refundHit(target, damage);
            }
            ac.credit--;
        }
        if (group != 'special' && damage >= 200) {
            this.trigger(player, 'damage', `${Math.round(damage)} урона за попадание из ${hash}`);
            return this.refundHit(target, damage);
        }
        if (target.ac.peace) return this.refundHit(target, damage);
        if (target.godmode || target.ac.noclip || this.isKnocked(target) || this.isAfk(target)) return;

        var cap = DAMAGE_CAP[group] || DAMAGE_CAP_DEFAULT;
        var amount = Math.min(Math.max(damage, 1), cap);
        if (bone == HEAD_BONE) amount = Math.min(cap, amount * 1.5);
        this.addDebt(target, amount);
    },
    // Урон, который сервер ждёт от клиента жертвы
    addDebt(target, amount) {
        var ac = target.ac;
        var now = Date.now();
        if (ac.loss > 0 && now - ac.lossAt <= DAMAGE_WINDOW) {
            var matched = Math.min(ac.loss, amount);
            ac.loss -= matched;
            amount -= matched;
        }
        if (amount <= 0) return;
        if (!ac.debt || now - ac.debtAt > DAMAGE_WINDOW) {
            ac.debt = 0;
            ac.debtTotal = 0;
            ac.debtAt = now;
        }
        ac.debt += amount;
        ac.debtTotal += amount;
    },
    // Урон по отклонённому попаданию вернуть жертве
    refundHit(target, damage) {
        var ac = target.ac;
        if (!ac) return;
        var now = Date.now();
        var amount = Math.min(100, Number(damage) || 0);
        if (ac.loss > 0 && now - ac.lossAt <= DAMAGE_WINDOW) {
            var matched = Math.min(ac.loss, amount);
            ac.loss -= matched;
            amount -= matched;
            this.restore(target, matched);
        }
        if (amount <= 0) return;
        if (!ac.refund || now - ac.refundAt > DAMAGE_WINDOW) ac.refund = 0;
        ac.refund += amount;
        ac.refundAt = now;
    },
    restore(player, amount) {
        if (amount <= 0 || player.health <= 0) return;
        var ac = this.state(player);
        var armourPart = Math.min(amount, ac.lastSplit.armour);
        var healthPart = amount - armourPart;
        var health = Math.min(100, player.health + healthPart);
        var armour = Math.min(100, player.armour + armourPart);
        this.internalCall(() => {
            if (healthPart > 0) player.health = health;
            if (armourPart > 0) player.armour = armour;
        });
        ac.health = health;
        ac.armour = armour;
        ac.healGrace = Math.max(ac.healGrace, Date.now() + 1000);
        ac.armourGrace = Math.max(ac.armourGrace, Date.now() + 1000);
        ac.preDamage = null;
    },
    applyDamage(player, amount) {
        var ac = this.state(player);
        var armour = player.armour;
        var health = player.health;
        var fromArmour = Math.min(armour, amount);
        var newArmour = armour - fromArmour;
        var newHealth = Math.max(0, Math.round(health - (amount - fromArmour)));
        this.internalCall(() => {
            if (fromArmour > 0) player.armour = newArmour;
            player.health = newHealth;
        });
        ac.armour = newArmour;
        ac.health = newHealth;
        ac.enforced = { health: newHealth, at: Date.now() };
    },
    onDamage(player, healthLoss, armorLoss) {
        var ac = player.ac;
        if (!ac || !ac.ready) return;
        var now = Date.now();
        healthLoss = Math.max(0, Number(healthLoss) || 0);
        armorLoss = Math.max(0, Number(armorLoss) || 0);
        if (healthLoss > 0) ac.preDamage = { health: player.health + healthLoss, at: now };
        ac.lastSplit = { health: healthLoss, armour: armorLoss };
        if (ac.health != null) ac.health = Math.min(ac.health, player.health);
        if (ac.armour != null) ac.armour = Math.min(ac.armour, player.armour);

        var loss = healthLoss + armorLoss;
        if (loss <= 0) return;
        if (ac.refund > 0 && now - ac.refundAt <= DAMAGE_WINDOW) {
            var refund = Math.min(loss, ac.refund);
            ac.refund -= refund;
            loss -= refund;
            this.restore(player, refund);
        }
        if (loss > 0 && ac.debt > 0) {
            var matched = Math.min(loss, ac.debt);
            ac.debt -= matched;
            loss -= matched;
        }
        if (loss > 0) {
            if (now - ac.lossAt > DAMAGE_WINDOW) ac.loss = 0;
            ac.loss += loss;
            ac.lossAt = now;
        }
    },
    onDeath(player) {
        var ac = player.ac;
        if (!ac) return;
        ac.dead = true;
        ac.health = 0;
        ac.preDamage = null;
        ac.enforced = null;
        ac.debt = 0;
        ac.refund = 0;
        ac.loss = 0;
    },
    checkDamageWindow(player, ac, now) {
        if (ac.loss && now - ac.lossAt > DAMAGE_WINDOW) ac.loss = 0;
        if (ac.refund && now - ac.refundAt > DAMAGE_WINDOW) ac.refund = 0;
        if (!ac.debt || now - ac.debtAt <= DAMAGE_WINDOW) return;
        var debt = ac.debt;
        var total = ac.debtTotal;
        ac.debt = 0;
        ac.debtTotal = 0;
        if (!this.isEnabled('godmode')) return;
        if (player.health <= 0 || ac.peace || player.godmode || ac.noclip || this.isKnocked(player) || this.isAfk(player)) return;
        // Небольшой остаток — расхождение расчёта урона у клиентов, а не годмод
        if (debt < 5 || debt < total * 0.5) return;
        this.applyDamage(player, debt);
    },
    checkHealth(player, ac, now) {
        var hp = player.health;
        var grace = now < ac.healGrace;
        var exempt = player.godmode || ac.noclip || this.isKnocked(player);

        if (ac.enforced) {
            if (now - ac.enforced.at > 3000) ac.enforced = null;
            else if (!grace && !exempt && hp > ac.enforced.health + 1 && this.isEnabled('godmode')) {
                var enforced = ac.enforced.health;
                ac.enforced = null;
                this.internalCall(() => player.health = enforced);
                ac.health = enforced;
                this.trigger(player, 'godmode', `урон сервера откатился ${enforced} -> ${hp}`);
                return;
            }
        }
        if (ac.preDamage) {
            var pre = ac.preDamage.health;
            ac.preDamage = null;
            if (!grace && !exempt && hp >= pre) {
                if (++ac.godTicks >= 3) {
                    ac.godTicks = 0;
                    this.trigger(player, 'godmode', `урон не снимает здоровье (${hp})`);
                }
            } else ac.godTicks = 0;
        }
        if (ac.health == null || grace) {
            ac.health = Math.min(hp, 100);
            return;
        }
        if (hp > ac.health + 1 && this.isEnabled('health')) {
            var legal = Math.min(ac.health, 100);
            this.internalCall(() => player.health = legal);
            this.trigger(player, 'health', `здоровье ${legal} -> ${hp}`);
            return;
        }
        ac.health = Math.min(hp, 100);
    },
    checkArmour(player, ac, now) {
        var armour = player.armour;
        if (ac.armour == null || now < ac.armourGrace) {
            ac.armour = Math.min(armour, 100);
            return;
        }
        if (armour > ac.armour + 1 && this.isEnabled('armour')) {
            var legal = Math.min(ac.armour, 100);
            this.internalCall(() => player.armour = legal);
            this.trigger(player, 'armour', `броня ${legal} -> ${armour}`);
            return;
        }
        ac.armour = Math.min(armour, 100);
    },

    // Позиция
    resetMove(player, ac, cur, now) {
        ac.pos = cur;
        ac.posAt = now;
        ac.dim = player.dimension;
        ac.inVeh = !!player.vehicle;
        ac.jump = null;
        ac.flyFrom = null;
        ac.speedTicks = 0;
        ac.flyTicks = 0;
        ac.flycarTicks = 0;
    },
    checkMove(player, ac, now) {
        var cur = toPos(player.position);
        if (now < ac.holdUntil) return;
        var veh = player.vehicle;
        var skip = now < ac.moveGrace || ac.noclip || player.godmode || player.isFollowing ||
            player.health <= 0 || this.isKnocked(player) || player.dimension !== ac.dim || !!veh !== ac.inVeh;
        if (!ac.pos || skip) return this.resetMove(player, ac, cur, now);

        // Скачок с прошлого тика не покрылся allowMove — откат
        if (ac.jump) {
            var jump = ac.jump;
            ac.jump = null;
            return this.rollback(player, ac, 'teleport', jump.reason, jump.from, now);
        }

        var dt = Math.max(0.5, (now - ac.posAt) / 1000);
        var dxy = distXY(cur, ac.pos);
        var dz = cur.z - ac.pos.z;
        var parachute = u32(player.weapon) == PARACHUTE;

        var limit = veh ? 200 : 40;
        var falling = dz < 0 && dxy < 15 * dt;
        var jumped = dxy > limit * dt || (!veh && !falling && Math.abs(dz) > 25 * dt);
        if (jumped && this.isEnabled('teleport')) {
            // Спавн после выбора персонажа и приход в точку, которую поставил сервер
            if (now < ac.loginUntil) return this.resetMove(player, ac, cur, now);
            if (ac.aim && now < ac.aimUntil && distXY(cur, ac.aim) < 50) return this.resetMove(player, ac, cur, now);
            // Решаем на следующем тике: серверный телепорт мог прийти позже клиентского
            ac.jump = { from: ac.pos, reason: `${Math.round(dxy)} м по XY, ${Math.round(dz)} м по Z${veh ? ' в машине' : ''}` };
            return;
        }

        if (!veh) {
            if (!parachute && dxy / dt > 12) {
                if (++ac.speedTicks >= 3) {
                    ac.speedTicks = 0;
                    this.trigger(player, 'speed', `${Math.round(dxy / dt)} м/с пешком`);
                }
            } else ac.speedTicks = 0;

            if (!parachute && dz > 6 * dt && dxy < 20 * dt) {
                if (!ac.flyFrom) ac.flyFrom = ac.pos;
                if (++ac.flyTicks >= 2 && this.isEnabled('fly')) {
                    var from = ac.flyFrom;
                    ac.flyFrom = null;
                    ac.flyTicks = 0;
                    return this.rollback(player, ac, 'fly', `+${Math.round(dz)} м по Z пешком`, from, now);
                }
            } else {
                ac.flyTicks = 0;
                ac.flyFrom = null;
            }

            if (player.cuffs && dxy > 15 * dt && this.isEnabled('cuffs')) {
                return this.rollback(player, ac, 'cuffs', `${Math.round(dxy)} м в наручниках`, ac.pos, now);
            }
        } else if (player.seat == 0 && this.isGroundVehicle(veh)) {
            if (dz > 12 * dt && dxy > 5 * dt) {
                if (++ac.flycarTicks >= 2) {
                    ac.flycarTicks = 0;
                    this.trigger(player, 'flycar', `машина +${Math.round(dz)} м по Z`);
                }
            } else ac.flycarTicks = 0;
        }

        ac.pos = cur;
        ac.posAt = now;
    },
    // Транспорт, который сервер спавнит как воздушный, не проверяем
    isGroundVehicle(veh) {
        if (!veh.properties || veh.key == 'farm' || veh.key == 'admin') return false;
        return [0, 1, 2, 3].includes(veh.properties.vehType);
    },
    rollback(player, ac, name, reason, to, now) {
        if (!to) return this.resetMove(player, ac, toPos(player.position), now);
        ac.rollbacks = ac.rollbacks.filter(t => now - t < 60000);
        ac.rollbacks.push(now);
        var veh = player.vehicle;
        var pos = new mp.Vector3(to.x, to.y, to.z);
        this.internalCall(() => {
            if (veh && player.seat == 0) veh.position = pos;
            else player.position = pos;
        });
        this.resetMove(player, ac, to, now);
        // Клиенту нужно время применить позицию
        ac.holdUntil = now + 1500;
        // Первые два отката за минуту только оповещают
        var soft = name == 'teleport' && ac.rollbacks.length < 3;
        this.trigger(player, name, reason, soft);
    },
    checkJail(player, ac) {
        if (!this.isEnabled('jail')) return;
        var character = player.character;
        if (!character.arrestTime || !JAIL[character.arrestType]) return;
        if (Date.now() < ac.moveGrace) return;
        var jail = JAIL[character.arrestType];
        var distance = distXY(player.position, jail);
        if (distance > jail.r + 15) this.trigger(player, 'jail', `${Math.round(distance)} м от тюрьмы #${character.arrestType}`);
    },
    checkRepair(player, ac, now) {
        var veh = player.vehicle;
        if (!veh || player.seat != 0 || !this.isEnabled('repair') || typeof veh.engineHealth != 'number') {
            ac.veh = null;
            return;
        }
        var engine = veh.engineHealth;
        if (ac.veh !== veh || (veh.acRepair && now < veh.acRepair)) {
            ac.veh = veh;
            ac.engine = engine;
            return;
        }
        if (engine > ac.engine + 50) {
            var old = ac.engine;
            this.internalCall(() => veh.engineHealth = old);
            this.trigger(player, 'repair', `двигатель ${Math.round(old)} -> ${Math.round(engine)}`);
            return;
        }
        ac.engine = engine;
    },
    onEnterVehicle(player, vehicle, seat) {
        var ac = player.ac;
        if (!ac || !ac.ready || seat != 0) return;
        if (!vehicle.key) this.trigger(player, 'vehicle', `машина #${vehicle.id} без серверного ключа`);
        if (!this.isEnabled('warp') || !ac.pos || Date.now() < ac.moveGrace) return;
        var distance = dist3(ac.pos, vehicle.position);
        if (distance <= 20) return;
        var back = ac.pos;
        this.internalCall(() => {
            if (typeof player.removeFromVehicle == 'function') player.removeFromVehicle();
            else player.position = new mp.Vector3(back.x, back.y, back.z);
        });
        this.trigger(player, 'warp', `посадка с ${Math.round(distance)} м`);
    },

    // Взрывы и снаряды
    onExplosion(player, type, position) {
        if (!player || !mp.players.exists(player) || !player.character) return;
        type = Number(type);
        var ac = this.state(player);
        if (!WEAPON_EXPLOSIONS.includes(type)) {
            if (this.hit(player, 'explosionEnv', 8, 5000)) this.flood(player, 'explosion');
            return;
        }
        var now = Date.now();
        var hash = u32(player.weapon);
        var thrown = ac.lastProjectile && now - ac.lastProjectile.at < 15000 && this.explosive.has(ac.lastProjectile.hash);
        var armed = this.explosive.has(hash) && this.isLegalWeapon(player, hash);
        var maxDist = (thrown || this.launchers.has(hash)) ? 200 : 30;
        var near = position && dist3(player.position, position) <= maxDist;
        if (near && (armed || thrown)) {
            if (this.hit(player, 'explosion', 3, 5000)) this.flood(player, 'explosion');
            return;
        }
        this.trigger(player, 'explosion', `взрыв типа ${type} без взрывного оружия`);
    },
    onProjectile(player, weaponHash) {
        if (!player || !mp.players.exists(player) || !player.character) return;
        if (this.hit(player, 'projectile', 10, 2000)) return this.flood(player, 'projectile');
        var hash = u32(weaponHash);
        var ac = this.state(player);
        if (this.isLegalWeapon(player, hash)) {
            ac.lastProjectile = { hash, at: Date.now() };
            return;
        }
        this.trigger(player, 'projectile', `снаряд ${hash} без оружия в руках`);
    },
    onModelChange(entity, oldModel) {
        if (!entity || entity.type != 'player' || !entity.character) return;
        if (Date.now() < this.state(entity).modelGrace) return;
        this.trigger(entity, 'model', `модель ${u32(oldModel)} -> ${u32(entity.model)}`);
    },

    // Клиент
    report(player, name) {
        if (this.hit(player, 'report', 10, 5000)) return this.flood(player, 'anticheat.report');
        var ac = player.ac;
        if (!ac || !ac.ready || !player.character) return;
        name = String(name);
        if (!CLIENT_REPORTS.includes(name)) return;
        if (name == 'weapon') return this.checkWeapon(player, ac);
        if (name == 'jail') return this.checkJail(player, ac);
        if (name == 'godmode' && player.godmode) return;
        if (['spectate', 'invisible', 'freecam'].includes(name) && (ac.noclip || player.isVanished)) return;
        this.trigger(player, name, 'сигнал клиента', SOFT_REPORTS.includes(name));
    },
    pong(player, nonce) {
        var ac = player.ac;
        if (!ac || ac.pingNonce == null || Number(nonce) !== ac.pingNonce) return;
        ac.pingNonce = null;
        ac.pingMisses = 0;
    },
    heartbeat(player, ac, now) {
        if (now < ac.pingAt) return;
        if (ac.pingNonce != null && ++ac.pingMisses >= PING_MISSES) {
            ac.pingMisses = 0;
            this.trigger(player, 'heartbeat', `нет ответа ${PING_MISSES * PING_INTERVAL / 1000} с`);
        }
        ac.pingNonce = Math.floor(Math.random() * 2147483647);
        ac.pingAt = now + PING_INTERVAL;
        player.call('anticheat.ping', [ac.pingNonce]);
    },

    tick() {
        var now = Date.now();
        mp.players.forEach(player => {
            try {
                if (!mp.players.exists(player)) return;
                var ac = player.ac;
                if (!ac || !ac.ready || ac.kicked || !player.character) return;
                this.checkWeapon(player, ac);
                this.checkAmmo(player, ac, now);
                this.checkDamageWindow(player, ac, now);
                this.checkHealth(player, ac, now);
                this.checkArmour(player, ac, now);
                if (ac.kicked) return;
                this.checkMove(player, ac, now);
                this.checkJail(player, ac);
                this.checkRepair(player, ac, now);
                this.flushAmmo(player, ac);
                this.heartbeat(player, ac, now);
            } catch (e) {
                console.log(e);
            }
        });
    },

    // Страховка: серверные записи через прототипы сами дают разрешение
    patchEntities() {
        var self = this;
        var wrapSetter = (proto, key, after) => {
            var desc = findDescriptor(proto, key);
            if (!desc || typeof desc.set != 'function' || desc.configurable === false) return false;
            try {
                Object.defineProperty(proto, key, {
                    configurable: true,
                    enumerable: desc.enumerable,
                    get: desc.get,
                    set(value) {
                        desc.set.call(this, value);
                        if (!self.internal) after(this, value);
                    }
                });
                return true;
            } catch (e) {
                return false;
            }
        };
        var wrapMethod = (proto, key, before) => {
            var fn = proto[key];
            if (typeof fn != 'function') return false;
            try {
                proto[key] = function () {
                    if (!self.internal) before(this, arguments);
                    return fn.apply(this, arguments);
                };
                return true;
            } catch (e) {
                return false;
            }
        };
        var weaponsOf = args => (Array.isArray(args[0]) ? args[0] : [args[0]]).map(u32);
        var patch = (name, ok) => {
            if (ok) this.patched.push(name);
        };

        var player = mp.Player && mp.Player.prototype;
        if (player) {
            patch('player.health', wrapSetter(player, 'health', rec => this.allowHeal(rec)));
            patch('player.armour', wrapSetter(player, 'armour', rec => this.allowArmour(rec)));
            patch('player.position', wrapSetter(player, 'position', (rec, value) => this.moveTo(rec, value)));
            // Магазины после смены измерения двигают игрока на клиенте, поэтому тут обычное окно
            patch('player.dimension', wrapSetter(player, 'dimension', rec => this.allowMove(rec)));
            patch('player.model', wrapSetter(player, 'model', rec => this.allowModel(rec)));
            patch('player.spawn', wrapMethod(player, 'spawn', (rec, args) => {
                this.allowSpawn(rec);
                this.moveTo(rec, args[0]);
            }));
            patch('player.putIntoVehicle', wrapMethod(player, 'putIntoVehicle', rec => this.allowMove(rec)));
            patch('player.giveWeapon', wrapMethod(player, 'giveWeapon', (rec, args) => {
                var ac = this.state(rec);
                weaponsOf(args).forEach(hash => {
                    if (!ac.serverWeapons.includes(hash)) ac.serverWeapons.push(hash);
                });
            }));
            patch('player.removeWeapon', wrapMethod(player, 'removeWeapon', (rec, args) => {
                var ac = this.state(rec);
                var hash = u32(args[0]);
                ac.serverWeapons = ac.serverWeapons.filter(x => x != hash);
                ac.adminWeapons = ac.adminWeapons.filter(x => x != hash);
            }));
            patch('player.removeAllWeapons', wrapMethod(player, 'removeAllWeapons', rec => {
                var ac = this.state(rec);
                ac.serverWeapons = [];
                ac.adminWeapons = [];
            }));
        }
        var vehicle = mp.Vehicle && mp.Vehicle.prototype;
        if (vehicle) {
            patch('vehicle.repair', wrapMethod(vehicle, 'repair', veh => veh.acRepair = Date.now() + GRACE));
            patch('vehicle.position', wrapSetter(vehicle, 'position', veh => {
                mp.players.forEach(rec => {
                    if (rec.vehicle === veh) this.allowMove(rec);
                });
            }));
        }
        console.log(`[ANTICHEAT] Перехват серверных записей: ${this.patched.join(', ') || 'нет'}`);
    },
};
