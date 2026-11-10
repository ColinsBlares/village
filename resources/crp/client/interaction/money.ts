import * as mint from 'mint-client';
import { currentInteractionPlayer } from './index.js';
import { focusUi, pushCef } from '../cef/view.js';

export function showMoneyGive(): void {
  const target = currentInteractionPlayer();
  if (!target?.valid) {
    pushCef(`notifications.error('Игрок не найден', 'Ошибка');`);
    return;
  }
  focusUi(true);
  pushCef(`inputWindow.name = 'money_giving';
inputWindow.header = "Передача денег ID: ${target.id}";
inputWindow.hint = "Введите сумму от $1 до $500";
inputWindow.inputHint = "Сумма...";
inputWindow.value = "";
inputWindow.show = true;`);
}

export function closeMoneyGive(): void {
  pushCef('inputWindow.show = false;');
}

export function acceptMoneyGive(raw: unknown): void {
  const value = String(raw ?? '').trim();
  if (!value) {
    pushCef(`notifications.error('Введите сумму', 'Ошибка');`);
    return;
  }
  const sum = Math.trunc(Number(value));
  if (!Number.isFinite(sum)) {
    pushCef(`notifications.error('Некорректная сумма', 'Ошибка');`);
    return;
  }
  if (sum < 1) {
    pushCef(`notifications.error('Слишком малая сумма', 'Ошибка');`);
    return;
  }
  if (sum > 500) {
    pushCef(`notifications.error('Слишком большая сумма', 'Ошибка');`);
    return;
  }
  const target = currentInteractionPlayer();
  if (!target?.valid) {
    pushCef(`notifications.error('Игрок не найден', 'Ошибка');`);
    return;
  }
  mint.emitServer('crp:interact:money', target.id, sum);
  pushCef('loader.show = true;');
  closeMoneyGive();
}

export function installInteractionMoney(): void {
  mint.onServer('crp:interact:money:done', () => {
    pushCef('loader.show = false;');
  });
}
