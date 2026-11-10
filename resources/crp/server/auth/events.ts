import * as mint from 'mint-server';
import { writeCrash } from '../core/log.js';
import { onSessionReady } from '../player/gate.js';
import { cef } from '../ui/send.js';
import { beginAuth, confirmEmailCode, confirmRecovery, continueAuth, finishRecovery, login, recoverAccount, register, sendEmailCode } from './service.js';

export function installAuth(): void {
  onSessionReady((player) => {
    void beginAuth(player).catch((err: unknown) => {
      writeCrash('auth.begin', err);
      if (player.valid) player.kick('Авторизация недоступна');
    });
  });

  mint.onClient('crp:auth:login', (player, raw) => {
    if (!player?.valid || typeof raw !== 'string') return;
    void login(player, raw).catch((err: unknown) => {
      writeCrash('auth.login', err);
      cef(player, 'loader.show = false; auth.showLoginResult(4);');
    });
  });

  mint.onClient('crp:auth:register', (player, raw) => {
    if (!player?.valid || typeof raw !== 'string') return;
    void register(player, raw).catch((err: unknown) => {
      writeCrash('auth.register', err);
      cef(player, 'loader.show = false; auth.showRegisterResult(1);');
    });
  });

  mint.onClient('crp:auth:email', (player) => {
    if (!player?.valid) return;
    sendEmailCode(player);
  });

  mint.onClient('crp:auth:email:code', (player, raw) => {
    if (!player?.valid || typeof raw !== 'string') return;
    void confirmEmailCode(player, raw).catch((err: unknown) => {
      writeCrash('auth.email', err);
      cef(player, 'loader.show = false; auth.showEmailConfirmResult(0);');
    });
  });

  mint.onClient('crp:auth:recovery', (player, raw) => {
    if (!player?.valid || typeof raw !== 'string') return;
    void recoverAccount(player, raw).catch((err: unknown) => {
      writeCrash('auth.recovery', err);
      cef(player, 'loader.show = false; auth.showRecoveryResult(2);');
    });
  });

  mint.onClient('crp:auth:recovery:code', (player, raw) => {
    if (!player?.valid || typeof raw !== 'string') return;
    confirmRecovery(player, raw);
  });

  mint.onClient('crp:auth:recovery:password', (player, raw) => {
    if (!player?.valid || typeof raw !== 'string') return;
    void finishRecovery(player, raw).catch((err: unknown) => {
      writeCrash('auth.recovery.password', err);
      cef(player, 'loader.show = false; auth.showRecoveryResult(7);');
    });
  });

  mint.onClient('crp:auth:continue', (player) => {
    if (!player?.valid) return;
    void continueAuth(player).catch((err: unknown) => {
      writeCrash('auth.continue', err);
      cef(player, 'loader.show = false; auth.prompt = "Не удалось открыть персонажей";');
    });
  });
}
