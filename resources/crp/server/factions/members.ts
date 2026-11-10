import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { clearJob } from '../jobs/index.js';
import { pushFaction, pushFactionRank } from '../player/menu.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess } from '../ui/notify.js';
import { removeCash } from '../world/money.js';
import { factionInfo, openFaction } from './index.js';

interface Offer {
  type: 'invite' | 'cash';
  inviterId: number;
  factionId: number;
  sum?: number;
}

const offers = new WeakMap<mint.Player, Offer>();

function nameOf(player: mint.Player): string {
  return String(getSession(player).character?.name ?? player.name);
}

function rankOf(factionId: number, rankId: number): { id: number; rank: number; name: string } | undefined {
  return factionInfo(factionId)?.ranks.find((rank) => rank.id === rankId);
}

function rankByNumber(factionId: number, number: number): { id: number; rank: number; name: string } | undefined {
  return factionInfo(factionId)?.ranks.find((rank) => rank.rank === number);
}

function lowest(factionId: number): { id: number; rank: number; name: string } | undefined {
  const ranks = factionInfo(factionId)?.ranks ?? [];
  return ranks.slice().sort((a, b) => a.rank - b.rank)[0];
}

function can(player: mint.Player, field: 'inviteRank' | 'uvalRank' | 'giveRankRank'): boolean {
  const character = getSession(player).character;
  const faction = factionInfo(Number(character?.factionId) || 0);
  const rank = rankOf(faction?.id ?? 0, Number(character?.factionRank) || 0);
  if (!faction || !rank) return false;
  return rank.rank >= faction[field];
}

function distance(left: mint.Player, right: mint.Player): number {
  return Math.hypot(left.pos.x - right.pos.x, left.pos.y - right.pos.y, left.pos.z - right.pos.z);
}

async function join(player: mint.Player, factionId: number): Promise<void> {
  const character = getSession(player).character;
  const faction = factionInfo(factionId);
  const rank = lowest(factionId);
  if (!character || !faction || !rank) return;
  if (Number(character.job)) clearJob(player, faction.name);
  character.factionId = faction.id;
  character.factionRank = rank.id;
  await character.save();
  await openFaction(player);
  pushFaction(player);
}

export function installFactionMembers(): void {
  mint.onClient('crp:faction:invite', (player, rawId) => {
    const target = mint.Player.getByID(Number(rawId));
    const character = getSession(player).character;
    const faction = factionInfo(Number(character?.factionId) || 0);
    if (!target?.valid || !getSession(target).character) return notifyError(player, `Игрок #${rawId} не найден`, 'Приглашение');
    if (distance(player, target) > 10) return notifyError(player, `${nameOf(target)} далеко`, 'Приглашение');
    if (getSession(target).character?.factionId) return notifyError(player, `${nameOf(target)} уже в организации`, 'Приглашение');
    if (getSession(target).character?.warnNumber) return notifyError(player, `${nameOf(target)} имеет варн`, 'Приглашение');
    if (!faction) return notifyError(player, 'Вы не состоите в организации', 'Приглашение');
    if (!can(player, 'inviteRank')) return notifyError(player, 'Недостаточно прав', 'Приглашение');
    offers.set(target, { type: 'invite', inviterId: player.id, factionId: faction.id });
    cef(target, `offerDialog.show('faction_invite', ${JSON.stringify({ name: nameOf(player), faction: faction.name })});`);
  });
  mint.onClient('crp:faction:invite:accept', async (player) => {
    const offer = offers.get(player);
    if (!offer || offer.type !== 'invite') return notifyError(player, 'Приглашение не найдено', 'Организация');
    offers.delete(player);
    const inviter = mint.Player.getByID(offer.inviterId);
    if (!inviter?.valid || !getSession(inviter).character) return notifyError(player, 'Пригласивший не найден', 'Приглашение');
    if (distance(player, inviter) > 10) return notifyError(player, `${nameOf(inviter)} далеко`, 'Приглашение');
    if (getSession(player).character?.factionId) return notifyError(player, 'Вы уже в организации', 'Приглашение');
    if (!can(inviter, 'inviteRank')) return notifyError(player, `У ${nameOf(inviter)} недостаточно прав`, 'Приглашение');
    const faction = factionInfo(offer.factionId);
    if (!faction) return;
    await join(player, faction.id);
    notifySuccess(inviter, `${nameOf(player)} вступил в организацию`, faction.name);
    notifySuccess(player, 'Добро пожаловать', faction.name);
  });
  mint.onClient('crp:faction:invite:cancel', (player) => {
    const offer = offers.get(player);
    if (!offer) return;
    offers.delete(player);
    const inviter = mint.Player.getByID(offer.inviterId);
    notifyInfo(player, 'Предложение отклонено', 'Организация');
    if (inviter?.valid) notifyInfo(inviter, `${nameOf(player)} отклонил предложение`, 'Организация');
  });
  mint.onClient('crp:faction:uval', async (player, rawId) => {
    const target = mint.Player.getByID(Number(rawId));
    const mine = getSession(player).character;
    const theirs = target ? getSession(target).character : null;
    if (!target?.valid || !theirs) return notifyError(player, `Игрок #${rawId} не найден`, 'Увольнение');
    if (!mine?.factionId) return notifyError(player, 'Вы не состоите в организации', 'Увольнение');
    if (Number(theirs.factionId) !== Number(mine.factionId)) return notifyError(player, `${nameOf(target)} не вашей организации`, 'Увольнение');
    if (Number(mine.factionRank) <= Number(theirs.factionRank)) return notifyError(player, `${nameOf(target)} должен иметь ниже ранг`, 'Увольнение');
    if (!can(player, 'uvalRank')) return notifyError(player, 'Недостаточно прав', 'Увольнение');
    theirs.factionId = null;
    theirs.factionRank = null;
    await theirs.save();
    cef(target, 'mapCase.enable = false;');
    pushFaction(target);
    notifySuccess(player, `${nameOf(target)} уволен`, 'Организация');
    notifyInfo(target, `${nameOf(player)} вас уволил`, 'Организация');
  });
  mint.onClient('crp:faction:rank:show', (player, rawId) => {
    const target = mint.Player.getByID(Number(rawId));
    const mine = getSession(player).character;
    const theirs = target ? getSession(target).character : null;
    const faction = factionInfo(Number(mine?.factionId) || 0);
    if (!target?.valid || !theirs || !faction) return notifyError(player, 'Игрок не найден', 'Ранг организации');
    if (distance(player, target) > 10) return notifyError(player, `${nameOf(target)} далеко`, 'Ранг организации');
    if (!can(player, 'giveRankRank')) return notifyError(player, 'Недостаточно прав', 'Ранг организации');
    if (Number(theirs.factionId) !== Number(mine?.factionId)) return notifyError(player, `${nameOf(target)} не вашей организации`, 'Ранг организации');
    if (Number(theirs.factionRank) >= Number(mine?.factionRank)) return notifyError(player, `Недоступно для ${nameOf(target)}`, 'Ранг организации');
    const names = faction.ranks.slice().sort((a, b) => a.rank - b.rank).map((rank) => rank.name);
    const current = rankOf(faction.id, Number(theirs.factionRank))?.rank ?? 1;
    cef(player, [
      `selectMenu.setItemValues('factionGiveRank', 'Ранг', ${JSON.stringify(JSON.stringify(names))});`,
      `selectMenu.menus['factionGiveRank'].header = ${JSON.stringify(faction.name)};`,
      `selectMenu.menus['factionGiveRank'].items[0].i = ${Math.max(0, current - 1)};`,
      `selectMenu.menus['factionGiveRank'].playerId = ${target.id};`,
      `selectMenu.showByName('factionGiveRank');`,
    ].join('\n'));
  });
  mint.onClient('crp:faction:rank', async (player, raw) => {
    const parsed = JSON.parse(String(raw ?? '[]')) as { id?: number; rank?: number } | unknown[];
    const targetId = Array.isArray(parsed) ? Number(parsed[0]) : Number(parsed.id);
    const rankNumber = Array.isArray(parsed) ? Number(parsed[1]) : Number(parsed.rank);
    const target = mint.Player.getByID(targetId);
    const mine = getSession(player).character;
    const theirs = target ? getSession(target).character : null;
    if (!target?.valid || !theirs || !mine?.factionId) return notifyError(player, 'Игрок не найден', 'Ранг организации');
    if (distance(player, target) > 10) return notifyError(player, `${nameOf(target)} далеко`, 'Ранг организации');
    if (!can(player, 'giveRankRank')) return notifyError(player, 'Недостаточно прав', 'Ранг организации');
    if (Number(theirs.factionId) !== Number(mine.factionId)) return notifyError(player, `${nameOf(target)} не вашей организации`, 'Ранг организации');
    if (Number(theirs.factionRank) >= Number(mine.factionRank)) return notifyError(player, `Недоступно для ${nameOf(target)}`, 'Ранг организации');
    const next = rankByNumber(Number(mine.factionId), rankNumber);
    if (!next) return notifyError(player, 'Ранг не найден', 'Ранг организации');
    if (next.id >= Number(mine.factionRank)) return notifyError(player, 'Нельзя повысить до своего ранга или выше', 'Ранг организации');
    const up = next.id > Number(theirs.factionRank);
    theirs.factionRank = next.id;
    await theirs.save();
    pushFactionRank(target);
    notifyInfo(target, `${nameOf(player)} ${up ? 'повысил' : 'понизил'} вас до ${next.name}`, up ? 'Повышение' : 'Понижение');
    notifySuccess(player, `${nameOf(target)} ${up ? 'повышен' : 'понижен'} до ${next.name}`, up ? 'Повышение' : 'Понижение');
  });
  mint.onClient('crp:faction:cash', (player, raw) => {
    const data = JSON.parse(String(raw ?? '{}')) as { playerId?: number; sum?: number };
    const sum = Math.max(0, Math.min(1000000, Math.trunc(Number(data.sum) || 0)));
    const target = mint.Player.getByID(Number(data.playerId));
    const faction = factionInfo(Number(getSession(player).character?.factionId) || 0);
    if (!faction) return notifyError(player, 'Вы не состоите в организации', 'Чек на пополнение общака');
    if (!target?.valid || target.id === player.id) return notifyError(player, 'Игрок не найден', 'Чек на пополнение общака');
    if (distance(player, target) > 10) return notifyError(player, `${nameOf(target)} далеко`, 'Чек на пополнение общака');
    offers.set(target, { type: 'cash', inviterId: player.id, factionId: faction.id, sum });
    cef(target, `offerDialog.show('faction_cash_check', ${JSON.stringify({ name: faction.name, sum })});`);
    notifySuccess(player, `Предложение ${nameOf(target)} отправлено`, 'Чек на пополнение общака');
  });
  mint.onClient('crp:faction:cash:accept', async (player) => {
    const offer = offers.get(player);
    if (!offer || offer.type !== 'cash') return notifyError(player, 'Предложение не найдено');
    offers.delete(player);
    const sum = offer.sum ?? 0;
    if (!(await removeCash(player, sum))) return notifyError(player, `Необходимо $${sum}`, 'Чек на пополнение общака');
    const row = (await table('Faction').findOne({ where: { id: offer.factionId } })) as DbRow | null;
    if (row) {
      row.cash = (Number(row.cash) || 0) + sum;
      await row.save();
    }
    const faction = factionInfo(offer.factionId);
    notifySuccess(player, `Вы пополнили общак ${faction?.name ?? ''}`, 'Чек на пополнение общака');
    const inviter = mint.Player.getByID(offer.inviterId);
    if (inviter?.valid && distance(player, inviter) <= 50) {
      notifySuccess(inviter, `${nameOf(player)} пополнил общак на сумму $${sum}`, 'Чек на пополнение общака');
    }
  });
  mint.onClient('crp:faction:cash:cancel', (player) => {
    const offer = offers.get(player);
    if (!offer || offer.type !== 'cash') return;
    offers.delete(player);
    notifyInfo(player, 'Предложение отклонено', 'Чек');
    const inviter = mint.Player.getByID(offer.inviterId);
    if (inviter?.valid) notifyInfo(inviter, `${nameOf(player)} отклонил предложение`, 'Чек');
  });
}
