import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { factionKind, rankNumber } from '../factions/index.js';
import { giveItem, takeItem } from '../inventory/index.js';
import { playAnimation } from '../animations/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess } from '../ui/notify.js';
import { addCash, removeCash } from '../world/money.js';

const roofs = new WeakMap<mint.Player, { sellerId: number; bizId: number; sum: number }>();

function nameOf(player: mint.Player): string {
  return String(getSession(player).character?.name ?? player.name);
}

function mafia(player: mint.Player): boolean {
  return factionKind(Number(getSession(player).character?.factionId) || 0) === 'mafia';
}

function order(player: mint.Player): boolean {
  const kind = factionKind(Number(getSession(player).character?.factionId) || 0);
  return kind === 'mafia' || kind === 'police' || kind === 'fib';
}

function cuffId(player: mint.Player): number {
  const raw = player.getSyncedMeta('crp:cuffs');
  return typeof raw === 'number' && raw > 1 ? raw : 0;
}

async function nearestBiz(player: mint.Player): Promise<DbRow | null> {
  const rows = (await table('Biz').findAll()) as DbRow[];
  let best: DbRow | null = null;
  let dist = 10;
  for (const row of rows) {
    const gap = player.pos.distanceTo(new mint.Vector3(Number(row.x), Number(row.y), Number(row.z)));
    if (gap < dist) {
      dist = gap;
      best = row;
    }
  }
  return best;
}

export function installMafia(): void {
  mint.onClient('crp:mafia:cuffs', async (player, raw) => {
    const header = 'Веревка';
    const data = typeof raw === 'string' ? JSON.parse(raw) as { recId?: number } : {};
    const target = mint.Player.getByID(Number(data.recId));
    if (!target?.valid || !getSession(target).character) return notifyError(player, 'Игрок не найден', header);
    if (player.pos.distanceTo(target.pos) > 5) return notifyError(player, `${nameOf(target)} далеко`, header);
    if (target.vehicle) return notifyError(player, `${nameOf(target)} находится в авто`, header);
    if (!target.getSyncedMeta('crp:cuffs')) {
      if (!mafia(player)) return notifyError(player, 'Вы не член мафии', header);
      const item = await takeItem(player, [54]);
      if (!item) return notifyError(player, 'Веревка не найдена', header);
      target.setSyncedMeta('crp:cuffs', 54);
      target.setClothes(7, Number(getSession(target).character?.gender) === 0 ? 41 : 25, 0, 0);
      playAnimation(target, 'mp_arresting', 'idle', 49);
      notifyInfo(target, `${nameOf(player)} связал вас`, header);
      notifySuccess(player, `${nameOf(target)} связан`, header);
      return;
    }
    if (!order(player)) return notifyError(player, 'Вы не член мафии/порядка', header);
    if (cuffId(target) !== 54) return notifyError(player, `${nameOf(target)} связан не веревкой`, header);
    target.deleteSyncedMeta('crp:cuffs');
    target.deleteSyncedMeta('crp:follow');
    target.setClothes(7, 0, 0, 0);
    mint.emitClient(target, 'crp:follow', 0);
    await giveItem(player, 54);
    notifyInfo(target, `${nameOf(player)} развязал вас`, header);
    notifyInfo(player, `${nameOf(target)} развязан`, header);
  });

  mint.onClient('crp:mafia:bag', async (player, raw) => {
    const header = 'Мешок';
    const data = typeof raw === 'string' ? JSON.parse(raw) as { recId?: number } : {};
    const target = mint.Player.getByID(Number(data.recId));
    if (!target?.valid || !getSession(target).character) return notifyError(player, 'Игрок не найден', header);
    if (player.pos.distanceTo(target.pos) > 5) return notifyError(player, `${nameOf(target)} далеко`, header);
    if (target.vehicle) return notifyError(player, `${nameOf(target)} находится в авто`, header);
    if (target.getSyncedMeta('crp:bag') !== true) {
      if (!mafia(player)) return notifyError(player, 'Вы не член мафии', header);
      const item = await takeItem(player, [55]);
      if (!item) return notifyError(player, 'Мешок не найден', header);
      target.setSyncedMeta('crp:bag', true);
      notifyInfo(target, `${nameOf(player)} надел на вас мешок`, header);
      notifySuccess(player, `${nameOf(target)} с мешком на голове`, header);
      return;
    }
    if (!order(player)) return notifyError(player, 'Вы не член мафии/порядка', header);
    target.deleteSyncedMeta('crp:bag');
    await giveItem(player, 55);
    notifyInfo(target, `${nameOf(player)} снял с вас мешок`, header);
    notifyInfo(player, `${nameOf(target)} без мешка на голове`, header);
  });

  mint.onClient('crp:mafia:follow', (player, rawId) => {
    const header = 'Следование';
    if (!mafia(player)) return notifyError(player, 'Нет прав для использования', header);
    const target = mint.Player.getByID(Number(rawId));
    if (!target?.valid || !getSession(target).character) return notifyError(player, 'Гражданин не найден', header);
    if (target.getSyncedMeta('crp:follow') == null) {
      if (cuffId(target) !== 54) return notifyError(player, `${nameOf(target)} не связан`, header);
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

  mint.onClient('crp:mafia:roof', async (player, raw) => {
    const header = 'Продажа крыши';
    if (!mafia(player) || rankNumber(player) < 8) return notifyError(player, 'Нет прав', header);
    const data = JSON.parse(String(raw ?? '{}')) as { recId?: number; sum?: number };
    const sum = Math.max(100, Math.min(100000, Math.trunc(Number(data.sum) || 0)));
    const target = mint.Player.getByID(Number(data.recId));
    if (!target?.valid || !getSession(target).character) return notifyError(player, 'Игрок не найден', header);
    if (player.pos.distanceTo(target.pos) > 10) return notifyError(player, `${nameOf(target)} далеко`, header);
    if (!mafia(target) || rankNumber(target) < 8) return notifyError(player, `${nameOf(target)} не может купить крышу`, header);
    if (Number(getSession(player).character?.factionId) === Number(getSession(target).character?.factionId)) {
      return notifyError(player, `${nameOf(target)} в вашей мафии`, header);
    }
    const biz = await nearestBiz(player);
    if (!biz) return notifyError(player, 'Необходимо находиться у бизнеса', header);
    if (Number(biz.type) === 10) return notifyError(player, 'Нельзя продать крышу клуба', header);
    if (Number(biz.factionId) !== Number(getSession(player).character?.factionId)) return notifyError(player, `${biz.name} находится не под вашей крышей`, header);
    roofs.set(target, { sellerId: player.id, bizId: Number(biz.id), sum });
    cef(target, `offerDialog.show('mafia_power_sell', ${JSON.stringify({ player: nameOf(player), biz: String(biz.name ?? ''), sum })});`);
  });

  mint.onClient('crp:mafia:roof:accept', async (player) => {
    const header = 'Продажа крыши';
    const offer = roofs.get(player);
    roofs.delete(player);
    if (!offer) return notifyError(player, 'Сделка не найдена', header);
    const seller = mint.Player.getByID(offer.sellerId);
    if (!seller?.valid) return notifyError(player, 'Сделка не найдена', header);
    if (player.pos.distanceTo(seller.pos) > 10) return notifyError(player, `${nameOf(seller)} далеко`, header);
    const biz = (await table('Biz').findOne({ where: { id: offer.bizId } })) as DbRow | null;
    if (!biz) return notifyError(player, 'Бизнес не найден', header);
    if (Number(biz.factionId) !== Number(getSession(seller).character?.factionId)) return notifyError(player, `${biz.name} уже не под этой крышей`, header);
    if (!(await removeCash(player, offer.sum))) return notifyError(player, `Необходимо $${offer.sum}`, header);
    if (!(await addCash(seller, offer.sum))) return;
    biz.factionId = Number(getSession(player).character?.factionId) || 0;
    await biz.save();
    notifySuccess(seller, `Крыша ${biz.name} продана`, header);
    notifySuccess(player, `Крыша ${biz.name} куплена`, header);
  });

  mint.onClient('crp:mafia:roof:cancel', (player) => {
    const offer = roofs.get(player);
    if (!offer) return;
    roofs.delete(player);
    const seller = mint.Player.getByID(offer.sellerId);
    if (seller?.valid) notifyInfo(seller, `${nameOf(player)} отклонил предложение`, 'Продажа крыши');
  });
}
