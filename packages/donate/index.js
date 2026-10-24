"use strict";

let logger = call('logger');
let money = call('money');
let notifs = call('notifications');

module.exports = {
    // Кол-во наличных за 1 ед. доната
    convertCash: 100,
    // Стоимость смены ника
    nicknamePrice: 100,
    // Стоимость снятия варна
    clearWarnPrice: 200,
    // Стоимость открытия нового слота
    slotPrice: 500,
    // Макс. кол-во слотов
    slotsMax: 3,

    setDonate(player, donate, reason = "") {
        donate = parseInt(donate);

        var oldVal = player.account.donate;
        player.account.donate = donate;
        player.account.save();
        mp.events.call("player.donate.changed", player);
        var diff = donate - oldVal;
        if (diff > 0) diff = "+" + diff;
        logger.log(`${diff} CC | ${reason}`, `donate`, player);
    },
    spend(player, price, reason, next) {
        if (player._donateLock) return false;
        price = parseInt(price);
        if (!Number.isInteger(price) || price < 1) return false;
        if (player.account.donate < price) return false;
        player._donateLock = true;
        const prev = player.account.donate;
        player.account.donate = prev - price;
        player.account.save().then(() => {
            next(ok => {
                player._donateLock = false;
                if (ok) {
                    mp.events.call("player.donate.changed", player);
                    logger.log(`-${price} CC | ${reason}`, `donate`, player);
                    return;
                }
                player.account.donate = prev;
                player.account.save();
                mp.events.call("player.donate.changed", player);
            });
        }).catch(() => {
            player.account.donate = prev;
            player._donateLock = false;
        });
        return true;
    },
    convert(player, donate) {
        donate = parseInt(donate);

        var header = `Конвертация валюты`;
        var out = (text) => {
            notifs.error(player, text, header);
        };
        if (!Number.isInteger(donate) || donate < 1) return out(`Некорректная сумма`);
        if (player.account.donate < donate) return out(`Необходимо ${donate} CC`);

        var cash = donate * this.convertCash;
        if (!this.spend(player, donate, `Конвертация валюты $${cash}`, done => {
            money.addCash(player, cash, (res) => {
                done(!!res);
                if (!res) return out(`Ошибка начисления наличных`);
                notifs.success(player, `Списано ${donate} CC`, header);
            }, `Конвертация валюты за ${donate} CC`);
        })) return out(`Подождите завершения прошлой операции`);
    },
    async setNickname(player, name) {
        var header = `Смена никнейма`;
        var out = (text) => {
            notifs.error(player, text, header);
        };
        if (player.account.donate < this.nicknamePrice) return out(`Необходимо ${this.nicknamePrice} CC`);

        let reg = /^[A-Z][a-z]{1,14} [A-Z][a-z]{1,14}$/;
        if (!reg.test(name)) return out(`Имя и фамилия должны состоять из 2-15 латинских букв каждое`);

        var oldName = player.name;
        if (!this.spend(player, this.nicknamePrice, `Смена ника ${oldName}=>${name}`, async done => {
            const [result] = await db.sequelize.query(
                'UPDATE characters c SET c.name = :name WHERE c.id = :id AND NOT EXISTS (SELECT 1 FROM (SELECT id FROM characters WHERE name = :name) taken)',
                { replacements: { name, id: player.character.id } }
            );
            const rows = result && result.affectedRows != null ? result.affectedRows : 0;
            if (!rows) {
                done(false);
                return out(`Никнейм ${name} занят`);
            }
            player.name = name;
            player.character.setDataValue('name', name);
            done(true);
            notifs.success(player, `Никнейм персонажа изменен`, header);
            notifs.success(player, `Списано ${this.nicknamePrice} CC`, header);
            mp.events.call("player.name.changed", player, oldName);
        })) return out(`Подождите завершения прошлой операции`);
        // player.kick();
    },
    clearWarn(player) {
        var header = `Снятие варна`;
        var out = (text) => {
            notifs.error(player, text, header);
        };
        if (player.account.donate < this.clearWarnPrice) return out(`Необходимо ${this.clearWarnPrice} CC`);
        if (!player.character.warnNumber) return out(`На персонаже нет варнов`);

        if (!this.spend(player, this.clearWarnPrice, `Снятие варна`, done => {
            player.character.warnNumber--;
            player.character.save();
            mp.events.call("player.warns.changed", player);
            done(true);
            notifs.success(player, `Варн снят`, header);
            notifs.success(player, `Списано ${this.clearWarnPrice} CC`, header);
        })) return out(`Подождите завершения прошлой операции`);
    },
    addSlot(player) {
        var header = `Добавление слота`;
        var out = (text) => {
            notifs.error(player, text, header);
        };
        if (player.account.slots >= this.slotsMax) return out(`Вы имеете максимальное количество слотов`);
        if (player.account.donate < this.slotPrice) return out(`Необходимо ${this.slotPrice} CC`);

        if (!this.spend(player, this.slotPrice, `Добавление слота персонажа`, done => {
            if (player.account.slots >= this.slotsMax) {
                done(false);
                return out(`Вы имеете максимальное количество слотов`);
            }
            player.account.slots++;
            player.account.save();
            mp.events.call("player.slots.changed", player);
            done(true);
            notifs.success(player, `Добавлен новый слот`, header);
            notifs.success(player, `Списано ${this.slotPrice} CC`, header);
        })) return out(`Подождите завершения прошлой операции`);
    },
};
