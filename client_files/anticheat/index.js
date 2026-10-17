"use strict";


/*
    Модуль анти-чита.

    created 24.11.19 by Carter Slade
*/

mp.anticheat = {
    // Параметры анти-чита, приходят с сервера
    weapon: false,
    jail: false,
    spectate: false,
    invisible: false,
    godmode: false,
    damage: false,
    modifier: false,
    freecam: false,
    rules: false,
    health: false,
    // Флаги, которые античит только читает
    ready: false,
    noclip: false,
    serverGodmode: false,
    dead: false,
    reviveAt: 0,
    // Репорты: кулдаун на имя и одно имя за тик
    reportTimes: {},
    reportWait: 5000,
    reportFrame: -1,
    frame: 0,
    lastCheck: 0,
    lastReset: 0,
    dirtyInvincible: false,
    // Попадания копим и шлём пачкой, иначе дробовик упирается в лимит сервера
    hits: {},
    hitsFlushAt: 0,
    hitsInterval: 100,

    report(name) {
        if (!this.ready) return;
        var now = Date.now();
        if (this.reportFrame == this.frame) return;
        if (this.reportTimes[name] && now - this.reportTimes[name] < this.reportWait) return;
        this.reportTimes[name] = now;
        this.reportFrame = this.frame;
        mp.events.callRemote(`anticheat.report`, name);
    },
    // Совместимость со старыми вызовами: текст клиента сервер не читает
    trigger(name) {
        this.report(name);
    },
    enableParam(name, enable) {
        this[name] = enable;
    },
    isAfk() {
        return !!mp.players.local.getVariable("afk");
    },
    isVanished() {
        return !!mp.players.local.getVariable("isVanished");
    },
    invoke(hash, ...args) {
        try {
            return mp.game.invoke(hash, ...args);
        } catch (e) {
            return null;
        }
    },
    playerId() {
        // PLAYER_ID
        return this.invoke("0x4F8644AF03D0E0D6");
    },

    // анти-чит на оружие
    checkWeapon() {
        if (!this.weapon) return;
        var player = mp.players.local;
        if (!player.weapon) return;
        var hash = player.weapon >>> 0;
        if (hash == 2725352035) return;
        // В hashes хеш со знаком, у педа — без. Иначе легальное оружие фракции шлётся как чит
        if (mp.weapons.hashes.some(item => (item >>> 0) == hash)) return;

        this.report(`weapon`);
    },
    // анти-чит на побег из тюрьмы/КПЗ
    checkJail() {
        if (!this.jail) return;
        if (mp.police.arrestType != null) {
            var info = mp.police.jailInfo[mp.police.arrestType];
            if (!info) return;
            var dist = mp.vdist(mp.players.local.position, info.coords);
            if (dist > info.radius) this.report(`jail`);
        }
    },
    checkSpectate() {
        if (!this.spectate || this.noclip) return;
        // NETWORK_IS_IN_SPECTATOR_MODE
        if (this.invoke("0x048746E388762E11")) this.report(`spectate`);
    },
    checkInvisible() {
        if (!this.invisible || this.noclip || this.isAfk() || this.isVanished()) return;
        var player = mp.players.local;
        if (player.getAlpha() < 200 || !player.isVisible()) this.report(`invisible`);
    },
    isInvincible() {
        // GET_PLAYER_INVINCIBLE
        var id = this.playerId();
        if (id == null) return false;
        return !!this.invoke("0xB721981B2B939E07", id);
    },
    checkGodmode() {
        if (!this.godmode || this.noclip || this.serverGodmode) return;
        if (this.isInvincible()) this.report(`godmode`);
    },
    renderingCam() {
        var cam = mp.game.cam;
        if (!cam || typeof cam.getRenderingCam != 'function') return -1;
        try {
            return cam.getRenderingCam();
        } catch (e) {
            return -1;
        }
    },
    checkFreecam() {
        if (!this.freecam || this.noclip || this.dead) return;
        if (this.renderingCam() != -1) return;
    },
    // Раз в 500 мс
    checkAll() {
        this.checkWeapon();
        this.checkJail();
        this.checkSpectate();
        this.checkInvisible();
        this.checkGodmode();
        this.checkFreecam();
    },
    // Раз в секунду: вернуть множители и нативы в честные значения
    resetNatives() {
        var gamePlayer = mp.game.player;
        var call = (name, ...args) => {
            if (typeof gamePlayer[name] != 'function') return;
            try {
                gamePlayer[name](...args);
            } catch (e) {}
        };
        // Имена в обёртке RAGE бывают с префиксом Player и без
        call('setRunSprintMultiplierFor', 1.0);
        call('setSwimMultiplierFor', 1.0);
        ['WeaponDamageModifier', 'MeleeWeaponDamageModifier', 'WeaponDefenseModifier',
            'MeleeWeaponDefenseModifier', 'VehicleDamageModifier'].forEach(name => {
            call(`set${name}`, 1.0);
            call(`setPlayer${name}`, 1.0);
        });
        call('setHealthRechargeMultiplier', 0.0);
        call('setPlayerHealthRechargeMultiplier', 0.0);

        var player = mp.players.local;
        // SET_PED_INFINITE_AMMO и SET_PED_INFINITE_AMMO_CLIP
        this.invoke("0x3EDCB0505123623B", player.handle, false, 0);
        this.invoke("0x183DADC6AA953186", player.handle, false);

        if (this.noclip || this.serverGodmode || this.isAfk()) return this.dirtyInvincible = false;
        // Снова бессмертен после прошлого сброса — чит держит флаг
        var invincible = this.isInvincible();
        if (invincible && this.dirtyInvincible && this.modifier) this.report(`modifier`);
        this.dirtyInvincible = invincible;
        player.setInvincible(false);
        player.setProofs(false, false, false, false, false, false, false, false);
    },
    addHit(target, weapon, bone, damage) {
        var key = `${target.remoteId}:${weapon}`;
        var hit = this.hits[key];
        if (!hit) hit = this.hits[key] = { id: target.remoteId, weapon, bone, damage: 0 };
        hit.damage += damage;
        if (bone == 20) hit.bone = bone;
    },
    flushHits(now) {
        if (now < this.hitsFlushAt) return;
        this.hitsFlushAt = now + this.hitsInterval;
        for (var key in this.hits) {
            var hit = this.hits[key];
            mp.events.callRemote(`anticheat.hit`, hit.id, hit.weapon, hit.bone, hit.damage);
        }
        this.hits = {};
    },
};

mp.events.add({
    "render": () => {
        var anticheat = mp.anticheat;
        anticheat.frame++;
        if (!anticheat.ready) return;
        try {
            var now = Date.now();
            anticheat.flushHits(now);
            if (now - anticheat.lastCheck >= 500) {
                anticheat.lastCheck = now;
                anticheat.checkAll();
            }
            if (now - anticheat.lastReset >= 1000) {
                anticheat.lastReset = now;
                anticheat.resetNatives();
            }
        } catch (e) {}
    },
    "anticheat.init": (params) => {
        for (var name in params) {
            mp.anticheat.enableParam(name, params[name]);
        }
        mp.anticheat.ready = true;
    },
    "anticheat.param.set": (name, enable) => {
        mp.anticheat.enableParam(name, enable);
    },
    // Пульс не в render: отвечаем и на паузе
    "anticheat.ping": (nonce) => {
        mp.events.callRemote(`anticheat.pong`, nonce);
    },
    "anticheat.expectRevive": () => {
        mp.anticheat.reviveAt = Date.now();
    },
    "anticheat.noclip": (enable) => {
        mp.anticheat.noclip = !!enable;
    },
    "godmode.set": (enable) => {
        mp.anticheat.serverGodmode = !!enable;
    },
    "playerDeath": (player) => {
        if (player == mp.players.local) mp.anticheat.dead = true;
    },
    "playerSpawn": (player) => {
        if (player == mp.players.local) mp.anticheat.dead = false;
    },
    "playerResurrect": () => {
        var anticheat = mp.anticheat;
        anticheat.dead = false;
        if (!anticheat.health) return;
        if (Date.now() - anticheat.reviveAt > 3000) anticheat.report(`health`);
    },
    "playerRuleTriggered": (rule, counter) => {
        if (!mp.anticheat.rules) return;
        if (counter >= 15) mp.anticheat.report(`rules`);
    },
    "playerWeaponShot": () => {
        if (!mp.anticheat.ready) return;
        var weapon = mp.players.local.weapon;
        if (!weapon || weapon == 2725352035) return;
        mp.events.callRemote(`anticheat.shot`, weapon >>> 0);
    },
    "outgoingDamage": (sourceEntity, targetEntity, sourcePlayer, weapon, boneIndex, damage) => {
        var anticheat = mp.anticheat;
        if (damage >= 200) {
            if (anticheat.damage) anticheat.report(`damage`);
            return true;
        }
        if (!anticheat.ready) return;
        if (sourcePlayer != mp.players.local) return;
        if (!targetEntity || targetEntity.type != 'player' || targetEntity == mp.players.local) return;
        anticheat.addHit(targetEntity, weapon >>> 0, boneIndex, damage);
    },
    "meleeActionDamage": (source, target, weaponHash, damage, isCritical) => {
        if (damage < 500) return;
        if (mp.anticheat.damage) mp.anticheat.report(`damage`);
        return true;
    },
    "incomingDamage": (sourceEntity, sourcePlayer, targetEntity, weapon, boneIndex, damage) => {
        if (mp.anticheat.serverGodmode) return true;
        // Только серверная зона: интерьеры из mp.peaceZones сервер мирными не считает
        if (mp.peaceZones && mp.peaceZones.inside) return true;
    },
});
