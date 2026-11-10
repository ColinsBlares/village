import * as mint from 'mint-server';
import { writeCrash } from '../core/log.js';
import { onWorldSpawn } from '../player/gate.js';
import { cef } from '../ui/send.js';
import { buySlot, chooseCharacter, submitCharacter } from './service.js';
import { finishEnter, saveQuit } from './spawn.js';

export function installCharacters(): void {
  onWorldSpawn((player) => {
    void finishEnter(player).catch((err: unknown) => writeCrash('character.spawn', err));
  });

  mint.on('playerDisconnect', (player, _reason, snapshot) => {
    void saveQuit(player, snapshot).catch((err: unknown) => writeCrash('character.quit', err));
  });

  mint.onClient('crp:char:choose', (player, index) => {
    if (!player?.valid || typeof index !== 'number') return;
    void chooseCharacter(player, index).catch((err: unknown) => {
      writeCrash('character.choose', err);
      cef(player, 'loader.show = false;');
    });
  });

  mint.onClient('crp:char:buy', (player) => {
    if (!player?.valid) return;
    void buySlot(player).catch((err: unknown) => {
      writeCrash('character.slot', err);
      cef(player, 'loader.show = false;');
    });
  });

  mint.onClient('crp:char:create', (player, raw) => {
    if (!player?.valid || typeof raw !== 'string') return;
    void submitCharacter(player, raw).catch((err: unknown) => {
      writeCrash('character.create', err);
      cef(player, 'selectMenu.loader = false; selectMenu.notification = "Персонаж не создан";');
    });
  });
}
