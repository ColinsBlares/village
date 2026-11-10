import * as mint from 'mint-server';
import { restoreWalk, setWalkIndex } from '../settings/index.js';

const WALK_AT = 70;
const LOSE = 10;
const drunk = new WeakMap<mint.Player, number>();

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function sendDrunkInit(player: mint.Player): void {
  player.emit('crp:drunk:init', WALK_AT, 30, 'DrugsDrivingOut', 2 * 60 * 1000);
}

export function addDrunkenness(player: mint.Player, value: number): void {
  const oldValue = drunk.get(player) ?? 0;
  const next = clamp(oldValue + value);
  drunk.set(player, next);
  player.emit('crp:drunk:set', next);
  if (oldValue < WALK_AT && next >= WALK_AT) setWalkIndex(player, 7);
}

function loseDrunkenness(player: mint.Player, value: number): void {
  const oldValue = drunk.get(player) ?? 0;
  const next = clamp(oldValue - value);
  drunk.set(player, next);
  player.emit('crp:drunk:set', next);
  if (oldValue >= WALK_AT && next < WALK_AT) restoreWalk(player);
}

export function installDrunk(): void {
  mint.onClient('crp:drunk:sync', (player) => {
    if (!(drunk.get(player) ?? 0)) return;
    loseDrunkenness(player, LOSE);
  });
}
