"use strict";
/// Модуль выбора и создания персоонажа
let admin;
let characterInit = require("./index.js");
let logger = call("logger");
let utils = call("utils");

module.exports = {
    "init": () => {
        admin = call('admin');
        characterInit.moduleInit();
        inited(__dirname);
    },
    "auth.done": (player) => {
        if (player.characterInit && player.characterInit.started) return;
        player.characterInit = {
            created: false,
            started: true,
        };
        mp.events.call('characterInit.start', player);
        player.call('characterInit.start', []);
    },
    "characterInit.start": async (player) => {
        let charInfos = await characterInit.init(player);
        if (charInfos.length != 0 && player.account.slots == 1 && charInfos[0].charInfo.hours >= characterInit.timeForSecondSlot) {
            player.account.slots = 2;
            await player.account.save();
        }
        player.call('characterInit.init', [charInfos, {
            slots: player.account.slots,
            coins: player.account.donate,
            costSecondSlot: characterInit.costSecondSlot,
            timeForSecondSlot: characterInit.timeForSecondSlot,
            costThirdSlot: characterInit.costThirdSlot,
        }]);
    },
    "characterInit.choose": (player, charnumber) => {
        if (player.character) return player.call('characterInit.choose.ans', [0]);
        if (!player.characters) return player.call('characterInit.choose.ans', [0]);
        if (charnumber == null || isNaN(charnumber)) return player.call('characterInit.choose.ans', [0]);
        if (charnumber < 0 || charnumber > 2) return player.call('characterInit.choose.ans', [0]);
        if (charnumber >= (player.account && player.account.slots ? player.account.slots : 1) && !player.characters[charnumber]) {
            return player.call('characterInit.choose.ans', [0]);
        }

        if (player.characters[charnumber]) {
            player.character = player.characters[charnumber];
            player.name = player.character.name;
            delete player.characters;
            mp.network.startBatch();
            try {
                characterInit.applyCharacter(player);
                player.call('characterInit.choose.ans', [1]);
                characterInit.spawn(player);
                admin.checkClearWarns(player);
                mp.events.call('characterInit.done', player);
            } finally {
                mp.network.endBatch();
            }
        } else {
            player.call('characterInit.choose.ans', [1]);
            characterInit.create(player);
        }
    },
    "characterInit.slot.buy": async (player) => {
        let price = player.account.slots === 3 ? null : player.account.slots === 2 ? characterInit.costThirdSlot : characterInit.costSecondSlot;
        if (price) {
            if (player.account.donate >= price) {
                player.account.donate -= price;
                player.account.slots++;
                await player.account.save();
                player.call("characterInit.slot.buy.ans", [1, player.account.slots, player.account.donate]);
            }
            else {
                player.call("characterInit.slot.buy.ans", [0, player.account.slots, player.account.donate]);
            }
        }
        else {
            player.call("characterInit.slot.buy.ans", [2, player.account.slots, player.account.donate]);
        }
    },
    /// Разморозка игрока после выбора персоонажа
    "characterInit.done": (player) => {
        if (player._charInitDone) return;
        player._charInitDone = true;
        player.call('characterInit.done');
        player.authTime = Date.now();
        logger.log(`Авторизовал персонажа (IP: ${player.ip})`, "characterInit", player);
    },
    /// События создания персоонажа
    "characterInit.create.check": (player, fullname, charData) => {
        characterInit.save(player, fullname, charData);
    },
    "characterInit.loadCharacter": (player) => {
        characterInit.applyCharacter(player);
    },
    "inventory.done": (player) => {
        player.characterInit.created && characterInit.setStartClothes(player);
    },
    "playerQuit": (player) => {
        if (!player.character || player._quitPending || !player.authTime) return;
        const id = player.id;
        const characterId = player.character.id;
        const rgscId = player.rgscId;
        const authTime = player.authTime;
        const minutesBefore = player.character.minutes;
        const pos = {
            x: player.character.x,
            y: player.character.y,
            z: player.character.z,
            h: player.character.h,
        };
        player._quitPending = true;
        const added = parseInt((Date.now() - authTime) / 1000 / 60);
        player.authTime = 0;
        player.character.minutes += added;
        if (!player.dimension && !player.character.arrestTime) {
            player.character.x = player.position.x;
            player.character.y = player.position.y;
            player.character.z = player.position.z;
            player.character.h = player.heading;
        }
        player.character.save();
        if (player.account) {
            player.account.lastIp = player.ip;
            player.account.lastDate = new Date();
            player.account.save();
        }
        logger.log(`Деавторизовал персонажа`, "characterInit", player);
        if (player._keepQuit) return;
        setTimeout(() => {
            const still = mp.players.at(id);
            if (!still || still.rgscId !== rgscId || !still.character || still.character.id !== characterId) return;
            still.authTime = authTime;
            still.character.minutes = minutesBefore;
            still.character.x = pos.x;
            still.character.y = pos.y;
            still.character.z = pos.z;
            still.character.h = pos.h;
            still.character.save();
            still._quitPending = false;
        }, 1000);
    },
};
