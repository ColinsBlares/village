"use strict";

let anticheat = require('./index');

module.exports = {
    "__ragemp_cheat_detected": (player, cheatCode) => {
        console.log(`[ANTICHEAT] __ragemp_cheat_detected: ${player.name}[${player.id}] (${cheatCode})`);
        anticheat.trigger(player, 'native', `code ${cheatCode}`);
    },
    "init": async () => {
        await anticheat.init();
        inited(__dirname);
    },
    "incomingConnection": (ip, serial, rgscName, rgscId, gameType) => {
        var reason = anticheat.checkConnection(ip, serial, rgscName, rgscId);
        if (!reason) return;
        console.log(`[ANTICHEAT] Вход отклонён: ${rgscName} ${ip} (${reason})`);
        return true;
    },
    "characterInit.done": (player) => {
        anticheat.initForPlayer(player);
    },
    "playerQuit": (player) => {
        anticheat.clearPlayer(player);
    },
    // Старое имя события: свой текст причины больше не принимается
    "anticheat.trigger": (player, name) => {
        anticheat.report(player, name);
    },
    "anticheat.report": (player, name) => {
        anticheat.report(player, name);
    },
    "anticheat.pong": (player, nonce) => {
        anticheat.pong(player, nonce);
    },
    "anticheat.noclip": (player, enable, x, y, z, h) => {
        anticheat.setNoclip(player, enable, x, y, z, h);
    },
    "anticheat.shot": (player, hash) => {
        anticheat.onShot(player, hash);
    },
    "anticheat.hit": (player, targetId, hash, bone, damage) => {
        anticheat.onHit(player, targetId, hash, bone, damage);
    },
    "playerWeaponChange": (player, oldWeapon, newWeapon) => {
        var ac = player.ac;
        if (!ac || !ac.ready || !player.character) return;
        var hash = newWeapon >>> 0;
        if (anticheat.isEmptyWeapon(hash) || anticheat.isLegalWeapon(player, hash)) return;
        if (!anticheat.isEnabled('weapon')) return;
        anticheat.internalCall(() => player.removeWeapon(hash));
        anticheat.trigger(player, 'weapon', `оружие ${hash} не выдавалось сервером`);
    },
    "playerDamage": (player, healthLoss, armorLoss) => {
        anticheat.onDamage(player, healthLoss, armorLoss);
    },
    "playerDeath": (player) => {
        anticheat.onDeath(player);
    },
    "playerEnterVehicle": (player, vehicle, seat) => {
        anticheat.onEnterVehicle(player, vehicle, seat);
    },
    "playerExitVehicle": (player) => {
        // Пед сохраняет скорость машины при выходе на ходу
        if (player.ac) anticheat.allowMove(player);
    },
    "explosion": (sourcePlayer, type, position) => {
        anticheat.onExplosion(sourcePlayer, type, position);
    },
    "projectile": (sourcePlayer, weaponHash, ammoType, position, direction) => {
        anticheat.onProjectile(sourcePlayer, weaponHash);
    },
    "entityModelChange": (entity, oldModel) => {
        anticheat.onModelChange(entity, oldModel);
    },
}
