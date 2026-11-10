import * as mint from 'mint-client';
import { busyHas } from '../ui/busy.js';

export function installShopKeys(): void {
  mint.on('keyup', (key) => {
    if (key !== 69 || busyHas()) return;
    mint.emitServer('crp:shop:use');
  });
}
