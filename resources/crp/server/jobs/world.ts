import * as mint from 'mint-server';
import { allowMove } from '../anticheat/index.js';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { dropFresh } from '../inventory/ground.js';
import { giveItem, sendInventory } from '../inventory/index.js';
import { rowParams } from '../inventory/items.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess, notifyWarning } from '../ui/notify.js';
import { playCatalog, stopAnimation } from '../animations/index.js';
import { addCash, removeCash } from '../world/money.js';
import { addJobExp, assignJob, clearJob, jobExp } from './index.js';
import { bindTree, installWood, loadWood } from './wood.js';
import { vehicleState } from '../vehicles/index.js';
import { onBizPrice } from '../bizes/prices.js';
import { enterClub, installClubDoors, leaveClub, type ClubPlace } from '../clubs/door.js';
import { bindService, installServiceBill } from './service.js';
import { installJobPeds } from './peds.js';
import { buyMason, buyWood, readGearBuy, showMason, showWood } from './gear.js';

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
  x: number;
  y: number;
  z: number;
}

interface Lift {
  factionId: number;
  lower: { x: number; y: number; z: number; h: number };
  upper: { x: number; y: number; z: number; h: number };
  floor: 'lower' | 'upper';
}

const bins = new WeakMap<mint.Player, number>();
const binSearch = new Map<number, ReturnType<typeof setTimeout>>();
const binAt = new Map<number, number>();
const dump = new WeakSet<mint.Player>();
const nodes = new Map<number, Node>();
const nearNode = new WeakMap<mint.Player, number>();
const masonHere = new WeakSet<mint.Player>();
const rockHitAt = new WeakMap<mint.Player, number>();
const rockPending = new WeakMap<mint.Player, number>();
let stoneModel = 'prop_rock_4_cl_1';
let stoneName = 'Камень';
const woodHere = new WeakSet<mint.Player>();
const liftHere = new WeakMap<mint.Player, Lift>();
const barHere = new WeakSet<mint.Player>();
const clubHere = new WeakMap<mint.Player, DbRow>();
const clubRows: DbRow[] = [];
const serviceHere = new WeakMap<mint.Player, DbRow>();
const bosses = new WeakSet<mint.Player>();
const BOSSES = [
  { x: 541.351318359375, y: -191.85520935058594, z: 53.34 },
  { x: 489.3613586425781, y: -1318.0531005859375, z: 28.090497360229492 },
  { x: -229.38626098632812, y: -1377.6666259765625, z: 30.118222579956055 },
];
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
        mint.emitClient(player, 'crp:prompt', 'bin');
      },
      onExit: (player) => {
        if (bins.get(player) !== Number(bin.id)) return;
        bins.delete(player);
        const timer = binSearch.get(player.id);
        if (timer) clearTimeout(timer);
        binSearch.delete(player.id);
        stopAnimation(player);
        mint.emitClient(player, 'crp:prompt', '');
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
  blip(618, MASON.x, MASON.y, MASON.z, 31, 'Каменоломня');
  blip(85, WOOD.x, WOOD.y, WOOD.z, 71, 'Лесопилка');
  new mint.Marker(mint.MarkerType.MarkerCylinder, MASON.x, MASON.y, MASON.z, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 70, 52, 222, 59, 0);
  new mint.Marker(mint.MarkerType.MarkerCylinder, WOOD.x, WOOD.y, WOOD.z, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 70, 52, 222, 59, 0);
  const yard = new mint.ColshapeSphere(MASON.x, MASON.y, MASON.z, 1.5, 0, true);
  setColshapeHandlers(yard, {
    onEnter: (player) => {
      masonHere.add(player);
      showMason(player);
    },
    onExit: (player) => {
      masonHere.delete(player);
      cef(player, 'selectMenu.show = false;');
    },
  });
  const mill = new mint.ColshapeSphere(WOOD.x, WOOD.y, WOOD.z, 1.5, 0, true);
  setColshapeHandlers(mill, {
    onEnter: (player) => {
      woodHere.add(player);
      showWood(player);
    },
    onExit: (player) => {
      woodHere.delete(player);
      cef(player, 'selectMenu.show = false;');
    },
  });
  const objects = (await table('WorldObject').findAll()) as DbRow[];
  for (const row of objects) {
    const pos = point(row);
    if (!pos) continue;
    if (Number(row.type) === 1) {
      bindTree(Number(row.id), pos.x, pos.y, pos.z, Number(row.radius) || 0);
      continue;
    }
    if (Number(row.type) !== 2) continue;
    const node: Node = { id: Number(row.id), kind: 'rock', health: 100, dead: 0, x: pos.x, y: pos.y, z: pos.z };
    nodes.set(node.id, node);
    const shape = new mint.ColshapeSphere(pos.x, pos.y, pos.z, Math.max(1.5, Number(row.radius) || 2), 0, true);
    setColshapeHandlers(shape, {
      onEnter: (player) => {
        nearNode.set(player, node.id);
        if (node.kind !== 'rock') return;
        revive(node);
        mint.emitClient(player, 'crp:mason:inside', node.x, node.y, node.z, node.health);
      },
      onExit: (player) => {
        if (nearNode.get(player) !== node.id) return;
        nearNode.delete(player);
        if (node.kind === 'rock') mint.emitClient(player, 'crp:mason:clear');
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
          mint.emitClient(player, 'crp:prompt', 'Используйте <span>E</span> для того, чтобы использовать лифт.');
        },
        onExit: (player) => {
          if (!liftHere.has(player)) return;
          liftHere.delete(player);
          mint.emitClient(player, 'crp:prompt', '');
        },
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
  for (const boss of BOSSES) {
    new mint.Marker(
      mint.MarkerType.MarkerCylinder,
      boss.x, boss.y, boss.z,
      0, 0, 0, 0, 0, 0,
      0.4, 0.4, 0.4,
      120, 255, 255, 125,
      0,
    );
    const shape = new mint.ColshapeSphere(boss.x, boss.y, boss.z + 1, 0.7, 0, true);
    setColshapeHandlers(shape, {
      onEnter: (player) => {
        if (player.vehicle) return;
        bosses.add(player);
        const hired = Number(getSession(player).character?.job) === 1;
        const text = hired ? 'Уволиться с работы' : 'Устроиться на работу';
        cef(player, `selectMenu.menu = selectMenu.menus["carServiceJobMenu"]; selectMenu.menu.items[0].text = ${JSON.stringify(text)}; selectMenu.show = true;`);
      },
      onExit: (player) => {
        bosses.delete(player);
        cef(player, 'selectMenu.show = false;');
      },
    });
  }
  const rents = (await table('RentPoint').findAll()) as DbRow[];
  for (const point of rents) blip(Number(point.blip) || 225, Number(point.x), Number(point.y), Number(point.z), Number(point.blipColor) || 4, String(point.name ?? 'Аренда'));
  onBizPrice((bizId, key, value) => {
    for (const row of [...clubRows, ...serviceRows]) if (Number(row.bizId) === bizId) row[key] = value;
  });
  const stone = (await table('InventoryItem').findOne({ where: { id: 135 } })) as DbRow | null;
  if (stone?.model) stoneModel = String(stone.model);
  if (stone?.name) stoneName = String(stone.name);
  await loadWood();
  return list.length + objects.length;
}

function revive(node: Node): void {
  if (node.dead && Date.now() - node.dead > RESPAWN) {
    node.health = 100;
    node.dead = 0;
  }
}

async function rockPower(player: mint.Player): Promise<number> {
  const character = getSession(player).character;
  if (!character) return 1;
  const rows = (await table('CharacterInventory').findAll({
    where: { playerId: character.id, parentId: null },
    include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
  })) as DbRow[];
  let bonus = 0;
  for (const row of rows) {
    const value = Number(rowParams(row).rockDamage);
    if (Number.isFinite(value)) bonus += value;
  }
  return 1 + bonus / 100;
}

function tellRock(node: Node): void {
  for (const player of mint.Player.all) {
    if (player.valid && nearNode.get(player) === node.id) mint.emitClient(player, 'crp:mason:health', node.health);
  }
}

export function installWorldJobs(): void {
  installJobPeds();
  installClubDoors();
  installWood();
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
      if (binSearch.has(player.id)) return;
      if (player.vehicle) return;
      const last = binAt.get(binId) ?? 0;
      if (Date.now() - last < 60 * 60 * 1000) return notifyError(player, 'Эту мусорку уже вычистили до вас');
      notifyWarning(player, 'Ищем мусор...');
      playCatalog(player, 542);
      const playerId = player.id;
      const timer = setTimeout(() => {
        binSearch.delete(playerId);
        if (!player.valid) return;
        stopAnimation(player);
        if (bins.get(player) !== binId) return;
        void (async () => {
          binAt.set(binId, Date.now());
          const found = await trash();
          if (!found) return notifyError(player, 'Ничего не нашли', 'Мусорка');
          if (!(await giveItem(player, found.itemId))) return notifyError(player, 'Нет места в инвентаре', 'Мусорка');
          void addJobExp(player, 0.05, 6);
          notifySuccess(player, 'Вы нашли мусор', 'Мусорка');
        })();
      }, 5000 + Math.floor(Math.random() * 10000));
      binSearch.set(player.id, timer);
    }
  });

  mint.onClient('crp:mason:swing', async (player) => {
    const node = nodes.get(nearNode.get(player) ?? -1);
    if (!node || node.kind !== 'rock') return;
    revive(node);
    if (node.health <= 0) return notifyError(player, 'Каменная порода исчерпала свой ресурс', 'Каменщик');
    const tool = await hands(player);
    if (Number(tool?.itemId) !== 136) return notifyError(player, 'Возьмите в руки кирку', 'Каменщик');
    playCatalog(player, 5523);
  });
  mint.onClient('crp:mason:stop', (player) => stopAnimation(player));
  mint.onClient('crp:mason:hit', async (player) => {
    const node = nodes.get(nearNode.get(player) ?? -1);
    if (!node || node.kind !== 'rock') return notifyError(player, 'Вы не у каменной породы', 'Каменщик');
    const now = Date.now();
    if (now - (rockHitAt.get(player) ?? 0) < 400) return;
    rockHitAt.set(player, now);
    revive(node);
    stopAnimation(player);
    const tool = await hands(player);
    if (Number(tool?.itemId) !== 136) return notifyError(player, 'Возьмите в руки кирку', 'Каменщик');
    const list = (tool?.params ?? []) as DbRow[];
    const health = Number(list.find((row) => row.key === 'health')?.value ?? 100);
    if (health <= 0) return notifyError(player, 'Кирка сломана', 'Каменщик');
    if (node.health <= 0) return notifyError(player, 'Каменная порода исчерпала свой ресурс', 'Каменщик');
    if (tool) await wear(player, tool, health - 1);
    const damage = Math.trunc(10 * (await rockPower(player)));
    node.health = Math.max(0, Math.min(100, node.health - damage));
    tellRock(node);
    if (node.health > 0) return;
    node.dead = Date.now();
    rockPending.set(player, node.id);
    void addJobExp(player, 0.05, 9);
    mint.emitClient(player, 'crp:mason:drop');
  });
  mint.onClient('crp:mason:stones', (player, raw) => {
    const nodeId = rockPending.get(player);
    const node = nodeId == null ? undefined : nodes.get(nodeId);
    rockPending.delete(player);
    if (!node || nearNode.get(player) !== node.id) return;
    let slots: { x?: number; y?: number; z?: number; rZ?: number }[] = [];
    try {
      slots = JSON.parse(String(raw ?? '[]')) as { x?: number; y?: number; z?: number; rZ?: number }[];
    } catch {
      return;
    }
    if (!Array.isArray(slots) || slots.length > 3) return;
    const near = slots.filter((slot) => {
      const x = Number(slot.x);
      const y = Number(slot.y);
      const z = Number(slot.z);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return false;
      return player.pos.distanceTo(new mint.Vector3(x, y, z)) <= 10;
    });
    const cut = near.length ? Math.floor(Math.random() * near.length) : 0;
    for (const slot of near.slice(cut)) {
      dropFresh(player, 135, stoneName, stoneModel, { x: Number(slot.x), y: Number(slot.y), z: Number(slot.z) }, (Number(slot.rZ) || 0) * (Math.PI / 180));
    }
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
    const order = readGearBuy(raw);
    await buyMason(player, order.clothes, order.index);
  });

  mint.onClient('crp:wood:buy', async (player, raw) => {
    if (!woodHere.has(player)) return notifyError(player, 'Вы не у лесопилки', 'Дровосек');
    const order = readGearBuy(raw);
    await buyWood(player, order.clothes, order.index);
  });

  mint.onClient('crp:mason:sell', async (player) => {
    if (!masonHere.has(player)) return notifyError(player, 'Вы не у каменоломни', 'Каменщик');
    await sellResource(player, 135, 10, 'Каменщик', 'камня', 1 + 0.5 * (jobExp(player, 9) / 100));
  });
  mint.onClient('crp:wood:sell', async (player) => {
    if (!woodHere.has(player)) return notifyError(player, 'Вы не у лесопилки', 'Дровосек');
    await sellResource(player, 131, 10, 'Дровосек', 'дерева', 1 + 0.5 * (jobExp(player, 7) / 100));
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
    if (!bosses.has(player)) return notifyError(player, 'Вы не у начальника', 'Автомастерская');
    const character = getSession(player).character;
    if (!character) return;
    if (Number(character.job) === 1) {
      clearJob(player, 'Автомастерская');
      return;
    }
    assignJob(player, 1, 'Автомастерская');
  });

}

async function sellResource(player: mint.Player, itemId: number, price: number, header: string, title: string, bonus = 1): Promise<void> {
  const character = getSession(player).character;
  if (!character) return;
  const rows = (await table('CharacterInventory').findAll({ where: { playerId: character.id, itemId } })) as DbRow[];
  if (!rows.length) return notifyError(player, 'Вы не имеете ресурсы', header);
  for (const row of rows) if (typeof row.destroy === 'function') await row.destroy();
  await sendInventory(player);
  await addCash(player, Math.trunc(rows.length * price * bonus));
  notifySuccess(player, `Продано ${rows.length} ед. ${title}`, header);
}
