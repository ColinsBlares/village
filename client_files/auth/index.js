"use strict";

let pendingLoginData = null;

function getSavedAuth() {
    return mp.storage.data.authRemember || null;
}

function saveAuth(loginOrEmail, password) {
    mp.storage.data.authRemember = {
        loginOrEmail: loginOrEmail,
        password: password,
    };
}

function clearSavedAuth() {
    delete mp.storage.data.authRemember;
}

mp.events.add('auth.remember.clear', () => {
    clearSavedAuth();
});

function tryAutoLogin() {
    const saved = getSavedAuth();
    if (!saved || !saved.loginOrEmail || !saved.password) return;

    mp.callCEFVN({
        "auth.loginOrEmail": saved.loginOrEmail,
        "auth.password": saved.password,
        "auth.rememberMe": true,
    });

    pendingLoginData = {
        loginOrEmail: saved.loginOrEmail,
        password: saved.password,
        rememberMe: true,
    };

    mp.callCEFV(`loader.show = true;`);
    mp.events.callRemote('auth.login', JSON.stringify({
        loginOrEmail: saved.loginOrEmail,
        password: saved.password,
    }));
}

/// Инициализация перед авторизацией
mp.events.add('auth.init', () => {
    mp.preload = false;
    mp.players.local.setAlpha(255);
    mp.gui.cursor.show(true, true);
    mp.players.local.freezePosition(true);
    mp.game.ui.displayRadar(false);
    mp.game.ui.displayHud(false);

    mp.players.local.position = new mp.Vector3(-1685.21, -1653.46, 183.55);
    mp.utils.cam.create(-1685.21, -1653.46, 193.55, -1639.35, -1575.13, 187.48);

    mp.callCEFV(`auth.show = true;`);
    tryAutoLogin();
});

/// Вход в аккаунт
mp.events.add('auth.login', (data) => {
    const parsed = JSON.parse(data);
    pendingLoginData = {
        loginOrEmail: parsed.loginOrEmail,
        password: parsed.password,
        rememberMe: !!parsed.rememberMe,
    };
    mp.events.callRemote('auth.login', data);
});
/// Результат входа в аккаунт
mp.events.add('auth.login.result', (result, data) => {
    if (result == 7) {
        if (data) mp.callCEFV(`characterInfo.coins = ${data.donate}`);

        if (pendingLoginData) {
            if (pendingLoginData.rememberMe) {
                saveAuth(pendingLoginData.loginOrEmail, pendingLoginData.password);
            } else {
                clearSavedAuth();
            }
        }
    }
    pendingLoginData = null;
    mp.callCEFV(`auth.showLoginResult(${result})`);
});

/// Регистрация аккаунта
mp.events.add('auth.register', (data) => {
    mp.events.callRemote('auth.register', data);
});
/// Результат регистрации аккаунта
mp.events.add('auth.register.result', (result, data) => {
    mp.callCEFV(`auth.showRegisterResult(${result})`);

    //temp
    //result == 9 && mp.events.call('auth.email.confirm', 0);
});

// Результат восстановление аккаунта
mp.events.add('auth.recovery.result', (result) => {
    mp.callCEFV(`auth.showRecoveryResult(${result})`);
});

/// Запрос на отправку кода подтверждения почты
mp.events.add('auth.email.confirm', (state) => {
    mp.events.callRemote('auth.email.confirm', state == 1);
    state == 0 && mp.callCEFV(`auth.show = false;`);
});
/// Запорос на проверку кода из письма
mp.events.add('auth.email.confirm.code', (code) => {
    mp.events.callRemote('auth.email.confirm.code', code);
});
/// Ответ проверки почты
mp.events.add('auth.email.confirm.result', (result) => {
    mp.callCEFV(`auth.showEmailConfirmResult(${result})`);
});
