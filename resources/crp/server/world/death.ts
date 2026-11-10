import * as mint from 'mint-server';
import { getSession } from '../player/session.js';
import { cef } from '../ui/send.js';
import { allowHeal, allowMove } from '../anticheat/index.js';
import { playAnimation, stopAnimation } from '../animations/index.js';
import { table } from '../core/db.js';
import type { DbRow } from '../player/session.js';
import { dropOwnedItem } from '../inventory/ground.js';
import { notifyWarning } from '../ui/notify.js';

const HOSPITAL = { x: 352.1, y: -599.12, z: 43.28, h: 69.88 };
const KNOCK_MAX = 10 * 60 * 1000;
const KNOCK_HEALTH = 50;
const offline = new Set<number>();

function knocked(player: mint.Player): boolean {
  return player.getSyncedMeta('crp:knocked') != null;
}

async function dropHands(player: mint.Player, raw?: unknown): Promise<void> {
  const character = getSession(player).character;
  if (!character) return;
  const rows = (await table('CharacterInventory').findAll({
    where: { playerId: character.id, parentId: null, index: 13 },
    include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
  })) as DbRow[];
  const hands = rows[0];
  const params = (hands?.params ?? []) as DbRow[];
  if (!hands || !params.some((row) => row.key === 'weaponHash' && row.value)) return;
  let pos = { x: player.pos.x, y: player.pos.y, z: player.pos.z - 1 };
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as { x?: number; y?: number; z?: number };
      const next = { x: Number(parsed.x), y: Number(parsed.y), z: Number(parsed.z) };
      if (Number.isFinite(next.x) && player.pos.distanceTo(new mint.Vector3(next.x, next.y, next.z)) <= 10) pos = next;
    } catch {
      pos = { x: player.pos.x, y: player.pos.y, z: player.pos.z - 1 };
    }
  }
  const error = await dropOwnedItem(player, Number(hands.id), pos, player, true);
  if (!error) notifyWarning(player, 'Вы потеряли оружие из рук', 'Инвентарь');
}

function hospital(player: mint.Player): void {
  const character = getSession(player).character;
  if (!character) return;
  offline.delete(Number(character.id));
  player.deleteSyncedMeta('crp:knocked');
  stopAnimation(player);
  allowMove(player);
  allowHeal(player);
  player.spawn(HOSPITAL.x, HOSPITAL.y, HOSPITAL.z);
  player.dimension = 0;
  player.health = 10;
  player.rot = new mint.Vector3(0, 0, HOSPITAL.h * (Math.PI / 180));
  cef(player, 'timer.stop(); offerDialog.hide();');
}

export function installDeath(): void {
  mint.on('playerDeath', (player) => {
    if (!player?.valid || !getSession(player).character) return;
    if (knocked(player)) {
      void dropHands(player).then(() => hospital(player));
      return;
    }
    cef(player, `offerDialog.show('death', ${JSON.stringify({ medKnockTime: KNOCK_MAX, knockTime: 5 * 60 * 1000 })});`);
  });

  mint.onClient('crp:death:wait', (player, raw) => {
    const character = getSession(player).character;
    if (!player?.valid || !character) return;
    if (!player.isDead && !knocked(player) && !offline.has(Number(character.id))) return;
    const time = Math.max(0, Math.min(KNOCK_MAX, Math.trunc(Number(raw) || 0)));
    const pos = player.pos;
    allowMove(player);
    allowHeal(player);
    player.spawn(pos.x, pos.y, pos.z);
    player.health = KNOCK_HEALTH;
    player.setSyncedMeta('crp:knocked', time);
    offline.add(Number(character.id));
    playAnimation(player, 'amb@world_human_bum_slumped@male@laying_on_left_side@base', 'base', 1);
    cef(player, 'offerDialog.hide();');
  });

  mint.onClient('crp:death:spawn', (player, raw) => {
    const character = getSession(player).character;
    if (!player?.valid || !character) return;
    const allowed = player.isDead || knocked(player) || offline.has(Number(character.id));
    if (!allowed) return;
    void dropHands(player, raw).then(() => hospital(player));
  });

  mint.on('playerDisconnect', (player) => {
    const character = getSession(player).character;
    if (character && knocked(player)) {
      offline.add(Number(character.id));
      void dropHands(player);
    }
  });
}
