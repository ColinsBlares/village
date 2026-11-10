import * as mint from 'mint-server';
import { allowHeal } from '../anticheat/index.js';
import { table } from '../core/db.js';
import { factionInfo, factionKind, rankNumber } from '../factions/index.js';
import { sendInventory } from '../inventory/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess } from '../ui/notify.js';
import { addCash, removeCash } from '../world/money.js';

const PRICE = 1;
const CARD_DAYS = 30;
const heals = new WeakMap<mint.Player, { medicId: number; health: number }>();

function nameOf(player: mint.Player): string {
  return String(getSession(player).character?.name ?? player.name);
}

async function medkit(player: mint.Player): Promise<DbRow | null> {
  const character = getSession(player).character;
  if (!character) return null;
  for (const itemId of [24, 27]) {
    const row = (await table('CharacterInventory').findOne({
      where: { playerId: character.id, itemId },
      include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
    })) as DbRow | null;
    if (row) return row;
  }
  return null;
}

function countOf(item: DbRow): { param: DbRow | null; value: number } {
  const list = (item.params ?? item.CharacterInventoryParams ?? []) as DbRow[];
  const param = list.find((row) => row.key === 'count') ?? null;
  return { param, value: Number(param?.value) || 0 };
}

async function spend(player: mint.Player, item: DbRow): Promise<boolean> {
  const count = countOf(item);
  if (!count.value) return false;
  if (count.value <= 1) {
    if (typeof item.destroy === 'function') await item.destroy();
  } else if (count.param) {
    count.param.value = String(count.value - 1);
    await count.param.save();
  }
  await sendInventory(player);
  return true;
}

export function installHospital(): void {
  mint.onClient('crp:hospital:heal', async (player, rawId) => {
    const header = 'Лечение';
    if (factionKind(Number(getSession(player).character?.factionId) || 0) !== 'hospital') return notifyError(player, 'Вы не медик', header);
    const target = mint.Player.getByID(Number(rawId));
    if (!target?.valid || !getSession(target).character) return notifyError(player, 'Игрок не найден', header);
    if (target.getSyncedMeta('crp:knocked') != null) return notifyError(player, `${nameOf(target)} нуждается в реанимации`, header);
    if (player.pos.distanceTo(target.pos) > 10) return notifyError(player, `${nameOf(target)} далеко`, header);
    const missing = Math.max(0, 100 - Math.min(100, target.health));
    if (!missing) return notifyError(player, `${nameOf(target)} полностью здоров`, header);
    const kit = await medkit(player);
    if (!kit || !countOf(kit).value) return notifyError(player, 'Аптечка не найдена', header);
    heals.set(target, { medicId: player.id, health: missing });
    cef(target, `offerDialog.show('hospital_healing', ${JSON.stringify({ name: nameOf(player), price: missing * PRICE })});`);
    notifySuccess(player, `Вы предложили игроку с ID: ${target.id} вылечиться`, header);
  });

  mint.onClient('crp:hospital:heal:accept', async (player) => {
    const header = 'Лечение';
    const offer = heals.get(player);
    heals.delete(player);
    if (!offer) return notifyError(player, 'Приглашение не найдено', header);
    const medic = mint.Player.getByID(offer.medicId);
    if (!medic?.valid || !getSession(medic).character) return notifyError(player, 'Медик не найден', header);
    if (player.pos.distanceTo(medic.pos) > 10) return notifyError(player, `${nameOf(medic)} далеко`, header);
    if (factionKind(Number(getSession(medic).character?.factionId) || 0) !== 'hospital') return notifyError(player, `${nameOf(medic)} не медик`, header);
    if (player.health >= 100) return notifyError(player, 'Вы полностью здоровы', header);
    const price = offer.health * PRICE;
    const kit = await medkit(medic);
    if (!kit || !countOf(kit).value) return notifyError(medic, 'Аптечка не найдена', header);
    if (!(await removeCash(player, price))) return notifyError(player, `Необходимо $${price}`, header);
    if (!(await addCash(medic, price))) return;
    if (!(await spend(medic, kit))) return notifyError(medic, 'Количество: 0 ед.', header);
    allowHeal(player);
    player.health = Math.max(1, Math.min(100, player.health + offer.health));
    notifySuccess(medic, `${nameOf(player)} вылечился`, header);
    notifySuccess(player, `${nameOf(medic)} вас вылечил`, header);
  });

  mint.onClient('crp:hospital:heal:cancel', (player) => {
    const offer = heals.get(player);
    if (!offer) return;
    heals.delete(player);
    const medic = mint.Player.getByID(offer.medicId);
    notifyInfo(player, 'Предложение отклонено', 'Лечение');
    if (medic?.valid) notifyInfo(medic, `${nameOf(player)} отклонил предложение`, 'Лечение');
  });

  mint.onClient('crp:hospital:card', async (player, raw) => {
    const header = 'Медкарта';
    const factionId = Number(getSession(player).character?.factionId) || 0;
    if (factionKind(factionId) !== 'hospital') return notifyError(player, 'Вы не медик', header);
    const need = factionInfo(factionId)?.ranks.find((rank) => rank.rank === 5);
    if (rankNumber(player) < 5) return notifyError(player, `Доступно с ранга ${need?.name ?? 5}`, header);
    const data = typeof raw === 'string' ? JSON.parse(raw) as { recId?: number } : { recId: Number(raw) };
    const target = mint.Player.getByID(Number(data.recId));
    const character = target ? getSession(target).character : null;
    if (!target?.valid || !character) return notifyError(player, 'Игрок не найден', header);
    const extend = !!character.medCardDate;
    character.medCardDate = new Date(Date.now() + CARD_DAYS * 24 * 60 * 60 * 1000);
    await character.save();
    notifySuccess(player, extend ? `Медкарта ${nameOf(target)} продлена` : `Медкарта выдана ${nameOf(target)}`, header);
    notifyInfo(target, extend ? `${nameOf(player)} продлил вам медкарту` : `${nameOf(player)} выдал вам медкарту`, header);
  });
}
