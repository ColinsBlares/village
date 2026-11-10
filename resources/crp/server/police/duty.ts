import * as mint from 'mint-server';
import { allowMove } from '../anticheat/index.js';
import { addOverheadText, getNearVehicle } from '../core/utils.js';
import { table } from '../core/db.js';
import { factionInfo, factionKind, rankNumber } from '../factions/index.js';
import { sendInventory } from '../inventory/index.js';
import { dropOwnedItem } from '../inventory/ground.js';
import { clientItems, itemCatalog } from '../inventory/items.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess } from '../ui/notify.js';
import { addCash, removeCash } from '../world/money.js';
import { arrestPrice, releaseArrest } from './index.js';

const CUFFS = new Set(['government', 'police', 'fib', 'army', 'mafia']);
const SEARCH = new Set(['government', 'police', 'fib', 'army']);
const searches = new WeakMap<mint.Player, number>();
const unarrests = new WeakMap<mint.Player, number>();

function nameOf(player: mint.Player): string {
  return String(getSession(player).character?.name ?? player.name);
}

function kind(player: mint.Player): string | null {
  return factionKind(Number(getSession(player).character?.factionId) || 0);
}

function targetOf(player: mint.Player, rawId: unknown, range: number): mint.Player | null {
  const target = mint.Player.getByID(Number(rawId));
  if (!target?.valid || !getSession(target).character) return null;
  if (player.pos.distanceTo(target.pos) > range) return null;
  return target;
}

function rankReady(player: mint.Player, need: number, header: string): boolean {
  const faction = factionInfo(Number(getSession(player).character?.factionId) || 0);
  const rank = faction?.ranks.find((item) => item.rank === need);
  if (rankNumber(player) < need) {
    notifyError(player, `Доступно с ранга ${rank?.name ?? need}`, header);
    return false;
  }
  return true;
}

function collectIds(value: unknown, into: Set<number>): void {
  if (!value || typeof value !== 'object') return;
  const item = value as { itemId?: number; pockets?: { items?: Record<string, unknown> }[] };
  if (typeof item.itemId === 'number') into.add(item.itemId);
  for (const pocket of item.pockets ?? []) {
    for (const child of Object.values(pocket.items ?? {})) collectIds(child, into);
  }
}

function rearSeat(vehicle: mint.Vehicle): number | null {
  const taken = new Set(Object.keys(vehicle.passengers).map((seat) => Number(seat)));
  for (const seat of [3, 4, 2]) if (!taken.has(seat)) return seat;
  return null;
}

async function itemTitle(itemId: number): Promise<string> {
  const row = (await table('InventoryItem').findOne({ where: { id: itemId } })) as DbRow | null;
  return String(row?.name ?? `Предмет ${itemId}`);
}

export function installPoliceDuty(): void {
  mint.onClient('crp:police:follow', (player, rawId) => {
    const header = 'Следование';
    if (!CUFFS.has(kind(player) ?? '')) return notifyError(player, 'Нет прав для использования', header);
    const target = targetOf(player, rawId, 5);
    if (!target) return notifyError(player, 'Гражданин не найден', header);
    if (target.getSyncedMeta('crp:knocked') != null) return notifyError(player, 'Гражданин при смерти', header);
    const following = target.getSyncedMeta('crp:follow') != null;
    if (!following) {
      if (!target.getSyncedMeta('crp:cuffs')) return notifyError(player, `${nameOf(target)} не в наручниках`, header);
      target.setSyncedMeta('crp:follow', player.id);
      mint.emitClient(target, 'crp:follow', player.id);
      notifySuccess(player, `${nameOf(target)} следует за вами`, header);
      notifyInfo(target, `Вы следуете за ${nameOf(player)}`, header);
      return;
    }
    target.deleteSyncedMeta('crp:follow');
    mint.emitClient(target, 'crp:follow', 0);
    notifySuccess(player, `${nameOf(target)} не следует за вами`, header);
    notifyInfo(target, `Вы не следуете за ${nameOf(player)}`, header);
  });

  mint.onClient('crp:police:vehicle', (player, rawId) => {
    const header = 'Посадка';
    if (!CUFFS.has(kind(player) ?? '')) return notifyError(player, 'Нет прав', header);
    const target = targetOf(player, rawId, 5);
    if (!target) return notifyError(player, 'Гражданин не найден', header);
    if (!target.getSyncedMeta('crp:cuffs')) return notifyError(player, `${nameOf(target)} не в наручниках`, header);
    if (target.vehicle) return notifyError(player, `${nameOf(target)} уже в авто`, header);
    const vehicle = getNearVehicle(player, 3);
    if (!vehicle) return notifyError(player, 'Авто не найдено', header);
    const seat = rearSeat(vehicle);
    if (seat == null) return notifyError(player, 'В авто нет места', header);
    target.deleteSyncedMeta('crp:follow');
    mint.emitClient(target, 'crp:follow', 0);
    allowMove(target);
    target.setIntoVehicle(vehicle, seat);
    notifySuccess(player, `${nameOf(target)} посажен в авто`, header);
    notifyInfo(target, `${nameOf(player)} посадил вас в авто`, header);
  });

  mint.onClient('crp:police:search', async (player, rawId) => {
    const header = 'Обыск';
    const mine = kind(player);
    if (!SEARCH.has(mine ?? '')) return notifyError(player, 'Нет прав для обыска', header);
    if (!rankReady(player, 10, header)) return;
    if (searches.has(player)) return notifyError(player, 'Вы уже обыскиваете игрока', header);
    const target = targetOf(player, rawId, 5);
    if (!target) return notifyError(player, 'Игрок не найден', header);
    if (target.vehicle) return notifyError(player, 'Игрок находится в авто', header);
    const character = getSession(player).character;
    const hands = character
      ? await table('CharacterInventory').findOne({ where: { playerId: character.id, index: 13, parentId: null } })
      : null;
    if (hands) return notifyError(player, 'Освободите руки', header);
    const other = getSession(target).character;
    if (!other) return;
    const tree = await clientItems(Number(other.id));
    const ids = new Set<number>();
    for (const item of Object.values(tree)) collectIds(item, ids);
    const catalog = await itemCatalog([...ids]);
    searches.set(player, target.id);
    cef(player, `inventory.setItemsInfo(${JSON.stringify(catalog)}); inventory.initSearchItems(${JSON.stringify({
      playerId: target.id,
      playerName: nameOf(target),
      items: tree,
    })});`);
    cef(target, 'inventory.controlEnable = false;');
    mint.emitClient(player, 'crp:search', target.id);
    addOverheadText(player, 'Начал обыск');
  });

  mint.onClient('crp:police:search:stop', (player) => {
    const targetId = searches.get(player);
    if (targetId == null) return notifyError(player, 'Вы не обыскиваете игрока', 'Обыск');
    searches.delete(player);
    const target = mint.Player.getByID(targetId);
    if (target?.valid) cef(target, 'inventory.controlEnable = true;');
    cef(player, 'inventory.stopSearchMode();');
    void sendInventory(player);
    mint.emitClient(player, 'crp:search', 0);
    addOverheadText(player, 'Завершил обыск');
  });

  mint.onClient('crp:police:search:found', async (player, raw) => {
    const targetId = searches.get(player);
    const target = targetId != null ? mint.Player.getByID(targetId) : null;
    if (!target?.valid) return notifyError(player, 'Вы не обыскиваете игрока', 'Обыск');
    const data = JSON.parse(String(raw ?? '{}')) as { sqlId?: number; itemId?: number };
    cef(target, `inventory.setFoundItem(${Number(data.sqlId) || 0}, true);`);
    addOverheadText(player, `Нашел '${await itemTitle(Number(data.itemId) || 0)}'`);
  });

  mint.onClient('crp:police:search:drop', async (player, rawId, rawPos) => {
    const header = 'Обыск';
    const targetId = searches.get(player);
    const target = targetId != null ? mint.Player.getByID(targetId) : null;
    if (!target?.valid) return notifyError(player, 'Вы не обыскиваете игрока', header);
    let pos: { x: number; y: number; z: number };
    try {
      pos = typeof rawPos === 'string' ? JSON.parse(rawPos) as { x: number; y: number; z: number } : rawPos as { x: number; y: number; z: number };
    } catch {
      return;
    }
    const error = await dropOwnedItem(target, Number(rawId), pos, player);
    if (error) return notifyError(player, error, header);
    notifySuccess(player, 'Предмет на земле', header);
    addOverheadText(player, 'Опрокинул предмет');
  });

  mint.onClient('crp:police:gun:give', async (player, rawId) => {
    const header = 'Лицензия на оружие';
    if (kind(player) !== 'police') return notifyError(player, 'Вы не сотрудник полиции', header);
    if (!rankReady(player, 10, header)) return;
    const target = targetOf(player, rawId, 5);
    const character = target ? getSession(target).character : null;
    if (!target || !character) return notifyError(player, 'Гражданин не найден', header);
    if (character.gunLicenseDate) return notifyError(player, `${nameOf(target)} уже имеет лицензию`, header);
    character.gunLicenseDate = new Date();
    await character.save();
    notifySuccess(player, `Выдана лицензия ${nameOf(target)}`, header);
    notifyInfo(target, `${nameOf(player)} выдал вам лицензию`, header);
  });

  mint.onClient('crp:police:gun:take', async (player, rawId) => {
    const header = 'Лицензия на оружие';
    if (kind(player) !== 'police') return notifyError(player, 'Вы не сотрудник полиции', header);
    if (!rankReady(player, 10, header)) return;
    const target = targetOf(player, rawId, 5);
    const character = target ? getSession(target).character : null;
    if (!target || !character) return notifyError(player, 'Гражданин не найден', header);
    if (!character.gunLicenseDate) return notifyError(player, `${nameOf(target)} не имеет лицензию`, header);
    character.gunLicenseDate = null;
    await character.save();
    notifySuccess(player, `Лицензия ${nameOf(target)} изъята`, header);
    notifyInfo(target, `${nameOf(player)} изъял лицензию`, header);
  });

  mint.onClient('crp:gov:unarrest', (player, rawId) => {
    const header = 'Освобождение';
    if (kind(player) !== 'government') return notifyError(player, 'Вы не адвокат', header);
    const target = targetOf(player, rawId, 10);
    if (!target) return notifyError(player, 'Игрок не найден', header);
    if (!(Number(getSession(target).character?.arrestTime) > 0)) return notifyError(player, `${nameOf(target)} не отбывает срок`, header);
    const price = arrestPrice(target);
    unarrests.set(target, player.id);
    cef(target, `offerDialog.show('unarrest', ${JSON.stringify({ name: nameOf(player), price })});`);
  });

  mint.onClient('crp:gov:unarrest:accept', async (player) => {
    const header = 'Освобождение';
    const lawyerId = unarrests.get(player);
    unarrests.delete(player);
    const lawyer = lawyerId != null ? mint.Player.getByID(lawyerId) : null;
    if (!lawyer?.valid) return notifyError(player, 'Предложение не найдено', header);
    if (!(Number(getSession(player).character?.arrestTime) > 0)) return notifyError(player, 'Вы не отбываете срок', header);
    const price = arrestPrice(player);
    if (!(await removeCash(player, price))) return notifyError(player, `Необходимо $${price}`, header);
    releaseArrest(player);
    notifySuccess(lawyer, `${nameOf(player)} на свободе`, header);
    notifySuccess(player, `${nameOf(lawyer)} освободил вас`, header);
    const pay = Math.trunc(price * 0.05);
    if (pay > 0 && await addCash(lawyer, pay)) notifyInfo(lawyer, `+ $${pay}`, header);
  });

  mint.onClient('crp:gov:unarrest:cancel', (player) => {
    const lawyerId = unarrests.get(player);
    if (lawyerId == null) return;
    unarrests.delete(player);
    const lawyer = mint.Player.getByID(lawyerId);
    if (lawyer?.valid) notifyInfo(lawyer, `${nameOf(player)} отклонил предложение`, 'Освобождение');
  });
}
