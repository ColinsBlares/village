import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess } from '../ui/notify.js';
import { installFamilyControl, syncFamily } from './control.js';

const offers = new WeakMap<mint.Player, number>();

function nameOf(player: mint.Player): string {
  return String(getSession(player).character?.name ?? player.name);
}

function maxMembers(level: number): number {
  return 30 + (Math.max(1, level) - 1) * 10;
}

async function ranksOf(familyId: number): Promise<DbRow[]> {
  return (await table('FamilyRank').findAll({ where: { familyId } })) as DbRow[];
}

export function installFamily(): void {
  installFamilyControl();
  mint.onClient('crp:family:invite', async (player, rawId) => {
    const header = 'Приглашение в семью';
    const mine = getSession(player).character;
    const familyId = Number(mine?.familyId) || 0;
    if (!familyId) return notifyError(player, 'Вы не состоите в семье', header);
    const target = mint.Player.getByID(Number(rawId));
    if (!target?.valid || !getSession(target).character) return notifyError(player, 'Игрок не найден', header);
    if (player.pos.distanceTo(target.pos) > 10) return notifyError(player, `${nameOf(target)} далеко`, header);
    if (Number(getSession(target).character?.familyId)) return notifyError(player, `${nameOf(target)} уже в семье`, header);
    const family = (await table('Family').findOne({ where: { id: familyId } })) as DbRow | null;
    if (!family) return notifyError(player, 'Семья не найдена', header);
    const ranks = await ranksOf(familyId);
    const mineRank = ranks.find((rank) => Number(rank.id) === Number(mine?.familyRank));
    if ((Number(mineRank?.rank) || 0) < (Number(family.inviteRank) || 3)) return notifyError(player, 'Недостаточно прав', header);
    const members = (await table('Character').findAll({ where: { familyId } })) as DbRow[];
    const limit = maxMembers(Number(family.level) || 1);
    if (members.length >= limit) return notifyError(player, `Достигнут лимит участников (${limit})`, header);
    offers.set(target, player.id);
    cef(target, `offerDialog.show('family_invite', ${JSON.stringify({ name: nameOf(player), family: `${family.name} [${family.tag}]` })});`);
    notifySuccess(player, `Приглашение отправлено ${nameOf(target)}`, header);
  });

  mint.onClient('crp:family:invite:accept', async (player) => {
    const header = 'Семья';
    const inviterId = offers.get(player);
    offers.delete(player);
    const inviter = inviterId != null ? mint.Player.getByID(inviterId) : null;
    const familyId = Number(getSession(inviter ?? player).character?.familyId) || 0;
    if (!inviter?.valid || !familyId) return notifyError(player, 'Приглашение не найдено', header);
    if (player.pos.distanceTo(inviter.pos) > 10) return notifyError(player, `${nameOf(inviter)} далеко`, header);
    if (Number(getSession(player).character?.familyId)) return notifyError(player, 'Вы уже в семье', header);
    const family = (await table('Family').findOne({ where: { id: familyId } })) as DbRow | null;
    if (!family) return notifyError(player, 'Семья не найдена', header);
    const ranks = await ranksOf(familyId);
    const mineRank = ranks.find((rank) => Number(rank.id) === Number(getSession(inviter).character?.familyRank));
    if ((Number(mineRank?.rank) || 0) < (Number(family.inviteRank) || 3)) return notifyError(player, `У ${nameOf(inviter)} недостаточно прав`, header);
    const members = (await table('Character').findAll({ where: { familyId } })) as DbRow[];
    if (members.length >= maxMembers(Number(family.level) || 1)) return notifyError(player, 'Достигнут лимит участников', header);
    const character = getSession(player).character;
    const lowest = ranks.slice().sort((a, b) => Number(a.rank) - Number(b.rank))[0];
    if (!character || !lowest) return;
    character.familyId = familyId;
    character.familyRank = lowest.id;
    await character.save();
    notifySuccess(inviter, `${nameOf(player)} вступил в семью`, String(family.name));
    notifySuccess(player, `Добро пожаловать в семью ${family.name}`, header);
    await syncFamily(player);
  });

  mint.onClient('crp:family:invite:cancel', (player) => {
    const inviterId = offers.get(player);
    if (inviterId == null) return;
    offers.delete(player);
    const inviter = mint.Player.getByID(inviterId);
    notifyInfo(player, 'Приглашение отклонено', 'Семья');
    if (inviter?.valid) notifyInfo(inviter, `${nameOf(player)} отклонил приглашение`, 'Семья');
  });
}
