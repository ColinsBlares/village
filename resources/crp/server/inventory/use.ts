import * as mint from 'mint-server';
import { playTimed, stopAnimation } from '../animations/index.js';
import { allowHeal, allowMove } from '../anticheat/index.js';
import { table } from '../core/db.js';
import { pushNarcotism, pushNicotine } from '../player/menu.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifySuccess, notifyWarning } from '../ui/notify.js';
import { addCash, removeCash } from '../world/money.js';
import { setNeeds } from '../world/satiety.js';
import { addDrunkenness } from '../clubs/drunk.js';
import { fuelHere } from '../shops/index.js';
import { addFuel, vehicleState } from '../vehicles/index.js';
import { sendInventory } from './index.js';

const MED_HEALTH = 20;
const PATCH_HEALTH = 5;
const MED_MAX = 80;
const WAIT = 2 * 60 * 1000;
const DRUGS_HEALTH = [10, 20, 30, 60];
const DRUGS_NEED = [1, 2, 3, 6];
const DRUGS_WAIT = [10 * 6000, 20 * 6000, 30 * 6000, 60 * 6000];
const lastMed = new WeakMap<mint.Player, number>();
const lastPatch = new WeakMap<mint.Player, number>();
const lastSmoke = new WeakMap<mint.Player, number>();
const lastDrugs = new WeakMap<mint.Player, number>();
const reviveAt = new Map<number, number>();
const names = new Map<number, string>();

function hands(item: DbRow): boolean {
  return item.parentId == null && Number(item.index) === 13;
}

function paramsOf(item: DbRow): Record<string, string> {
  const list = (item.params ?? item.CharacterInventoryParams ?? []) as DbRow[];
  const params: Record<string, string> = {};
  for (const param of list) params[String(param.key)] = String(param.value);
  return params;
}

function countOf(item: DbRow): { param: DbRow | null; value: number } {
  const list = (item.params ?? []) as DbRow[];
  const param = list.find((row) => row.key === 'count') ?? null;
  return { param, value: Number(param?.value) || 0 };
}

async function itemName(itemId: number): Promise<string> {
  const cached = names.get(itemId);
  if (cached) return cached;
  const row = (await table('InventoryItem').findOne({ where: { id: itemId } })) as DbRow | null;
  const name = String(row?.name ?? `Предмет ${itemId}`);
  names.set(itemId, name);
  return name;
}

async function loadItem(player: mint.Player, sqlId: number): Promise<DbRow | null> {
  const character = getSession(player).character;
  if (!character) return null;
  return (await table('CharacterInventory').findOne({
    where: { id: sqlId, playerId: character.id },
    include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
  })) as DbRow | null;
}

async function findByItemId(player: mint.Player, itemId: number): Promise<DbRow | null> {
  const character = getSession(player).character;
  if (!character) return null;
  return (await table('CharacterInventory').findOne({
    where: { playerId: character.id, itemId },
    include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
  })) as DbRow | null;
}

async function changeCount(player: mint.Player, item: DbRow, next: number): Promise<void> {
  if (next <= 0) {
    if (typeof item.destroy === 'function') await item.destroy();
  } else {
    const param = countOf(item).param;
    if (param) {
      param.value = String(next);
      await param.save();
    }
  }
  await sendInventory(player);
}

function waitLeft(store: WeakMap<mint.Player, number>, player: mint.Player, wait = WAIT): number {
  const last = store.get(player) ?? 0;
  return Math.max(0, wait - (Date.now() - last));
}

function nearestPlayer(player: mint.Player, range: number): mint.Player | null {
  let best: mint.Player | null = null;
  let distance = range;
  for (const other of mint.Player.all) {
    if (other === player || !other.valid || !getSession(other).character) continue;
    const next = Math.hypot(other.pos.x - player.pos.x, other.pos.y - player.pos.y, other.pos.z - player.pos.z);
    if (next <= distance) {
      distance = next;
      best = other;
    }
  }
  return best;
}

function nearestVehicle(player: mint.Player, range: number): mint.Vehicle | null {
  let best: mint.Vehicle | null = null;
  let distance = range;
  for (const vehicle of mint.Vehicle.all) {
    if (!vehicle.valid) continue;
    const next = Math.hypot(vehicle.pos.x - player.pos.x, vehicle.pos.y - player.pos.y, vehicle.pos.z - player.pos.z);
    if (next <= distance) {
      distance = next;
      best = vehicle;
    }
  }
  return best;
}

function releaseHands(player: mint.Player): void {
  cef(player, 'inventory.setHandsBlock(false, true);');
}

async function heal(player: mint.Player, sqlId: number, amount: number, header: string, store: WeakMap<mint.Player, number>, overhead: string): Promise<void> {
  const item = await loadItem(player, sqlId);
  if (!item) return notifyError(player, `Предмет #${sqlId} не найден`, header);
  const title = await itemName(Number(item.itemId));
  if (!hands(item)) return notifyError(player, `${title} не в руках`, header);
  const count = countOf(item).value;
  if (!count) return notifyError(player, 'Количество: 0 ед.', header);
  if (player.health >= MED_MAX) {
    notifyError(player, 'Нельзя вылечиться больше', header);
    notifyWarning(player, 'Медики лечат эффективнее', header);
    return;
  }
  const left = waitLeft(store, player);
  if (left > 0) return notifyError(player, `Повторное использование доступно через ${Math.trunc(left / 1000)} сек.`, header);
  store.set(player, Date.now());
  allowHeal(player);
  player.health = Math.max(0, Math.min(MED_MAX, player.health + amount));
  await changeCount(player, item, count - 1);
  notifySuccess(player, 'Вы вылечились', header);
  cef(player, `mp.event.call('inventory.notifyOverhead', ${JSON.stringify(overhead)});`);
}

async function consumeLater(player: mint.Player, item: DbRow, header: string, verb: string, satiety: number, thirst: number, alcohol = 0): Promise<void> {
  const character = getSession(player).character;
  const title = await itemName(Number(item.itemId));
  const apply = async (target: mint.Player) => {
    if (typeof item.destroy === 'function') await item.destroy();
    await sendInventory(target);
    setNeeds(target, (Number(character?.satiety) || 0) + satiety, (Number(character?.thirst) || 0) + thirst);
    if (alcohol) addDrunkenness(target, alcohol);
    notifySuccess(target, `${verb} ${title}`, header);
    releaseHands(target);
  };
  if (player.vehicle) {
    await apply(player);
    return;
  }
  const dict = header === 'Еда'
    ? ['amb@code_human_wander_eating_donut@male@idle_a', 'idle_c']
    : ['amb@code_human_wander_drinking_fat@female@idle_a', 'idle_c'];
  playTimed(player, dict[0], dict[1], 49, 7000);
  const id = player.id;
  const characterId = Number(character?.id);
  setTimeout(() => {
    const current = mint.Player.getByID(id);
    if (!current?.valid || Number(getSession(current).character?.id) !== characterId) return;
    void apply(current);
  }, 7000);
}

export function installItemUse(): void {
  mint.onClient('crp:item:med', (player, sqlId) => {
    void heal(player, Number(sqlId), MED_HEALTH, 'Аптечка', lastMed, 'Вылечился');
  });
  mint.onClient('crp:item:patch', (player, sqlId) => {
    void heal(player, Number(sqlId), PATCH_HEALTH, 'Пластырь', lastPatch, 'Накинул пластырь');
  });
  mint.onClient('crp:item:eat', async (player, sqlId) => {
    const item = await loadItem(player, Number(sqlId));
    if (!item) {
      notifyError(player, `Предмет #${sqlId} не найден`, 'Еда');
      releaseHands(player);
      return;
    }
    const params = paramsOf(item);
    await consumeLater(player, item, 'Еда', 'Вы съели', Number(params.satiety) || 0, Number(params.thirst) || 0);
  });
  mint.onClient('crp:item:drink', async (player, sqlId) => {
    const item = await loadItem(player, Number(sqlId));
    if (!item) {
      notifyError(player, `Предмет #${sqlId} не найден`, 'Напиток');
      releaseHands(player);
      return;
    }
    const params = paramsOf(item);
    await consumeLater(player, item, 'Напиток', 'Вы выпили', Number(params.satiety) || 0, Number(params.thirst) || 0, Number(params.alcohol) || 0);
  });
  mint.onClient('crp:item:smoke', async (player, sqlId) => {
    const header = 'Сигарета';
    const smoke = await loadItem(player, Number(sqlId));
    if (!smoke) return notifyError(player, `Предмет #${sqlId} не найден`, header);
    const title = await itemName(Number(smoke.itemId));
    if (!hands(smoke)) return notifyError(player, `${title} не в руках`, header);
    const count = countOf(smoke).value;
    if (!count) return notifyError(player, 'Сигарет: 0 ед.', header);
    const matches = await findByItemId(player, 139);
    const matchesCount = matches ? countOf(matches).value : 0;
    if (!matches || !matchesCount) return notifyError(player, matches ? 'Спичек: 0 ед.' : 'Спички не найдены', header);
    const left = waitLeft(lastSmoke, player);
    if (left > 0) return notifyError(player, `Повторное использование доступно через ${Math.trunc(left / 1000)} сек.`, header);
    lastSmoke.set(player, Date.now());
    allowHeal(player);
    player.health = Math.max(0, Math.min(100, player.health + 2));
    await changeCount(player, smoke, count - 1);
    await changeCount(player, matches, matchesCount - 1);
    if (!player.vehicle) playTimed(player, 'amb@code_human_wander_smoking@male@idle_a', 'idle_a', 49, 8000);
    const character = getSession(player).character;
    if (character) {
      character.nicotine = (Number(character.nicotine) || 0) + 1;
      await character.save();
      pushNicotine(player);
    }
    notifySuccess(player, 'Вы употребили сигарету', header);
  });
  mint.onClient('crp:item:drugs', async (player, sqlId) => {
    const header = 'Наркотики';
    const drugs = await loadItem(player, Number(sqlId));
    if (!drugs) return notifyError(player, `Предмет #${sqlId} не найден`, header);
    const title = await itemName(Number(drugs.itemId));
    if (!hands(drugs)) return notifyError(player, `${title} не в руках`, header);
    const count = countOf(drugs).value;
    if (!count) return notifyError(player, 'Количество: 0 г.', header);
    const index = Math.max(0, Math.min(3, Number(drugs.itemId) - 29));
    const left = waitLeft(lastDrugs, player, DRUGS_WAIT[index]);
    if (left > 0) return notifyError(player, `Повторное использование доступно через ${Math.trunc(left / 1000)} сек.`, header);
    lastDrugs.set(player, Date.now());
    allowHeal(player);
    player.health = Math.max(0, Math.min(100, player.health + DRUGS_HEALTH[index]));
    await changeCount(player, drugs, count - 1);
    const character = getSession(player).character;
    if (character) {
      character.narcotism = (Number(character.narcotism) || 0) + DRUGS_NEED[index];
      await character.save();
      pushNarcotism(player);
    }
    notifySuccess(player, 'Вы употребили наркотик', header);
  });
  mint.onClient('crp:item:adrenalin', async (player, raw) => {
    const header = 'Адреналин';
    const data = typeof raw === 'string' ? JSON.parse(raw) as { recId?: number; itemSqlId?: number } : { itemSqlId: Number(raw) };
    const target = data.recId != null ? mint.Player.getByID(Number(data.recId)) : nearestPlayer(player, 5);
    if (!target?.valid || !getSession(target).character) return notifyError(player, 'Гражданин не найден', header);
    if (target.getSyncedMeta('crp:knocked') == null) return notifyError(player, `${getSession(target).character?.name} не нуждается в реанимации`, header);
    const distance = Math.hypot(target.pos.x - player.pos.x, target.pos.y - player.pos.y, target.pos.z - player.pos.z);
    if (distance > 5) return notifyError(player, `${getSession(target).character?.name} далеко`, header);
    const item = data.itemSqlId ? await loadItem(player, Number(data.itemSqlId)) : await findHands(player);
    if (!item || !hands(item) || Number(item.itemId) !== 26) return notifyError(player, 'Адреналин не в руках', header);
    const count = countOf(item).value;
    if (!count) return notifyError(player, 'Количество: 0 ед.', header);
    const medic = Number(getSession(player).character?.factionId) === 5;
    const characterId = Number(getSession(target).character?.id);
    if (medic && Date.now() - (reviveAt.get(characterId) ?? 0) >= 60 * 60 * 1000) {
      if (await addCash(player, 50)) reviveAt.set(characterId, Date.now());
    }
    allowMove(target);
    allowHeal(target);
    target.spawn(target.pos.x, target.pos.y, target.pos.z);
    target.health = 10;
    target.deleteSyncedMeta('crp:knocked');
    stopAnimation(target);
    await changeCount(player, item, count - 1);
    notifySuccess(player, `${getSession(target).character?.name} реанимирован`, header);
    notifySuccess(target, `${getSession(player).character?.name} вас реанимировал`, header);
  });
  mint.onClient('crp:item:use', async (player, raw) => {
    const data = JSON.parse(String(raw ?? '{}')) as { sqlId?: number; index?: number };
    const item = await loadItem(player, Number(data.sqlId));
    if (!item) return notifyError(player, 'Предмет не найден', 'Инвентарь');
    const title = await itemName(Number(item.itemId));
    if (!hands(item)) return notifyError(player, `${title} не в руках`, title);
    if (Number(item.itemId) !== 56) return;
    const params = paramsOf(item);
    const litres = Number(params.litres) || 0;
    const max = Number(params.max) || 20;
    if (data.index === 0) {
      if (player.vehicle) return notifyError(player, 'Недоступно в авто', title);
      const vehicle = nearestVehicle(player, 50);
      const state = vehicle ? vehicleState(vehicle) : undefined;
      if (!vehicle || !state) return notifyError(player, 'Подойдите к авто', title);
      if (!litres) return notifyError(player, 'Канистра пустая', title);
      if (state.props.isElectric) return notifyError(player, 'Нельзя заправить электромобиль', title);
      if (state.fuel >= state.props.maxFuel) return notifyError(player, `Авто ${state.props.name} имеет полный бак`, title);
      const fuel = Math.max(1, Math.min(litres, state.props.maxFuel - state.fuel));
      addFuel(vehicle, fuel);
      await setParam(player, item, 'litres', litres - fuel);
      notifySuccess(player, `Авто ${state.props.name} заправлено на ${Math.floor(fuel)} л.`, title);
      return;
    }
    if (data.index === 1) {
      const station = fuelHere(player);
      if (!station) return notifyError(player, 'Вы не у АЗС', title);
      if (litres >= max) return notifyError(player, 'Канистра полная', title);
      const fuel = max - litres;
      const price = Math.round((Number(station.fuelPrice) || 3) * fuel);
      if (!(await removeCash(player, price))) return notifyError(player, `Необходимо $${price}`, title);
      await setParam(player, item, 'litres', max);
      notifySuccess(player, `Канистра заправлена на ${fuel} л.`, title);
      return;
    }
    if (data.index === 2) {
      if (!litres) return notifyError(player, 'Канистра пустая', title);
      await setParam(player, item, 'litres', 0);
      notifySuccess(player, 'Содержимое канистры слито', title);
    }
  });
}

async function findHands(player: mint.Player): Promise<DbRow | null> {
  const character = getSession(player).character;
  if (!character) return null;
  return (await table('CharacterInventory').findOne({
    where: { playerId: character.id, parentId: null, index: 13 },
    include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
  })) as DbRow | null;
}

async function setParam(player: mint.Player, item: DbRow, key: string, value: number): Promise<void> {
  const list = (item.params ?? []) as DbRow[];
  const param = list.find((row) => row.key === key);
  if (!param) return;
  param.value = String(value);
  await param.save();
  await sendInventory(player);
}
