"use strict";

let economy = require('./index.js');
let notifs = call('notifications');
let fs = require('fs');

module.exports = {
    "init": async () => {
        await economy.init();
        inited(__dirname);
    },
    "economy.change": (player, data) => {
        if (!player.character || player.character.admin < 6) return;
        let parsed;
        try {
            parsed = JSON.parse(data);
        } catch (e) {
            return;
        }
        if (!Array.isArray(parsed)) return;
        economy.setByType(parsed);
        notifs != null && notifs.success(player, "Успешно обновлено", "Успешно");
    },
}