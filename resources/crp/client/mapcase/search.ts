import * as mint from 'mint-client';
import { pushCef } from '../cef/view.js';

let timer: number | null = null;

export function startTabletSearch(id: number): void {
  if (!id) {
    pushCef(`mapCase.showRedMessage(${JSON.stringify('Игрок <span>#0</span> не найден')});`);
    return;
  }
  if (timer != null) mint.clearTimeout(timer);
  timer = mint.setTimeout(() => {
    timer = null;
    mint.emitServer('crp:tablet:identity', id);
  }, 15000);
}
