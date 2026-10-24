"use strict";

let logger;
let bank;
/// ФОРМАТ ЛОГОВ [MONEY]
/// `[MONEY] 1000 add cash to | Just because`
/// `[${moduleName}] ${moneyCount} ${operation} ${moneyType} ${target} | ${reason}`
/// moduleName - название модуля
/// moneyCount - кол-во средств
/// operation - операция (add/remove)
/// moneyType - тип средств(cash/money)
/// target - цель к котрой применена операция(to - на текущего игрока/from - текущим игроком)
/// reason - причина

const moneyLocks = new Map();

function withLock(id, fn) {
    const prev = moneyLocks.get(id) || Promise.resolve();
    let release;
    const gate = new Promise(resolve => {
        release = resolve;
    });
    moneyLocks.set(id, prev.then(() => gate, () => gate));
    return prev.then(fn, fn).finally(release);
}

function withLocks(ids, fn) {
    const sorted = [...new Set(ids)].filter(id => id != null).sort((a, b) => a - b);
    return sorted.reduceRight((next, id) => () => withLock(id, next), fn)();
}

function affectedRows(result, meta) {
    if (result && typeof result.affectedRows === 'number') return result.affectedRows;
    if (meta && typeof meta.affectedRows === 'number') return meta.affectedRows;
    return 0;
}

async function deltaColumn(id, field, delta, transaction) {
    const need = delta < 0 ? -delta : 0;
    const guard = delta < 0 ? 'AND `' + field + '` >= :need' : '';
    const [result, meta] = await db.sequelize.query(
        'UPDATE characters SET `' + field + '` = `' + field + '` + :delta WHERE id = :id ' + guard + ' AND `' + field + '` + :delta >= 0 AND `' + field + '` + :delta <= 1000000000',
        { replacements: { delta, id, need }, transaction }
    );
    if (!affectedRows(result, meta)) throw new Error('money');
    const rows = await db.sequelize.query(
        'SELECT `' + field + '` AS value FROM characters WHERE id = :id',
        { replacements: { id }, transaction, type: db.sequelize.QueryTypes.SELECT }
    );
    return rows[0].value;
}

function findOnline(id) {
    return mp.players.toArray().find(player => player.character && player.character.id == id) || null;
}

function remember(player, field, value) {
    if (player && player.character) player.character.setDataValue(field, value);
}

/// Функции модуля системы финансов игрока
module.exports = {
    init() {
        logger = call("logger");
        bank = call("bank");
    },
    /// player - игрок которому перевести средства
    /// number - количество средств
    /// callback - функция колбека, которая вызовется по завершению работы или в случае ошибки
    addCash(player, number, callbackT, reason = "") {
        if (typeof player == 'number') return this.addCashById(player, number, callbackT, reason);
        if (callbackT == null) return;
        let callback = (result) => {
            try {
                callbackT(result);
            }
            catch(e) {
                console.log(e);
            }
        }
        number = parseInt(number);
        if (isNaN(number)) return callback(false);
        if (number < 0 || number > 1000000000) return callback(false);
        if (player == null) return callback(false);
        if (player.character == null) return callback(false);

        withLock(player.character.id, () => db.sequelize.transaction(async t => {
            remember(player, 'cash', await deltaColumn(player.character.id, 'cash', number, t));
        })).then(() => {
            this.changing(player);
            logger.log(`+${number}$ CASH | ${reason}`, "money", player);
            mp.events.call("money.add", player, number, reason);
            callback(true);
        }).catch(() => {
            callback(false);
        });
    },
    /// id - id персоонажа которому перевести средства
    /// number - количество средств
    /// callback - функция колбека, которая вызовется по завершению работы или в случае ошибки
    addCashById(id, number, callbackT, reason = "") {
        if (callbackT == null) return;
        let callback = (result) => {
            try {
                callbackT(result);
            }
            catch(e) {
                console.log(e);
            }
        };
        id = parseInt(id);
        number = parseInt(number);
        if (isNaN(number) || isNaN(id)) return callback(false);
        if (number < 0 || number > 1000000000 || id < 0 || id > 100000000) return callback(false);

        let player = mp.players.toArray().find( player => {
            if(player.character) {
                return player.character.id == id;
            }
            else {
                return false;
            }
        });
        if (player == null) {
            withLock(id, () => db.sequelize.transaction(async t => {
                const value = await deltaColumn(id, 'cash', number, t);
                remember(findOnline(id), 'cash', value);
            })).then(() => {
                logger.log(`+${number}$ CASH | ${reason}`, "money", id);
                callback(true);
            }).catch(() => {
                callback(false);
            });
        }
        else {
            this.addCash(player, number, callback, reason);
        }
    },
    addMoney(player, number, callbackT, reason = "") {
        if (typeof player == 'number') return this.addMoneyById(player, number, callbackT, reason);
        if (callbackT == null) return;
        let callback = (result) => {
            try {
                callbackT(result);
            }
            catch(e) {
                console.log(e);
            }
        };
        number = parseInt(number);
        if (isNaN(number)) return callback(false);
        if (number < 0 || number > 1000000000) return callback(false);
        if (player == null) return callback(false);
        if (player.character == null) return callback(false);

        withLock(player.character.id, () => db.sequelize.transaction(async t => {
            remember(player, 'bank', await deltaColumn(player.character.id, 'bank', number, t));
        })).then(() => {
            this.changing(player);
            logger.log(`+${number}$ BANK | ${reason}`, "money", player);
            callback(true);
        }).catch(() => {
            callback(false);
        });
    },
    addMoneyById(id, number, callbackT, reason = "") {
        if (callbackT == null) return;
        let callback = (result) => {
            try {
                callbackT(result);
            }
            catch(e) {
                console.log(e);
            }
        };
        id = parseInt(id);
        number = parseInt(number);
        if (isNaN(number) || isNaN(id)) return callback(false);
        if (number < 0 || number > 1000000000 || id < 0 || id > 100000000) return callback(false);

        let player = mp.players.toArray().find( player => {
            if(player.character) {
                return player.character.id == id;
            }
            else {
                return false;
            }
        });
        if (player == null) {
            withLock(id, () => db.sequelize.transaction(async t => {
                const value = await deltaColumn(id, 'bank', number, t);
                remember(findOnline(id), 'bank', value);
            })).then(() => {
                logger.log(`+${number}$ BANK | ${reason}`, "money", id);
                callback(true);
            }).catch(() => {
                callback(false);
            });
        }
        else {
            this.addMoney(player, number, callback, reason);
        }
    },
    removeCash(player, number, callbackT, reason = "") {
        if (typeof player == 'number') return this.removeCashById(player, number, callbackT, reason);
        if (callbackT == null) return;
        let callback = (result) => {
            try {
                callbackT(result);
            }
            catch(e) {
                console.log(e);
            }
        };
        number = parseInt(number);
        if (isNaN(number)) return callback(false);
        if (number < 0 || number > 1000000000) return callback(false);
        if (player == null) return callback(false);
        if (player.character == null) return callback(false);

        withLock(player.character.id, () => db.sequelize.transaction(async t => {
            remember(player, 'cash', await deltaColumn(player.character.id, 'cash', -number, t));
        })).then(() => {
            this.changing(player);
            logger.log(`-${number}$ CASH | ${reason}`, "money", player);
            mp.events.call("money.remove", player, number, reason);
            mp.events.call("battlePass.cash.spent", player, number);
            callback(true);
        }).catch(() => {
            callback(false);
        });
    },
    removeCashById(id, number, callbackT, reason = "") {
        if (callbackT == null) return;
        let callback = (result) => {
            try {
                callbackT(result);
            }
            catch(e) {
                console.log(e);
            }
        }
        id = parseInt(id);
        number = parseInt(number);
        if (isNaN(number) || isNaN(id)) return callback(false);
        if (number < 0 || number > 1000000000 || id < 0 || id > 100000000) return callback(false);

        let player = mp.players.toArray().find( player => {
            if(player.character) {
                return player.character.id == id;
            }
            else {
                return false;
            }
        });
        if (player == null) {
            withLock(id, () => db.sequelize.transaction(async t => {
                const value = await deltaColumn(id, 'cash', -number, t);
                remember(findOnline(id), 'cash', value);
            })).then(() => {
                logger.log(`-${number}$ CASH | ${reason}`, "money", id);
                callback(true);
            }).catch(() => {
                callback(false);
            });
        }
        else {
            this.removeCash(player, number, callback, reason);
        }
    },
    removeMoney(player, number, callbackT, reason = "") {
        if (typeof player == 'number') return this.removeMoneyById(player, number, callbackT, reason);
        if (callbackT == null) return;
        let callback = (result) => {
            try {
                callbackT(result);
            }
            catch(e) {
                console.log(e);
            }
        }
        number = parseInt(number);
        if (isNaN(number)) return callback(false);
        if (number < 0 || number > 1000000000) return callback(false);
        if (player == null) return callback(false);
        if (player.character == null) return callback(false);

        withLock(player.character.id, () => db.sequelize.transaction(async t => {
            remember(player, 'bank', await deltaColumn(player.character.id, 'bank', -number, t));
        })).then(() => {
            this.changing(player);
            logger.log(`-${number}$ BANK | ${reason}`, "money", player);
            callback(true);
        }).catch(() => {
            callback(false);
        });
    },
    removeMoneyById(id, number, callbackT, reason = "") {
        if (callbackT == null) return;
        let callback = (result) => {
            try {
                callbackT(result);
            }
            catch(e) {
                console.log(e);
            }
        }
        id = parseInt(id);
        number = parseInt(number);
        if (isNaN(number) || isNaN(id)) return callback(false);
        if (number < 0 || number > 1000000000 || id < 0 || id > 100000000) return callback(false);

        let player = mp.players.toArray().find( player => {
            if (player.character) {
                return player.character.id == id;
            }
            else {
                return false;
            }
        });
        if (player == null) {
            withLock(id, () => db.sequelize.transaction(async t => {
                const value = await deltaColumn(id, 'bank', -number, t);
                remember(findOnline(id), 'bank', value);
            })).then(() => {
                logger.log(`-${number}$ BANK | ${reason}`, "money", id);
                callback(true);
            }).catch(() => {
                callback(false);
            });
        }
        else {
            this.removeMoney(player, number, callback, reason);
        }
    },
    /// Для ироков, которые онлайн
    moveCash(playerFrom, playerTo, number, callbackT, reasonFrom = "", reasonTo = "") {
        if (callbackT == null) return;
        let callback = (result) => {
            try {
                callbackT(result);
            }
            catch(e) {
                console.log(e);
            }
        }
        number = parseInt(number);
        if (isNaN(number)) return callback(false);
        if (number < 0 || number > 1000000000) return callback(false);
        if (playerFrom == null || playerTo == null) return callback(false);
        if (playerFrom.character == null || playerTo.character == null) return callback(false);

        withLocks([playerFrom.character.id, playerTo.character.id], () => db.sequelize.transaction(async t => {
            remember(playerFrom, 'cash', await deltaColumn(playerFrom.character.id, 'cash', -number, t));
            remember(playerTo, 'cash', await deltaColumn(playerTo.character.id, 'cash', number, t));
        })).then(() => {
            this.changing(playerFrom);
            this.changing(playerTo);
            logger.log(`-${number}$ CASH | ${reasonFrom}`, "money", playerFrom);
            logger.log(`+${number}$ CASH | ${reasonTo}`, "money", playerTo);
            callback(true);
        }).catch(() => {
            callback(false);
        });
    },
    moveMoneyById(idFrom, idTo, number, callbackT, reasonFrom = "", reasonTo = "") {
        if (callbackT == null) return;
        let callback = (result) => {
            try {
                callbackT(result);
            }
            catch(e) {
                console.log(e);
            }
        };

        idFrom = parseInt(idFrom);
        idTo = parseInt(idTo);
        number = parseInt(number);
        if (isNaN(number) || isNaN(idFrom) || isNaN(idTo)) return callback(false);
        if (number < 0 || number > 1000000000 || idFrom < 0 || idFrom > 100000000 || idTo < 0 || idTo > 100000000) return callback(false);

        withLocks([idFrom, idTo], () => db.sequelize.transaction(async t => {
            const fromValue = await deltaColumn(idFrom, 'bank', -number, t);
            const toValue = await deltaColumn(idTo, 'bank', number, t);
            remember(findOnline(idFrom), 'bank', fromValue);
            remember(findOnline(idTo), 'bank', toValue);
        })).then(() => {
            const playerFrom = findOnline(idFrom);
            const playerTo = findOnline(idTo);
            playerFrom && this.changing(playerFrom);
            playerTo && this.changing(playerTo);
            logger.log(`-${number}$ BANK | ${reasonFrom}`, "money", playerFrom || idFrom);
            logger.log(`+${number}$ BANK | ${reasonTo}`, "money", playerTo || idTo);
            callback(true);
        }).catch(() => {
            callback(false);
        });
    },
    changing(player) {
        bank.updateBank(player);
        player.call("money.change", [player.character.cash, player.character.bank]);
    }
};
