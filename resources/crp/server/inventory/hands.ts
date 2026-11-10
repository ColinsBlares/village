import * as mint from 'mint-server';
import { addAttachment } from '../attaches/index.js';
import type { DbRow } from '../player/session.js';

const held = new WeakMap<mint.Player, string>();

export function clearHeld(player: mint.Player): void {
  const name = held.get(player);
  if (name) addAttachment(player, name, true);
  held.delete(player);
}

export async function showHeld(player: mint.Player, item: DbRow | null): Promise<void> {
  clearHeld(player);
  if (!item || !player.valid || player.vehicle) return;
  const name = `invItem_${Number(item.itemId)}`;
  held.set(player, name);
  addAttachment(player, name);
}

export function installHeld(): void {
  mint.on('playerDisconnect', (player) => {
    clearHeld(player);
  });
}
