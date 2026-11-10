import * as mint from 'mint-server';
import { getSession } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifySuccess } from '../ui/notify.js';
import { addCash, removeCash } from '../world/money.js';

function moneyUiDone(player: mint.Player): void {
  cef(player, 'loader.show = false;');
  mint.emitClient(player, 'crp:interact:money:done');
}

export function installInteraction(): void {
  mint.onClient('crp:interact:money', async (player, targetId, sum) => {
    const character = getSession(player).character;
    const target = mint.Player.getByID(Number(targetId));
    const other = target ? getSession(target).character : null;
    if (!character || !target?.valid || !other) {
      moneyUiDone(player);
      notifyError(player, 'Игрок не найден', 'Ошибка');
      return;
    }
    if (target.id === player.id) {
      moneyUiDone(player);
      notifyError(player, 'Нельзя передать деньги себе', 'Ошибка');
      return;
    }
    if (target.dimension !== player.dimension || player.pos.distanceTo(target.pos) > 5) {
      moneyUiDone(player);
      notifyError(player, 'Игрок не найден', 'Ошибка');
      return;
    }
    const value = Math.trunc(Number(sum) || 0);
    if (value < 1 || value > 500) {
      moneyUiDone(player);
      notifyError(player, 'Некорректная сумма', 'Ошибка');
      return;
    }
    if ((Number(character.cash) || 0) < value) {
      moneyUiDone(player);
      notifyError(player, 'Недостаточно денег', 'Ошибка');
      return;
    }
    const taken = await removeCash(player, value);
    if (!taken) {
      moneyUiDone(player);
      notifyError(player, 'Не удалось передать деньги', 'Ошибка');
      return;
    }
    const given = await addCash(target, value);
    if (!given) {
      await addCash(player, value);
      moneyUiDone(player);
      notifyError(player, 'Не удалось передать деньги', 'Ошибка');
      return;
    }
    moneyUiDone(player);
    notifySuccess(player, 'Вы передали деньги', 'Успех');
    notifySuccess(target, `+$${value} от ID: ${player.id}`, 'Деньги');
  });
}
