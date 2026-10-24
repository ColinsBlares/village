"use strict";
/// Функции модуля авторизации
const bcrypt = require('bcryptjs');

let emailCodes = new Map();
module.exports = {
    accountIsOnline(id, exceptPlayer) {
        if (!id) return false;
        const list = mp.players.toArray();
        for (let i = 0; i < list.length; i++) {
            const rec = list[i];
            if (exceptPlayer && rec === exceptPlayer) continue;
            if (rec.account && rec.account.id == id) return true;
        }
        return false;
    },
    getEmailCodes() {
        return emailCodes;
    },
    getEmailCode(email) {
        return emailCodes.get(email);
    },
    setEmailCodes(emailCodesTemp) {
        emailCodes = emailCodesTemp;
    },
    setEmailCode(email, code) {
        emailCodes.set(email, code);
    },
    hashPassword(passwordNotHashed) {
        return bcrypt.hashSync(passwordNotHashed, bcrypt.genSaltSync(10));
    },
    comparePassword(password, hash) {
        return bcrypt.compareSync(password, hash);
    },
};
