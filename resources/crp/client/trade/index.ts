import * as mint from 'mint-client';
import { currentInteractionPlayer } from '../interaction/index.js';
import { pushCef } from '../cef/view.js';

export function installTradeClient(): void {}

export function offerTradeFromMenu(): void {
  const target = currentInteractionPlayer();
  if (!target) {
    pushCef(`notifications.error("Игрок не найден", "Обмен");`);
    return;
  }
  mint.emitServer('crp:trade:offer', target.id);
}
