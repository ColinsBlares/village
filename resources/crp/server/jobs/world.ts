import * as mint from 'mint-server';
import { allowMove } from '../anticheat/index.js';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { giveItem, sendInventory } from '../inventory/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess } from '../ui/notify.js';
import { addCash, removeCash } from '../world/money.js';
import { addJobExp, syncJobMenu } from './index.js';
import { vehicleState } from '../vehicles/index.js';
import { onBizPrice } from '../bizes/prices.js';
import { enterClub, installClubDoors, leaveClub, type ClubPlace } from '../clubs/door.js';
import { bindService, installServiceBill } from './service.js';

const TRASH = [
  { itemId: 57, price: 50, chance: 5 },
  { itemId: 58, price: 50, chance: 5 },
  { itemId: 59, price: 10, chance: 70 },
  { itemId: 60, price: 10, chance: 70 },
  { itemId: 61, price: 10, chance: 70 },
  { itemId: 62, price: 10, chance: 10 },
  { itemId: 63, price: 30, chance: 10 },
  { itemId: 64, price: 30, chance: 70 },
];
const DRINKS = [
  { name: 'Мохито', price: 390, alcohol: 30 },
  { name: 'Апероль Шпритц', price: 400, alcohol: 35 },
  { name: 'Негрони', price: 395, alcohol: 40 },
  { name: 'Мартини & Тоник', price: 410, alcohol: 25 },
  { name: 'Бьянко Санрайз', price: 415, alcohol: 45 },
  { name: 'Виски кола', price: 385, alcohol: 30 },
  { name: 'Текила санрайз', price: 390, alcohol: 40 },
  { name: 'Ром кола', price: 400, alcohol: 35 },
];
const LIFTS = [
  { factionId: 4, lower: { x: 136.06, y: -761.72, z: 45.75, h: 155.62 }, upper: { x: 136.09, y: -761.81, z: 242.15, h: 158.14 } },
  { factionId: 5, lower: { x: 339.94, y: -584.66, z: 28.8, h: 65.15 }, upper: { x: 330.08, y: -601.06, z: 43.28, h: 67.96 } },
];
const DUMP = { x: 1045.45, y: -1968.62, z: 30.01 };
const MASON = { x: 2569.33, y: 2718.9, z: 41.86 };
const WOOD = { x: -568.3, y: 5253.3, z: 69.49 };
const RESPAWN = 30 * 60 * 1000;

interface Node {
  id: number;
  kind: 'tree' | 'rock';
  health: number;
  dead: number;
}

interface Lift {
  factionId: number;
  lower: { x: number; y: number; z: number; h: number };
  upper: { x: number; y: number; z: number; h: number };
  floor: 'lower' | 'upper';
}

const bins = new WeakMap<mint.Player, number>();
const binAt = new Map<number, number>();
const dump = new WeakSet<mint.Player>();
const nodes = new Map<number, Node>();
const nearNode = new WeakMap<mint.Player, number>();
const masonHere = new WeakSet<mint.Player>();
const woodHere = new WeakSet<mint.Player>();
const liftHere = new WeakMap<mint.Player, Lift>();
const barHere = new WeakSet<mint.Player>();
const clubHere = new WeakMap<mint.Player, DbRow>();
const clubRows: DbRow[] = [];
const serviceHere = new WeakMap<mint.Player, DbRow>();
const serviceRows: DbRow[] = [];
const rented = new Map<number, number>();
function idOf(player: mint.Player): number {
  return Number(getSession(player).character?.id) || 0;
}

async function hands(player: mint.Player): Promise<DbRow | null> {
  const character = getSession(player).character;
  if (!character) return null;
  return (await table('CharacterInventory').findOne({
    where: { playerId: character.id, index: 13, parentId: null },
    include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
  })) as DbRow | null;
}

async function wear(player: mint.Player, item: DbRow, next: number): Promise<void> {
  const list = (item.params ?? []) as DbRow[];
  const param = list.find((row) => row.key === 'health');
  if (!param) return;
  param.value = String(Math.max(0, next));
  await param.save();
  if (next <= 0 && typeof item.destroy === 'function') {
    await item.destroy();
    await sendInventory(player);
  }
}

function point(row: DbRow): { x: number; y: number; z: number } | null {
  const raw = typeof row.getDataValue === 'function' ? row.getDataValue('pos') : row.pos;
  try {
    const pos = typeof raw === 'string' ? JSON.parse(raw) as { x?: number; y?: number; z?: number } : raw as { x?: number; y?: number; z?: number };
    if (!Number.isFinite(Number(pos?.x))) return null;
    return { x: Number(pos.x), y: Number(pos.y), z: Number(pos.z) };
  } catch {
    return null;
  }
}

function blip(sprite: number, x: number, y: number, z: number, color: number, name: string): void {
  const mark = new mint.PointBlip(sprite, x, y, z, color, 0.8, true, 0, name);
  void mark;
}

async function trash(): Promise<{ itemId: number; price: number } | null> {
  if (Math.random() * 100 < 15) return null;
  const roll = Math.random() * TRASH.reduce((sum, item) => sum + item.chance, 0);
  let cursor = 0;
  for (const item of TRASH) {
    cursor += item.chance;
    if (roll <= cursor) return item;
  }
  return TRASH[0];
}

export async function loadWorldJobs(): Promise<number> {
  const list = (await table('Bin').findAll()) as DbRow[];
  for (const bin of list) {
    const shape = new mint.ColshapeSphere(Number(bin.x), Number(bin.y), Number(bin.z), 1.5, 0, true);
    setColshapeHandlers(shape, {
      onEnter: (player) => {
        if (player.vehicle) return;
        bins.set(player, Number(bin.id));
        mint.emitClient(player, 'crp:prompt', 'bins');
      },
      onExit: (player) => {
        if (bins.get(player) === Number(bin.id)) bins.delete(player);
      },
    });
  }
  const dumpShape = new mint.ColshapeSphere(DUMP.x, DUMP.y, DUMP.z, 1.5, 0, true);
  setColshapeHandlers(dumpShape, {
    onEnter: (player) => {
      dump.add(player);
      cef(player, `selectMenu.showByName('dump');`);
    },
    onExit: (player) => {
      dump.delete(player);
      cef(player, 'selectMenu.show = false;');
    },
  });
  blip(527, DUMP.x, DUMP.y, DUMP.z, 21, 'Свалка');
  blip(566, MASON.x, MASON.y, MASON.z, 10, 'Каменоломня');
  blip(527, WOOD.x, WOOD.y, WOOD.z, 25, 'Лесопилка');
  const yard = new mint.ColshapeSphere(MASON.x, MASON.y, MASON.z, 3, 0, true);
  setColshapeHandlers(yard, {
    onEnter: (player) => masonHere.add(player),
    onExit: (player) => masonHere.delete(player),
  });
  const mill = new mint.ColshapeSphere(WOOD.x, WOOD.y, WOOD.z, 3, 0, true);
  setColshapeHandlers(mill, {
    onEnter: (player) => woodHere.add(player),
    onExit: (player) => woodHere.delete(player),
  });
  const objects = (await table('WorldObject').findAll()) as DbRow[];
  for (const row of objects) {
    const kind = Number(row.type) === 1 ? 'tree' : Number(row.type) === 2 ? 'rock' : null;
    const pos = kind ? point(row) : null;
    if (!kind || !pos) continue;
    nodes.set(Number(row.id), { id: Number(row.id), kind, health: 100, dead: 0 });
    const shape = new mint.ColshapeSphere(pos.x, pos.y, pos.z, Math.max(1.5, Number(row.radius) || 2), 0, true);
    setColshapeHandlers(shape, {
      onEnter: (player) => nearNode.set(player, Number(row.id)),
      onExit: (player) => {
        if (nearNode.get(player) === Number(row.id)) nearNode.delete(player);
      },
    });
  }
  for (const lift of LIFTS) {
    for (const floor of ['lower', 'upper'] as const) {
      const pos = lift[floor];
      const shape = new mint.ColshapeSphere(pos.x, pos.y, pos.z, 1.2, 0, true);
      setColshapeHandlers(shape, {
        onEnter: (player) => {
          if (player.vehicle) return;
          if (Number(getSession(player).character?.factionId) !== lift.factionId) return notifyError(player, 'Вы не можете использовать этот лифт', 'Лифт');
          liftHere.set(player, { ...lift, floor });
          mint.emitClient(player, 'crp:prompt', 'elevator');
        },
        onExit: (player) => liftHere.delete(player),
      });
    }
  }
  const bars = (await table('Bar').findAll()) as DbRow[];
  for (const bar of bars) {
    const shape = new mint.ColshapeSphere(Number(bar.x), Number(bar.y), Number(bar.z), 1.5, 0, true);
    setColshapeHandlers(shape, {
      onEnter: (player) => {
        barHere.add(player);
        cef(player, `selectMenu.showByName('bar');`);
      },
      onExit: (player) => {
        barHere.delete(player);
        cef(player, 'selectMenu.show = false;');
      },
    });
    blip(93, Number(bar.x), Number(bar.y), Number(bar.z), 48, 'Бар');
  }
  const clubs = (await table('Club').findAll()) as DbRow[];
  const businesses = (await table('Biz').findAll()) as DbRow[];
  const bizById = new Map(businesses.map((row) => [Number(row.id), row]));
  clubRows.push(...clubs);
  for (const club of clubs) {
    const biz = bizById.get(Number(club.bizId)) ?? null;
    const place: ClubPlace = {
      row: club,
      biz,
      factionId: Number(biz?.factionId) || 0,
      name: String(biz?.name ?? 'Клуб'),
    };
    new mint.Marker(mint.MarkerType.MarkerCylinder, Number(club.enterX), Number(club.enterY), Number(club.enterZ) - 1, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 70, 0, 187, 255, 0);
    new mint.Marker(mint.MarkerType.MarkerCylinder, Number(club.exitX), Number(club.exitY), Number(club.exitZ) - 1, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 70, 0, 187, 255, place.factionId);
    const enter = new mint.ColshapeSphere(Number(club.enterX), Number(club.enterY), Number(club.enterZ), 1, 0, true);
    const exit = new mint.ColshapeSphere(Number(club.exitX), Number(club.exitY), Number(club.exitZ), 1, place.factionId, true);
    setColshapeHandlers(enter, {
      onEnter: (player) => {
        if (!enterClub(player, place)) return;
        clubHere.set(player, club);
      },
    });
    setColshapeHandlers(exit, {
      onEnter: (player) => {
        leaveClub(player, place);
        clubHere.delete(player);
      },
    });
    blip(Number(club.blip) || 614, Number(club.enterX), Number(club.enterY), Number(club.enterZ), 1, place.name);
  }
  const services = (await table('CarService').findAll()) as DbRow[];
  serviceRows.push(...services);
  for (const service of services) {
    const shape = new mint.ColshapeSphere(Number(service.x), Number(service.y), Number(service.z), Number(service.radius) || 10, 0, true);
    setColshapeHandlers(shape, {
      onEnter: (player) => {
        serviceHere.set(player, service);
        bindService(player, service);
      },
      onExit: (player) => {
        if (serviceHere.get(player)?.id === service.id) {
          serviceHere.delete(player);
          bindService(player, null);
        }
      },
    });
    blip(446, Number(service.x), Number(service.y), Number(service.z), 47, 'Автомастерская');
  }
  const rents = (await table('RentPoint').findAll()) as DbRow[];
  for (const point of rents) blip(Number(point.blip) || 225, Number(point.x), Number(point.y), Number(point.z), Number(point.blipColor) || 4, String(point.name ?? 'Аренда'));
  onBizPrice((bizId, key, value) => {
    for (const row of [...clubRows, ...serviceRows]) if (Number(row.bizId) === bizId) row[key] = value;
  });
  return list.length + objects.length;
}

async function hit(player: mint.Player, kind: 'tree' | 'rock'): Promise<void> {
  const header = kind === 'tree' ? 'Лесоруб' : 'Каменщик';
  const nodeId = nearNode.get(player);
  const node = nodeId == null ? undefined : nodes.get(nodeId);
  if (!node || node.kind !== kind) return notifyError(player, kind === 'tree' ? 'Вы не у дерева' : 'Вы не у каменной породы', header);
  if (node.dead && Date.now() - node.dead > RESPAWN) {
    node.health = 100;
    node.dead = 0;
  }
  if (node.health <= 0) return notifyError(player, 'Ресурс исчерпан', header);
  const tool = await hands(player);
  const toolId = Number(tool?.itemId);
  if (kind === 'tree' && toolId !== 70 && toolId !== 76) return notifyError(player, 'Возьмите в руки топор', header);
  if (kind === 'rock' && toolId !== 136) return notifyError(player, 'Возьмите в руки кирку', header);
  const list = (tool?.params ?? []) as DbRow[];
  const health = Number(list.find((row) => row.key === 'health')?.value ?? 100);
  if (health <= 0) return notifyError(player, kind === 'tree' ? 'Топор сломан' : 'Кирка сломана', header);
  if (tool) await wear(player, tool, health - 1);
  node.health -= 10;
  if (node.health > 0) return notifyInfo(player, `Осталось ${node.health}%`, header);
  node.health = 0;
  node.dead = Date.now();
  const ok = await giveItem(player, kind === 'tree' ? 131 : 135);
  if (ok) {
    void addJobExp(player, 0.05, kind === 'tree' ? 7 : 9);
    notifySuccess(player, kind === 'tree' ? 'Вы добыли древесину' : 'Вы добыли камень', header);
  }
}

export function installWorldJobs(): void {
  installClubDoors();
  mint.onClient('crp:job:use', async (player) => {
    const lift = liftHere.get(player);
    if (lift && Number(getSession(player).character?.factionId) === lift.factionId) {
      const next = lift.floor === 'lower' ? lift.upper : lift.lower;
      allowMove(player);
      player.pos = new mint.Vector3(next.x, next.y, next.z);
      player.rot = new mint.Vector3(0, 0, next.h * (Math.PI / 180));
      return;
    }
    const binId = bins.get(player);
    if (binId != null) {
      const last = binAt.get(binId) ?? 0;
      if (Date.now() - last < 60 * 60 * 1000) return notifyError(player, 'Эту мусорку уже вычистили до вас');
      binAt.set(binId, Date.now());
      const found = await trash();
      if (!found) return notifyError(player, 'Ничего не нашли', 'Мусорка');
      if (!(await giveItem(player, found.itemId))) return notifyError(player, 'Нет места в инвентаре', 'Мусорка');
      void addJobExp(player, 0.05, 6);
      notifySuccess(player, 'Вы нашли мусор', 'Мусорка');
      return;
    }
    const node = nodes.get(nearNode.get(player) ?? -1);
    if (node?.kind === 'tree') return hit(player, 'tree');
    if (node?.kind === 'rock') return hit(player, 'rock');
  });

  mint.onClient('crp:bins:sell', async (player) => {
    if (!dump.has(player)) return notifyError(player, 'Вы не у свалки', 'Сдача мусора');
    const character = getSession(player).character;
    if (!character) return;
    const rows = (await table('CharacterInventory').findAll({
      where: { playerId: character.id, itemId: TRASH.map((item) => item.itemId) },
    })) as DbRow[];
    if (!rows.length) return notifyError(player, 'Вы не имеете мусор', 'Сдача мусора');
    let pay = 0;
    for (const row of rows) {
      pay += TRASH.find((item) => item.itemId === Number(row.itemId))?.price ?? 0;
      if (typeof row.destroy === 'function') await row.destroy();
    }
    await sendInventory(player);
    await addCash(player, pay);
    notifySuccess(player, 'Мусор сдан на переработку', 'Сдача мусора');
  });

  mint.onClient('crp:mason:buy', async (player, raw) => {
    if (!masonHere.has(player)) return notifyError(player, 'Вы не у каменоломни', 'Каменщик');
    const index = Math.trunc(Number(raw) || 0);
    if (!(await removeCash(player, 100))) return notifyError(player, 'Необходимо $100', 'Каменщик');
    const ok = index === 0
      ? await giveItem(player, 136, { health: 100 })
      : await giveItem(player, index === 1 ? 7 : index === 2 ? 8 : 9, { sex: Number(getSession(player).character?.gender) ? 0 : 1 });
    if (!ok) {
      await addCash(player, 100);
      return notifyError(player, 'Нет места в инвентаре', 'Каменщик');
    }
    notifySuccess(player, 'Покупка у каменоломни', 'Каменщик');
  });

  mint.onClient('crp:wood:buy', async (player, raw) => {
    if (!woodHere.has(player)) return notifyError(player, 'Вы не у лесопилки', 'Дровосек');
    const index = Math.trunc(Number(raw) || 0);
    if (!(await removeCash(player, 100))) return notifyError(player, 'Необходимо $100', 'Дровосек');
    const ok = index === 0
      ? await giveItem(player, 76, { health: 100 })
      : await giveItem(player, index === 1 ? 7 : index === 2 ? 8 : 9, { sex: Number(getSession(player).character?.gender) ? 0 : 1 });
    if (!ok) {
      await addCash(player, 100);
      return notifyError(player, 'Нет места в инвентаре', 'Дровосек');
    }
    notifySuccess(player, 'Покупка на лесопилке', 'Дровосек');
  });

  mint.onClient('crp:mason:sell', async (player) => {
    if (!masonHere.has(player)) return notifyError(player, 'Вы не у каменоломни', 'Каменщик');
    await sellResource(player, 135, 10, 'Каменщик', 'камня');
  });
  mint.onClient('crp:wood:sell', async (player) => {
    if (!woodHere.has(player)) return notifyError(player, 'Вы не у лесопилки', 'Дровосек');
    await sellResource(player, 131, 10, 'Дровосек', 'дерева');
  });

  mint.onClient('crp:bar:buy', async (player, raw) => {
    if (!barHere.has(player) && !clubHere.has(player)) return notifyError(player, 'Вы не в баре', 'Бар');
    const index = Math.max(0, Math.min(DRINKS.length - 1, Math.trunc(Number(raw) || 0)));
    const drink = DRINKS[index];
    const club = clubHere.get(player);
    const factor = club && Number(club.alcoholPrice) > 0 && Number(club.alcoholPrice) < 20 ? Number(club.alcoholPrice) : 1;
    const price = Math.trunc(drink.price * factor);
    if (!(await removeCash(player, price))) return notifyError(player, `Необходимо $${price}`, 'Бар');
    const ok = await giveItem(player, 133, { name: drink.name, alcohol: drink.alcohol });
    if (!ok) {
      await addCash(player, price);
      return notifyError(player, 'Нет места в инвентаре', 'Бар');
    }
    notifySuccess(player, `Вы приобрели ${drink.name}`, 'Бар');
  });

  mint.on('playerEnteredVehicle', (player, vehicle, seat) => {
    const state = vehicleState(vehicle);
    if (!state || state.key !== 'rent' || (seat !== 1 && seat !== 0)) return;
    const owner = rented.get(vehicle.id);
    if (owner && owner !== idOf(player)) {
      notifyError(player, 'Транспорт арендуется другим игроком');
      mint.emitClient(player, 'crp:veh:leave');
      return;
    }
    if (owner === idOf(player)) return;
    const price = Math.trunc(state.props.price * 0.05);
    mint.emitClient(player, 'crp:rent:show', JSON.stringify({ name: state.props.name, price, mileage: Math.floor(state.mileage) }));
  });

  mint.onClient('crp:rent:buy', async (player) => {
    const vehicle = player.vehicle;
    const state = vehicle ? vehicleState(vehicle) : undefined;
    const character = getSession(player).character;
    if (!vehicle || !state || state.key !== 'rent' || !character || (player.seat !== 1 && player.seat !== 0)) return notifyError(player, 'Вы не в т/с аренды');
    if (state.props.vehType === 0 && !character.carLicense) return notifyError(player, 'Необходима лицензия на легковые т/с');
    if (state.props.vehType === 1 && !character.bikeLicense) return notifyError(player, 'Необходима лицензия на мотоциклы');
    const price = Math.trunc(state.props.price * 0.05);
    if (!(await removeCash(player, price))) return notifyError(player, 'Недостаточно денег');
    const previous = [...rented.entries()].find(([, owner]) => owner === Number(character.id));
    if (previous) rented.delete(previous[0]);
    rented.set(vehicle.id, Number(character.id));
    notifySuccess(player, 'Транспорт успешно арендован');
    notifyInfo(player, 'Вы можете пользоваться этим транспортом до выхода из игры');
    mint.emitClient(player, 'crp:rent:close');
  });

  mint.on('playerDisconnect', (player) => {
    const owner = idOf(player);
    for (const [vehicleId, who] of rented) if (who === owner) rented.delete(vehicleId);
  });

  installServiceBill();
  mint.onClient('crp:service:job', (player) => {
    const service = serviceHere.get(player);
    const character = getSession(player).character;
    if (!service || !character) return notifyError(player, 'Вы не в автомастерской', 'Автомастерская');
    if (character.factionId) return notifyError(player, 'Вы состоите в организации', 'Автомастерская');
    character.job = 1;
    void character.save();
    notifySuccess(player, 'Вы устроились механиком', 'Автомастерская');
    syncJobMenu(player);
  });

}

async function sellResource(player: mint.Player, itemId: number, price: number, header: string, title: string): Promise<void> {
  const character = getSession(player).character;
  if (!character) return;
  const rows = (await table('CharacterInventory').findAll({ where: { playerId: character.id, itemId } })) as DbRow[];
  if (!rows.length) return notifyError(player, 'Вы не имеете ресурсы', header);
  for (const row of rows) if (typeof row.destroy === 'function') await row.destroy();
  await sendInventory(player);
  await addCash(player, rows.length * price);
  notifySuccess(player, `Продано ${rows.length} ед. ${title}`, header);
}
