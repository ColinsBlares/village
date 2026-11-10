import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { houseForCharacter } from '../houses/index.js';
import { pushFamily } from '../player/menu.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess } from '../ui/notify.js';
import { addCash, removeCash } from '../world/money.js';
import { attachFamilyStorage, detachFamilyStorage } from './storage.js';
import { vehicleBySqlId, vehicleState } from '../vehicles/index.js';

const PRICE = 500000;
const TAG_PRICE = 100000;
const COLORS = [0, 1, 2, 3, 5, 25, 27, 38, 47, 83];
const COLOR_NAMES = ['Белый', 'Красный', 'Зелёный', 'Синий', 'Жёлтый', 'Оранжевый', 'Бирюзовый', 'Голубой', 'Розовый', 'Фиолетовый'];
const RANKS = [
  { name: 'Новичок', rank: 1 },
  { name: 'Боец', rank: 2 },
  { name: 'Старший', rank: 3 },
  { name: 'Заместитель', rank: 4 },
  { name: 'Глава', rank: 5 },
];
const CARS = [
  { model: 'sultan', name: 'Karin Sultan', price: 250000 },
  { model: 'buffalo3', name: 'Bravado Buffalo S', price: 300000 },
  { model: 'kuruma', name: 'Karin Kuruma', price: 380000 },
  { model: 'schafter2', name: 'Benefactor Schafter', price: 320000 },
  { model: 'dominator', name: 'Vapid Dominator', price: 280000 },
  { model: 'granger', name: 'Declasse Granger', price: 350000 },
  { model: 'baller5', name: 'Gallivanter Baller LE', price: 450000 },
  { model: 'gresley', name: 'Bravado Gresley', price: 300000 },
];
const CONTRACTS = [
  { x: 1208, y: -1402, z: 35.2 },
  { x: -1037, y: -641, z: 5 },
  { x: 425, y: -1645, z: 29.3 },
  { x: -75, y: 6420, z: 31.5 },
  { x: 1736, y: 3310, z: 41.2 },
];
const CREATE = { x: -544.99, y: -204.85, z: 38.23 };

const nearCreate = new WeakSet<mint.Player>();
const contracts = new Map<number, { x: number; y: number; z: number }>();

function nameOf(player: mint.Player): string {
  return String(getSession(player).character?.name ?? player.name);
}

async function familyOf(player: mint.Player): Promise<DbRow | null> {
  const id = Number(getSession(player).character?.familyId) || 0;
  if (!id) return null;
  return (await table('Family').findOne({ where: { id } })) as DbRow | null;
}

async function ranksOf(familyId: number): Promise<DbRow[]> {
  return (await table('FamilyRank').findAll({ where: { familyId } })) as DbRow[];
}

function rankNumber(ranks: DbRow[], rankId: number): number {
  return Number(ranks.find((rank) => Number(rank.id) === rankId)?.rank) || 0;
}

function leader(family: DbRow, ranks: DbRow[], player: mint.Player): boolean {
  const character = getSession(player).character;
  if (Number(family.leaderId) === Number(character?.id)) return true;
  const max = Math.max(...ranks.map((rank) => Number(rank.rank) || 0));
  return rankNumber(ranks, Number(character?.familyRank) || 0) >= max;
}

export async function syncFamily(player: mint.Player): Promise<void> {
  const family = await familyOf(player);
  const character = getSession(player).character;
  if (!family || !character) {
    cef(player, 'interactionMenu.family = null; interactionMenu.familyCanInvite = false;');
    pushFamily(player, null);
    return;
  }
  const ranks = await ranksOf(Number(family.id));
  const mine = ranks.find((rank) => Number(rank.id) === Number(character.familyRank));
  const number = Number(mine?.rank) || 0;
  const data = {
    id: family.id,
    name: family.name,
    tag: family.tag,
    cash: Number(family.cash) || 0,
    level: Number(family.level) || 1,
    exp: Number(family.exp) || 0,
    expMax: (Number(family.level) || 1) * 1000,
    rankId: mine?.id ?? 0,
    rankName: mine?.name ?? '',
    rankNumber: number,
    isLeader: leader(family, ranks, player),
    ranks: ranks.map((rank) => ({ id: rank.id, name: rank.name, rank: rank.rank })),
    inviteRank: Number(family.inviteRank) || 3,
    uvalRank: Number(family.uvalRank) || 4,
    giveRankRank: Number(family.giveRankRank) || 4,
    houseId: family.houseId ?? null,
    vehRespawnPrice: 5000,
  };
  cef(player, [
    `interactionMenu.family = ${data.id};`,
    `interactionMenu.familyCanInvite = ${number >= data.inviteRank};`,
    `selectMenu.menus['familyControlRanks'].init(${JSON.stringify(data.ranks)});`,
    `selectMenu.setProp('familyControl', 'isLeader', ${data.isLeader});`,
    `selectMenu.setProp('familyControl', 'inviteRank', ${data.inviteRank});`,
    `selectMenu.setProp('familyControl', 'uvalRank', ${data.uvalRank});`,
    `selectMenu.setProp('familyControl', 'giveRankRank', ${data.giveRankRank});`,
    `selectMenu.setProp('familyControlCash', 'balance', ${data.cash});`,
    `selectMenu.setProp('familyControlVehicles', 'respawnPrice', 5000);`,
    `selectMenu.setProp('familyControl', 'houseId', ${data.houseId == null ? 'null' : data.houseId});`,
    `selectMenu.menus['familyControl'].setLevel(${data.level}, ${data.exp}, ${data.expMax});`,
  ].join('\n'));
  pushFamily(player, `${family.name} [${family.tag}]`);
}

async function members(familyId: number): Promise<DbRow[]> {
  return (await table('Character').findAll({ where: { familyId } })) as DbRow[];
}

export function installFamilyControl(): void {
  const shape = new mint.ColshapeSphere(CREATE.x, CREATE.y, CREATE.z, 2, 0, true);
  setColshapeHandlers(shape, {
    onEnter: (player) => {
      nearCreate.add(player);
      if (getSession(player).character?.familyId) return;
      mint.emitClient(player, 'crp:ui:focus', true);
      cef(player, `selectMenu.menus['familyCreate'].init(${PRICE}, ${JSON.stringify(COLOR_NAMES)}); selectMenu.showByName('familyCreate');`);
    },
    onExit: (player) => {
      nearCreate.delete(player);
    },
  });
  const blip = new mint.PointBlip(492, CREATE.x, CREATE.y, CREATE.z, 5, 0.8, true, 0, 'Создание семьи');
  void blip;

  mint.onClient('crp:family:create', async (player, raw) => {
    const header = 'Создание семьи';
    const character = getSession(player).character;
    if (!character || !nearCreate.has(player)) return notifyError(player, 'Подойдите к точке создания семьи', header);
    if (character.familyId) return notifyError(player, 'Вы уже состоите в семье', header);
    const data = JSON.parse(String(raw ?? '{}')) as { name?: string; tag?: string; colorIndex?: number };
    const name = String(data.name ?? '').trim();
    const tag = String(data.tag ?? '').trim();
    if (name.length < 3 || name.length > 32) return notifyError(player, 'Название: 3-32 символов', header);
    if (tag.length < 2 || tag.length > 5 || !/^[A-Za-z0-9]+$/.test(tag)) return notifyError(player, 'Тег: 2-5 символов, латиница и цифры', header);
    const taken = (await table('Family').findAll()) as DbRow[];
    if (taken.some((row) => String(row.name).toLowerCase() === name.toLowerCase())) return notifyError(player, 'Название занято', header);
    if (taken.some((row) => String(row.tag).toLowerCase() === tag.toLowerCase())) return notifyError(player, 'Тег занят', header);
    if (!(await removeCash(player, PRICE))) return notifyError(player, `Необходимо $${PRICE}`, header);
    const family = (await table('Family').create({
      name,
      tag,
      leaderId: character.id,
      blipColor: COLORS[Number(data.colorIndex)] ?? 1,
      inviteRank: 3,
      uvalRank: 4,
      giveRankRank: 4,
    })) as DbRow;
    let top: DbRow | null = null;
    for (const rank of RANKS) {
      const created = (await table('FamilyRank').create({ familyId: family.id, name: rank.name, rank: rank.rank })) as DbRow;
      if (rank.rank === 5) top = created;
    }
    character.familyId = family.id;
    character.familyRank = top?.id ?? null;
    await character.save();
    notifySuccess(player, `Семья ${name} создана`, header);
    await syncFamily(player);
  });

  mint.onClient('crp:family:leave', async (player) => {
    const character = getSession(player).character;
    const family = await familyOf(player);
    if (!character || !family) return notifyError(player, 'Вы не состоите в семье', 'Семья');
    if (Number(family.leaderId) === Number(character.id)) return notifyError(player, 'Лидер не может выйти. Передайте семью или распустите её', 'Семья');
    character.familyId = null;
    character.familyRank = null;
    await character.save();
    await syncFamily(player);
    notifySuccess(player, 'Вы вышли из семьи', 'Семья');
  });

  mint.onClient('crp:family:disband', async (player) => {
    const family = await familyOf(player);
    if (!family) return notifyError(player, 'Вы не состоите в семье', 'Роспуск семьи');
    const ranks = await ranksOf(Number(family.id));
    if (!leader(family, ranks, player)) return notifyError(player, 'Только лидер может распустить семью', 'Роспуск семьи');
    const list = await members(Number(family.id));
    for (const row of list) {
      row.familyId = null;
      row.familyRank = null;
      await row.save();
    }
    for (const rank of ranks) if (typeof rank.destroy === 'function') await rank.destroy();
    if (typeof family.destroy === 'function') await family.destroy();
    for (const other of mint.Player.all) {
      if (!other.valid) continue;
      const character = getSession(other).character;
      if (!character || !list.some((row) => Number(row.id) === Number(character.id))) continue;
      character.familyId = null;
      character.familyRank = null;
      await syncFamily(other);
    }
    notifySuccess(player, `Семья ${family.name} распущена`, 'Роспуск семьи');
  });

  mint.onClient('crp:family:members', async (player, offline) => {
    const family = await familyOf(player);
    if (!family) return notifyError(player, 'Вы не состоите в семье', 'Семья');
    const ranks = await ranksOf(Number(family.id));
    const number = rankNumber(ranks, Number(getSession(player).character?.familyRank) || 0);
    if (number < Number(family.giveRankRank) && number < Number(family.uvalRank)) return notifyError(player, 'Недостаточно прав', 'Семья');
    const list = await members(Number(family.id));
    const online = new Set(mint.Player.all.filter((other) => other.valid).map((other) => Number(getSession(other).character?.id)));
    const body = list
      .filter((row) => (offline === true || offline === 1 ? !online.has(Number(row.id)) : online.has(Number(row.id))))
      .map((row) => ({
        id: row.id,
        sqlId: row.id,
        name: row.name,
        rank: rankNumber(ranks, Number(row.familyRank)),
      }));
    cef(player, `selectMenu.menus['familyControlMembers'].init(${JSON.stringify({ members: body, rankNames: ranks.map((rank) => rank.name) })}); selectMenu.showByName('familyControlMembers');`);
  });

  mint.onClient('crp:family:rank', async (player, raw) => {
    const family = await familyOf(player);
    const data = JSON.parse(String(raw ?? '{}')) as { recId?: number; sqlId?: number; rank?: number };
    if (!family) return notifyError(player, 'Вы не состоите в семье', 'Семья');
    const ranks = await ranksOf(Number(family.id));
    if (rankNumber(ranks, Number(getSession(player).character?.familyRank) || 0) < Number(family.giveRankRank)) return notifyError(player, 'Недостаточно прав', 'Семья');
    const targetId = Number(data.sqlId || data.recId);
    const online = mint.Player.all.find((other) => other.valid && Number(getSession(other).character?.id) === targetId);
    const character = online ? getSession(online).character : (await table('Character').findOne({ where: { id: targetId } })) as DbRow | null;
    if (!character || Number(character.familyId) !== Number(family.id)) return notifyError(player, 'Игрок не найден', 'Семья');
    const next = ranks.find((rank) => Number(rank.rank) === Number(data.rank));
    if (!next) return notifyError(player, 'Ранг не найден', 'Семья');
    if (Number(next.rank) >= rankNumber(ranks, Number(getSession(player).character?.familyRank) || 0)) return notifyError(player, 'Нельзя повысить до своего ранга или выше', 'Семья');
    character.familyRank = next.id;
    await character.save();
    if (online?.valid) {
      getSession(online).character!.familyRank = next.id;
      notifyInfo(online, `${nameOf(player)} изменил ваш ранг на ${next.name}`, 'Семья');
      await syncFamily(online);
    }
    notifySuccess(player, `${character.name} теперь ${next.name}`, 'Семья');
  });

  mint.onClient('crp:family:uval', async (player, raw) => {
    const family = await familyOf(player);
    const data = JSON.parse(String(raw ?? '{}')) as { sqlId?: number; recId?: number };
    if (!family) return notifyError(player, 'Вы не состоите в семье', 'Семья');
    const ranks = await ranksOf(Number(family.id));
    if (rankNumber(ranks, Number(getSession(player).character?.familyRank) || 0) < Number(family.uvalRank)) return notifyError(player, 'Недостаточно прав', 'Семья');
    const targetId = Number(data.sqlId || data.recId);
    const online = mint.Player.all.find((other) => other.valid && Number(getSession(other).character?.id) === targetId);
    const character = online ? getSession(online).character : (await table('Character').findOne({ where: { id: targetId } })) as DbRow | null;
    if (!character || Number(character.familyId) !== Number(family.id)) return notifyError(player, 'Игрок не найден', 'Семья');
    if (Number(family.leaderId) === targetId) return notifyError(player, 'Нельзя уволить лидера', 'Семья');
    character.familyId = null;
    character.familyRank = null;
    await character.save();
    if (online?.valid) await syncFamily(online);
    notifySuccess(player, `${character.name} исключён`, 'Семья');
  });

  mint.onClient('crp:family:lead', async (player, rawId) => {
    const family = await familyOf(player);
    if (!family) return notifyError(player, 'Вы не состоите в семье', 'Семья');
    const ranks = await ranksOf(Number(family.id));
    if (!leader(family, ranks, player)) return notifyError(player, 'Вы не лидер', 'Семья');
    const target = mint.Player.getByID(Number(rawId));
    const character = target ? getSession(target).character : null;
    if (!target?.valid || !character || Number(character.familyId) !== Number(family.id)) return notifyError(player, 'Игрок не найден', 'Семья');
    const top = ranks.slice().sort((a, b) => Number(b.rank) - Number(a.rank))[0];
    family.leaderId = character.id;
    await family.save();
    character.familyRank = top.id;
    await character.save();
    await syncFamily(player);
    await syncFamily(target);
    notifySuccess(player, `${nameOf(target)} теперь глава`, 'Семья');
    notifySuccess(target, 'Вам передали семью', 'Семья');
  });

  mint.onClient('crp:family:access', async (player, raw) => {
    const family = await familyOf(player);
    const data = JSON.parse(String(raw ?? '{}')) as { inviteRank?: number; uvalRank?: number; giveRankRank?: number };
    if (!family) return notifyError(player, 'Вы не состоите в семье', 'Семья');
    const ranks = await ranksOf(Number(family.id));
    if (!leader(family, ranks, player)) return notifyError(player, 'Вы не лидер', 'Семья');
    if (data.inviteRank != null) family.inviteRank = Math.max(1, Math.trunc(Number(data.inviteRank)));
    if (data.uvalRank != null) family.uvalRank = Math.max(1, Math.trunc(Number(data.uvalRank)));
    if (data.giveRankRank != null) family.giveRankRank = Math.max(1, Math.trunc(Number(data.giveRankRank)));
    await family.save();
    for (const other of mint.Player.all) {
      if (other.valid && Number(getSession(other).character?.familyId) === Number(family.id)) await syncFamily(other);
    }
    notifySuccess(player, 'Доступ обновлён', 'Семья');
  });

  mint.onClient('crp:family:cash', async (player, raw, withdraw) => {
    const family = await familyOf(player);
    const sum = Math.max(1, Math.trunc(Number(raw) || 0));
    if (!family) return notifyError(player, 'Вы не состоите в семье', 'Общак');
    const ranks = await ranksOf(Number(family.id));
    if (withdraw && !leader(family, ranks, player)) return notifyError(player, 'Снимать может только лидер', 'Общак');
    if (withdraw) {
      if ((Number(family.cash) || 0) < sum) return notifyError(player, 'В общаке недостаточно денег', 'Общак');
      family.cash = Number(family.cash) - sum;
      await family.save();
      await addCash(player, sum);
    } else {
      if (!(await removeCash(player, sum))) return notifyError(player, `Необходимо $${sum}`, 'Общак');
      family.cash = (Number(family.cash) || 0) + sum;
      await family.save();
    }
    await syncFamily(player);
    notifySuccess(player, withdraw ? `Снято $${sum}` : `Внесено $${sum}`, 'Общак');
  });

  mint.onClient('crp:family:settings', async (player, raw) => {
    const family = await familyOf(player);
    const data = JSON.parse(String(raw ?? '{}')) as { tag?: string; colorIndex?: number };
    if (!family) return notifyError(player, 'Вы не состоите в семье', 'Семья');
    const ranks = await ranksOf(Number(family.id));
    if (!leader(family, ranks, player)) return notifyError(player, 'Вы не лидер', 'Семья');
    if (data.colorIndex != null) family.blipColor = COLORS[Number(data.colorIndex)] ?? family.blipColor;
    const tag = String(data.tag ?? '').trim();
    if (tag && tag !== String(family.tag)) {
      if (tag.length < 2 || tag.length > 5 || !/^[A-Za-z0-9]+$/.test(tag)) return notifyError(player, 'Тег: 2-5 символов', 'Семья');
      if ((Number(family.cash) || 0) < TAG_PRICE) return notifyError(player, `В общаке нужно $${TAG_PRICE}`, 'Семья');
      family.cash = Number(family.cash) - TAG_PRICE;
      family.tag = tag;
    }
    await family.save();
    for (const other of mint.Player.all) {
      if (other.valid && Number(getSession(other).character?.familyId) === Number(family.id)) await syncFamily(other);
    }
    notifySuccess(player, 'Настройки сохранены', 'Семья');
  });

  mint.onClient('crp:family:vehicles', async (player) => {
    const family = await familyOf(player);
    if (!family) return notifyError(player, 'Вы не состоите в семье', 'Семья');
    const rows = (await table('Vehicle').findAll({ where: { key: 'family', owner: family.id } })) as DbRow[];
    const gates = rows.length
      ? (await table('FactionVehicleRank').findAll({ where: { vehicleId: rows.map((row) => row.id) } })) as DbRow[]
      : [];
    const minByVehicle = new Map(gates.map((gate) => [Number(gate.vehicleId), Number(gate.rank)]));
    const list = rows.map((row) => ({ id: row.id, name: row.modelName, plate: row.plate, minRank: minByVehicle.get(Number(row.id)) ?? null }));
    cef(player, `selectMenu.menus['familyControlVehicles'].init(${JSON.stringify({ vehicles: list })}); selectMenu.showByName('familyControlVehicles');`);
  });

  mint.onClient('crp:family:vehicle:rank', async (player, raw) => {
    const family = await familyOf(player);
    const data = JSON.parse(String(raw ?? '{}')) as { vehId?: number; rank?: number };
    if (!family) return notifyError(player, 'Вы не состоите в семье');
    const ranks = await ranksOf(Number(family.id));
    if (!leader(family, ranks, player)) return notifyError(player, 'Вы не лидер');
    const vehicle = (await table('Vehicle').findOne({
      where: { id: Number(data.vehId) || 0, key: 'family', owner: family.id },
    })) as DbRow | null;
    if (!vehicle) return notifyError(player, 'Авто не найдено');
    const rank = Math.trunc(Number(data.rank));
    const named = ranks.find((row) => Number(row.rank) === rank);
    if (!named) return notifyError(player, 'Ранг не найден');
    const gate = (await table('FactionVehicleRank').findOne({ where: { vehicleId: vehicle.id } })) as DbRow | null;
    if (gate) {
      gate.rank = rank;
      await gate.save();
    } else {
      await table('FactionVehicleRank').create({ vehicleId: vehicle.id, rank });
    }
    const text = `${getSession(player).character?.name ?? player.name} изменил мин. ранг авто ${vehicle.modelName} (${vehicle.plate})`;
    for (const other of mint.Player.all) {
      if (!other.valid) continue;
      if (Number(getSession(other).character?.familyId) !== Number(family.id)) continue;
      notifyInfo(other, text, String(family.name));
    }
  });

  mint.on('playerEnteredVehicle', async (player, vehicle, seat) => {
    if (seat !== 1 && seat !== 0) return;
    const state = vehicleState(vehicle);
    if (!state || state.key !== 'family' || !state.row) return;
    const character = getSession(player).character;
    if (!character) return;
    const familyName = String((await table('Family').findOne({ where: { id: state.owner } }) as DbRow | null)?.name ?? 'Семья');
    if (Number(character.familyId) !== state.owner) {
      notifyError(player, `Это семейный транспорт семьи ${familyName}`, 'Семья');
      mint.emitClient(player, 'crp:veh:leave');
      return;
    }
    const gate = (await table('FactionVehicleRank').findOne({ where: { vehicleId: state.row.id } })) as DbRow | null;
    if (!gate) return;
    const ranks = await ranksOf(state.owner);
    const min = ranks.find((row) => Number(row.rank) === Number(gate.rank));
    const mine = rankNumber(ranks, Number(character.familyRank) || 0);
    if (min && mine < Number(min.rank)) {
      notifyError(player, `Доступно с ранга ${min.name}`, familyName);
      mint.emitClient(player, 'crp:veh:leave');
    }
  });

  mint.onClient('crp:family:garage', async (player) => {
    const family = await familyOf(player);
    if (!family) return notifyError(player, 'Вы не состоите в семье', 'Гараж');
    const rows = (await table('Vehicle').findAll({ where: { key: 'family', owner: family.id } })) as DbRow[];
    const limit = 3 + ((Number(family.level) || 1) - 1);
    cef(player, `selectMenu.menus['familyGarageBuy'].init(${JSON.stringify({ vehicles: CARS, count: rows.length, max: limit, cash: Number(family.cash) || 0 })}); selectMenu.showByName('familyGarageBuy');`);
  });

  mint.onClient('crp:family:garage:buy', async (player, raw) => {
    const family = await familyOf(player);
    const index = Math.max(0, Math.min(CARS.length - 1, Math.trunc(Number(raw) || 0)));
    const car = CARS[index];
    if (!family || !car) return notifyError(player, 'Семья не найдена', 'Гараж');
    const ranks = await ranksOf(Number(family.id));
    if (!leader(family, ranks, player)) return notifyError(player, 'Вы не лидер', 'Гараж');
    const rows = (await table('Vehicle').findAll({ where: { key: 'family', owner: family.id } })) as DbRow[];
    const limit = 3 + ((Number(family.level) || 1) - 1);
    if (rows.length >= limit) return notifyError(player, `Лимит транспорта: ${limit}`, 'Гараж');
    if ((Number(family.cash) || 0) < car.price) return notifyError(player, `В общаке нужно $${car.price}`, 'Гараж');
    family.cash = Number(family.cash) - car.price;
    await family.save();
    await table('Vehicle').create({
      key: 'family',
      owner: family.id,
      modelName: car.model,
      color1: 0,
      color2: 0,
      x: Number(family.x) || CREATE.x,
      y: Number(family.y) || CREATE.y,
      z: Number(family.z) || CREATE.z,
      h: 0,
      parkingId: 1,
      plate: `FAM${family.id}${rows.length}`,
      owners: 1,
      regDate: new Date(),
      fuel: 50,
    });
    notifySuccess(player, `${car.name} куплен для семьи`, 'Гараж');
    await syncFamily(player);
  });

  mint.onClient('crp:family:respawn', async (player) => {
    const family = await familyOf(player);
    if (!family) return notifyError(player, 'Вы не состоите в семье', 'Гараж');
    const ranks = await ranksOf(Number(family.id));
    if (!leader(family, ranks, player)) return notifyError(player, 'Вы не лидер', 'Гараж');
    if ((Number(family.cash) || 0) < 5000) return notifyError(player, 'В общаке нужно $5000', 'Гараж');
    const rows = (await table('Vehicle').findAll({ where: { key: 'family', owner: family.id } })) as DbRow[];
    family.cash = Number(family.cash) - 5000;
    await family.save();
    const pos = new mint.Vector3(Number(family.x) || CREATE.x, Number(family.y) || CREATE.y, Number(family.z) || CREATE.z);
    for (const row of rows) {
      const vehicle = vehicleBySqlId(Number(row.id));
      if (vehicle && !vehicle.driver) vehicle.pos = pos;
    }
    notifySuccess(player, 'Свободный транспорт возвращён', 'Гараж');
  });

  mint.onClient('crp:family:house', async (player, unbind) => {
    const family = await familyOf(player);
    const character = getSession(player).character;
    if (!family || !character) return notifyError(player, 'Вы не состоите в семье', 'Дом');
    const ranks = await ranksOf(Number(family.id));
    if (!leader(family, ranks, player)) return notifyError(player, 'Вы не лидер', 'Дом');
    if (unbind) {
      family.houseId = null;
      await family.save();
      detachFamilyStorage(Number(family.id));
      notifySuccess(player, 'Дом отвязан', 'Дом');
    } else {
      const house = houseForCharacter(Number(character.id));
      if (!house) return notifyError(player, 'У вас нет дома', 'Дом');
      family.houseId = house.info.id;
      family.x = Number(house.info.pickupX) || family.x;
      family.y = Number(house.info.pickupY) || family.y;
      family.z = Number(house.info.pickupZ) || family.z;
      await family.save();
      await attachFamilyStorage(family);
      notifySuccess(player, `Дом #${house.info.id} привязан`, 'Дом');
    }
    await syncFamily(player);
  });

  mint.onClient('crp:family:contract', async (player, cancel) => {
    const family = await familyOf(player);
    const id = Number(getSession(player).character?.id) || 0;
    if (!family) return notifyError(player, 'Вы не состоите в семье', 'Контракт');
    if (cancel) {
      contracts.delete(id);
      mint.emitClient(player, 'crp:waypoint', 0, 0);
      notifyInfo(player, 'Контракт отменён', 'Контракт');
      return;
    }
    if (contracts.has(id)) return notifyError(player, 'Контракт уже взят', 'Контракт');
    const point = CONTRACTS[Math.floor(Math.random() * CONTRACTS.length)];
    contracts.set(id, point);
    mint.emitClient(player, 'crp:waypoint', point.x, point.y);
    notifySuccess(player, 'Точка доставки отмечена', 'Контракт');
  });

  mint.setInterval(() => {
    for (const player of mint.Player.all) {
      if (!player.valid) continue;
      const id = Number(getSession(player).character?.id) || 0;
      const point = contracts.get(id);
      if (!point || player.pos.distanceTo(new mint.Vector3(point.x, point.y, point.z)) > 4) continue;
      contracts.delete(id);
      void familyOf(player).then(async (family) => {
        if (!family) return;
        family.cash = (Number(family.cash) || 0) + 50000;
        family.exp = (Number(family.exp) || 0) + 200;
        const need = (Number(family.level) || 1) * 1000;
        if (Number(family.exp) >= need && Number(family.level) < 30) {
          family.level = Number(family.level) + 1;
          family.exp = Number(family.exp) - need;
        }
        await family.save();
        mint.emitClient(player, 'crp:waypoint', 0, 0);
        notifySuccess(player, 'Контракт выполнен. В общак $50000', 'Контракт');
        await syncFamily(player);
      });
    }
  }, 1000);
}
