let auth = call('auth');
let notifs = call('notifications');
let settings = call('settings');
let utils = call('utils');

module.exports = {
    "characterInit.done": (player) => {
        settings.apply(player, player.character.settings);
    },
    "settings.set": (player, modified) => {
        try {
            modified = typeof modified === 'string' ? JSON.parse(modified) : modified;
        } catch (e) {
            return;
        }
        if (!modified || !player.character || !player.character.settings) return;
        const keys = ['spawn', 'chatTimestamp', 'chatSize', 'nicknames', 'hudKeys', 'ghetto', 'walking', 'mood'];
        keys.forEach(key => {
            if (modified[key] != null) player.character.settings[key] = modified[key];
        });
        player.character.settings.save();
        settings.apply(player, modified);
    },
    "settings.password.set": (player, data) => {
        try {
            data = typeof data === 'string' ? JSON.parse(data) : data;
        } catch (e) {
            return;
        }
        if (!data) return;
        var header = `Смена пароля`;
        if (!data.newPass || data.newPass.length < 6 || data.newPass.length > 20) return notifs.error(player, `Пароль должен состоять из 6-20 символов`, header);
        if (!auth.comparePassword(data.oldPass, player.account.password)) return notifs.error(player, `Старый пароль не совпадает`, header);
        if (auth.comparePassword(data.newPass, player.account.password)) return notifs.error(player, `Новый пароль совпадает со старым`, header);


        player.account.password = auth.hashPassword(data.newPass);
        player.account.passwordDate = new Date();
        player.account.save();

        notifs.success(player, `Пароль успешно изменен`, header);
        mp.events.call("player.password.changed", player);
    },
    "settings.email.set": async (player, email) => {
        var header = `Смена почты`;
        if (!email || email.length > 40) return notifs.error(player, `Email должен быть менее 40 символов`, header);
        var r = /^[0-9a-z-_\.]+\@[0-9a-z-_]{1,}\.[a-z]{1,}$/i;
        if (!r.test(email)) return notifs.error(player, `Некорректный email`, header);

        var exists = await db.Models.Account.findOne({
            attributes: ['id'],
            where: {
                email: email,
                confirmEmail: 1
            }
        });
        if (exists != null) return notifs.error(player, `Email ${email} занят`, header);

        player.pendingEmail = email;
        notifs.success(player, `Подтвердите ${email} кодом из письма`, header);
    },
    "settings.email.confirm": async (player) => {
        var header = `Подтверждение почты`;
        if (player.account.confirmEmail && !player.pendingEmail) return notifs.error(player, `Email уже подтвержден`, header);

        const targetEmail = player.pendingEmail || player.account.email;
        var exists = await db.Models.Account.findOne({
            attributes: ['id'],
            where: {
                email: targetEmail,
                confirmEmail: 1
            }
        });
        if (exists != null) return notifs.error(player, `Email ${targetEmail} занят`, header);

        let code = utils.randomInteger(100000, 999999);
        utils.sendMail(targetEmail, `Подтверждение электронной почты`, `Код подтверждения: <b>${code}</b>`);

        player.confirmCode = String(code);
        player.confirmTries = 0;
        notifs.success(player, `Код подтверждения отправлен на ${targetEmail}`, header);
    },
    "settings.email.code.check": (player, code) => {
        var header = `Подтверждение почты`;
        if (player.account.confirmEmail && !player.pendingEmail) return notifs.error(player, `Email уже подтвержден`, header);
        if (!player.confirmCode) return notifs.error(player, `Код подтверждения не найден`, header);
        player.confirmTries = (player.confirmTries || 0) + 1;
        if (player.confirmTries > 5) {
            delete player.confirmCode;
            return notifs.error(player, `Превышено число попыток`, header);
        }
        if (String(code) !== String(player.confirmCode)) return notifs.error(player, `Неверный код подтверждения`, header);
        if (player.pendingEmail) {
            player.account.email = player.pendingEmail;
            delete player.pendingEmail;
        }

        player.account.confirmEmail = 1;
        player.account.save();

        notifs.success(player, `Email успешно подтвержден`, header);
        mp.events.call("player.email.changed", player);
    },
}
