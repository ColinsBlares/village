import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { getSession, isAdmin, type DbRow } from '../player/session.js';
import { notifyError } from '../ui/notify.js';
import { isTrunkOpen, vehicleById, vehicleState } from '../vehicles/index.js';
import { deleteEnvironmentPlace, sendEnvironmentPlace } from './environment.js';
import { clearPlace } from './place.js';

interface VehicleInv {
  items: DbRow[];
  bootPlayerId: number | null;
  loaded: boolean;
}

const inventories = new WeakMap<mint.Vehicle, VehicleInv>();

export function attachVehicleInventory(vehicle: mint.Vehicle): void {
  if (inventories.has(vehicle)) return;
  inventories.set(vehicle, { items: [], bootPlayerId: null, loaded: false });
}

async function readyBag(vehicle: mint.Vehicle): Promise<VehicleInv | null> {
  if (!inventories.has(vehicle)) attachVehicleInventory(vehicle);
  const bag = inventories.get(vehicle);
  if (!bag) return null;
  const id = Number(vehicleState(vehicle)?.row?.id);
  if (id && !bag.loaded) {
    await loadVehicleInventory(vehicle, id);
    bag.loaded = true;
  }
  return bag;
}

async function loadVehicleInventory(vehicle: mint.Vehicle, vehicleId: number): Promise<void> {
  const rows = (await table('VehicleInventory').findAll({
    where: { vehicleId },
    order: [['parentId', 'ASC']],
    include: [{ model: table('VehicleInventoryParam'), as: 'params' }],
  })) as DbRow[];
  const bag = inventories.get(vehicle);
  if (bag) bag.items = rows;
}

function inventoryOf(vehicle: mint.Vehicle): VehicleInv | null {
  return inventories.get(vehicle) ?? null;
}

async function haveKeys(player: mint.Player, vehicleId: number, owner: number): Promise<boolean> {
  const character = getSession(player).character;
  if (!character) return false;
  const items = (await table('CharacterInventory').findAll({
    where: { playerId: character.id, itemId: 33 },
    include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
  })) as DbRow[];
  return items.some((item) => {
    const params = (item.params ?? item.CharacterInventoryParams ?? []) as DbRow[];
    const values: Record<string, string> = {};
    for (const param of params) values[String(param.key)] = String(param.value);
    return values.vehId === String(vehicleId) && values.owner === String(owner);
  });
}

async function canUseBoot(player: mint.Player, vehicle: mint.Vehicle): Promise<string | null> {
  const header = 'Багажник';
  const state = vehicleState(vehicle);
  if (!state?.row) return `${header}:Авто не в БД`;
  const character = getSession(player).character;
  if (!character) return null;
  const dist = player.pos.distanceTo(vehicle.pos);
  if (dist > 50) return `${header}:Авто слишком далеко`;
  if (!isTrunkOpen(vehicle)) return `${header}:Багажник закрыт`;
  if (!inventories.has(vehicle)) attachVehicleInventory(vehicle);
  const bag = inventoryOf(vehicle);
  if (!bag) return `${header}:Нет багажника`;
  const key = state.key;
  const owner = state.owner;
  const vehId = Number(state.row.id);
  const allowed = new Set(['private', 'faction', 'job', 'rent', 'admin', 'farm', 'family']);
  if (!allowed.has(key)) return `${header}:Нет доступа`;
  if (key === 'private' && owner !== Number(character.id) && !(await haveKeys(player, vehId, owner))) {
    return `${header}:Вы не владелец`;
  }
  if (key === 'faction' && owner !== Number(character.factionId)) {
    return `${header}:Нет доступа`;
  }
  if (key === 'job' && Number(character.job) !== owner) return `${header}:Это не ваш рабочий транспорт`;
  if (key === 'rent' && owner !== Number(character.id)) return `${header}:Это не ваш арендованный транспорт`;
  if (key === 'admin' && !isAdmin(player)) return `${header}:Нет доступа`;
  if (key === 'farm' && Number(character.job) !== owner && owner !== Number(character.id)) return `${header}:Нет доступа`;
  if (key === 'family' && owner !== Number(character.familyId)) return `${header}:Нет доступа`;
  if (bag.bootPlayerId != null && bag.bootPlayerId !== player.id) {
    const other = mint.Player.getByID(bag.bootPlayerId);
    if (other?.valid && other.pos.distanceTo(vehicle.pos) < 50) return `${header}:С багажником взаимодействует другой игрок`;
  }
  return null;
}

async function openBoot(player: mint.Player, vehicleId: number): Promise<void> {
  const vehicle = vehicleById(vehicleId);
  if (!vehicle?.valid) return notifyError(player, `Авто #${vehicleId} не найдено`, 'Багажник');
  const deny = await canUseBoot(player, vehicle);
  if (deny) {
    const [header, text] = deny.split(':');
    if (text) notifyError(player, text, header);
    return;
  }
  const state = vehicleState(vehicle);
  const bag = await readyBag(vehicle);
  if (!state?.row || !bag) return notifyError(player, 'У этого транспорта нет багажника', 'Багажник');
  bag.bootPlayerId = player.id;
  const title = String(state.props.name || state.row.modelName || 'Авто');
  sendEnvironmentPlace(player, title, 'Vehicle', -Number(state.row.id), bag.items);
}

function closeBoot(player: mint.Player, vehicleId: number): void {
  const vehicle = vehicleById(vehicleId);
  const state = vehicle ? vehicleState(vehicle) : undefined;
  const bag = vehicle ? inventoryOf(vehicle) : null;
  clearPlace(player);
  if (state?.row) deleteEnvironmentPlace(player, -Number(state.row.id));
  if (bag && bag.bootPlayerId === player.id) bag.bootPlayerId = null;
}

export function installBootInventory(): void {
  mint.onClient('crp:boot:request', (player, vehicleId) => {
    void openBoot(player, Number(vehicleId)).catch(() => undefined);
  });
  mint.onClient('crp:boot:clear', (player, vehicleId) => {
    closeBoot(player, Number(vehicleId));
  });
  mint.on('playerDisconnect', (player) => {
    for (const vehicle of mint.Vehicle.all) {
      const bag = inventoryOf(vehicle);
      if (bag?.bootPlayerId === player.id) bag.bootPlayerId = null;
    }
    clearPlace(player);
  });
}
