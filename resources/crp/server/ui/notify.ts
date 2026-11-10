import type * as mint from 'mint-server';
import { cef } from './send.js';

function push(player: mint.Player, kind: 'success' | 'warning' | 'error' | 'info', text: string, header = ''): void {
  cef(player, `notifications.${kind}(${JSON.stringify(text)}, ${JSON.stringify(header)})`);
}

export function notifySuccess(player: mint.Player, text: string, header = ''): void {
  push(player, 'success', text, header);
}

export function notifyWarning(player: mint.Player, text: string, header = ''): void {
  push(player, 'warning', text, header);
}

export function notifyError(player: mint.Player, text: string, header = ''): void {
  push(player, 'error', text, header);
}

export function notifyInfo(player: mint.Player, text: string, header = ''): void {
  push(player, 'info', text, header);
}

export function notifyCash(player: mint.Player, delta: number): void {
  if (delta > 0) cef(player, `notifications.addCash(${JSON.stringify(`+$${delta}`)}, "Наличные")`);
  else if (delta < 0) cef(player, `notifications.removeCash(${JSON.stringify(`-$${Math.abs(delta)}`)}, "Наличные")`);
}

export function notifyBank(player: mint.Player, delta: number): void {
  if (delta > 0) cef(player, `notifications.addMoney(${JSON.stringify(`+$${delta}`)}, "Банк")`);
  else if (delta < 0) cef(player, `notifications.removeMoney(${JSON.stringify(`-$${Math.abs(delta)}`)}, "Банк")`);
}
