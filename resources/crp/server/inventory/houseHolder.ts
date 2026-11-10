import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError } from '../ui/notify.js';
import { deleteEnvironmentPlace, sendEnvironmentPlace } from './environment.js';
import { clearPlace } from './place.js';
import type { HouseRecord } from '../houses/index.js';

interface HouseHolder {
  houseId: number;
  ownerId: number;
  dimension: number;
  pos: { x: number; y: number; z: number };
  items: DbRow[];
  usingPlayerId: number | null;
}

const holders = new Map<number, HouseHolder>();

async function loadItems(houseId: number): Promise<DbRow[]> {
  return (await table('HouseInventory').findAll({
    where: { houseId },
    order: [['parentId', 'ASC']],
    include: [{ model: table('HouseInventoryParam'), as: 'params' }],
  })) as DbRow[];
}

export async function installHouseHolder(house: HouseRecord): Promise<void> {
  if (!Number(house.info.holder) || !Number(house.interior.hX)) return;
  const houseId = Number(house.info.id);
  if (holders.has(houseId)) return;
  const x = Number(house.interior.hX);
  const y = Number(house.interior.hY);
  const z = Number(house.interior.hZ) - 1;
  const holder: HouseHolder = {
    houseId,
    ownerId: Number(house.info.characterId) || 0,
    dimension: houseId,
    pos: { x, y, z: Number(house.interior.hZ) },
    items: await loadItems(houseId),
    usingPlayerId: null,
  };
  holders.set(houseId, holder);
  new mint.Marker(mint.MarkerType.MarkerCylinder, x, y, z, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 70, 0, 187, 255, houseId);
  const shape = new mint.ColshapeSphere(x, y, z, 1.5, houseId, true);
  setColshapeHandlers(shape, {
    onEnter: (player) => {
      if (player.vehicle) return;
      void openHouseHolder(player, houseId).catch(() => undefined);
    },
    onExit: (player) => {
      closeHouseHolder(player, houseId);
      cef(player, 'prompt.hide();');
    },
  });
}

export async function reloadHouseHolder(houseId: number): Promise<void> {
  const holder = holders.get(houseId);
  if (!holder) return;
  holder.items = await loadItems(houseId);
}

async function openHouseHolder(player: mint.Player, houseId: number): Promise<void> {
  const holder = holders.get(houseId);
  const character = getSession(player).character;
  const header = 'Шкаф';
  if (!holder || !character) return;
  if (player.dimension !== holder.dimension || player.pos.distanceTo(new mint.Vector3(holder.pos.x, holder.pos.y, holder.pos.z)) > 5) {
    return notifyError(player, 'Вы далеко', header);
  }
  if (Number(character.id) !== holder.ownerId) return notifyError(player, 'Отказано в доступе', header);
  if (holder.usingPlayerId != null && holder.usingPlayerId !== player.id) {
    const other = mint.Player.getByID(holder.usingPlayerId);
    if (other?.valid && other.pos.distanceTo(new mint.Vector3(holder.pos.x, holder.pos.y, holder.pos.z)) < 5) {
      return notifyError(player, 'Со шкафом взаимодействует другой игрок', header);
    }
  }
  holder.usingPlayerId = player.id;
  cef(player, `prompt.showByName('house_items_holder');`);
  sendEnvironmentPlace(player, header, 'House', -houseId, holder.items);
}

function closeHouseHolder(player: mint.Player, houseId: number): void {
  const holder = holders.get(houseId);
  if (!holder) return;
  if (holder.usingPlayerId === player.id) holder.usingPlayerId = null;
  deleteEnvironmentPlace(player, -houseId);
  clearPlace(player);
}

export function installHouseHolderEvents(): void {
  mint.onClient('crp:house:holder:clear', (player, houseId) => {
    closeHouseHolder(player, Number(houseId));
  });
  mint.on('playerDisconnect', (player) => {
    for (const holder of holders.values()) {
      if (holder.usingPlayerId === player.id) holder.usingPlayerId = null;
    }
    clearPlace(player);
  });
}
