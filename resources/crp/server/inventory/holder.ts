import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError } from '../ui/notify.js';
import { deleteEnvironmentPlace, sendEnvironmentPlace } from './environment.js';
import { clearPlace } from './place.js';

interface Holder {
  factionId: number;
  name: string;
  items: Map<number, DbRow[]>;
}

const holders = new Map<number, Holder>();

export async function initHolderItems(player: mint.Player): Promise<void> {
  const character = getSession(player).character;
  const factionId = Number(character?.factionId) || 0;
  if (!factionId) return;
  const holder = holders.get(factionId);
  if (!holder) return;
  if (holder.items.has(character!.id)) return;

  const rows = (await table('FactionInventory').findAll({
    where: { playerId: character!.id },
    order: [['parentId', 'ASC']],
    include: [{ model: table('FactionInventoryParam'), as: 'params' }],
  })) as DbRow[];
  holder.items.set(character!.id, rows);
}

export function installHolderInventory(): void {
  mint.onClient('crp:holder:clear', (player) => {
    closeHolder(player);
  });
}

export function installHolderColshape(factionId: number, name: string, x: number, y: number, z: number, dimension: number): void {
  if (!holders.has(factionId)) {
    holders.set(factionId, { factionId, name, items: new Map() });
  }
  const shape = new mint.ColshapeSphere(x, y, z, 1.5, dimension, true);
  new mint.Marker(
    mint.MarkerType.MarkerCylinder,
    x,
    y,
    z - 1,
    0,
    0,
    0,
    0,
    0,
    0,
    0.5,
    0.5,
    0.5,
    70,
    0,
    187,
    255,
    dimension,
  );
  setColshapeHandlers(shape, {
    onEnter: (player) => {
      if (player.vehicle) return;
      const character = getSession(player).character;
      const mine = Number(character?.factionId) || 0;
      if (mine !== factionId) return notifyError(player, 'Отказано в доступе', name);
      cef(player, `prompt.showByName('faction_items_holder');`);
      void openHolder(player).catch(() => undefined);
    },
    onExit: (player) => {
      cef(player, 'prompt.hide();');
      closeHolder(player);
    },
  });
}

async function openHolder(player: mint.Player): Promise<void> {
  const character = getSession(player).character;
  const factionId = Number(character?.factionId) || 0;
  if (!character || !factionId) return;
  const holder = holders.get(factionId);
  if (!holder) return;
  if (!holder.items.has(character.id)) await initHolderItems(player);
  const items = holder.items.get(character.id);
  if (!items) return notifyError(player, 'У вас нет личного шкафа', `Шкаф ${holder.name}`);
  sendEnvironmentPlace(player, `Шкаф ${holder.name}`, 'Faction', -character.id, items);
}

function closeHolder(player: mint.Player): void {
  const character = getSession(player).character;
  if (!character) return;
  deleteEnvironmentPlace(player, -character.id);
  clearPlace(player);
}
