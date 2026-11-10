import * as mint from 'mint-server';
import { notifySuccess, notifyWarning } from '../ui/notify.js';

export function installAfk(): void {
  mint.onClient('crp:afk', (player, enable) => {
    const on = enable === true || enable === 1 || enable === 'true';
    if (player.getStreamSyncedMeta('crp:afk') === on) return;
    player.setStreamSyncedMeta('crp:afk', on);
    if (on) notifyWarning(player, 'Режим AFK активирован', 'ANTI-AFK');
    else notifySuccess(player, 'Режим AFK деактивирован', 'ANTI-AFK');
  });
}
