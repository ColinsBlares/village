import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { getSession, type DbRow } from '../player/session.js';
import { notifyError, notifySuccess } from '../ui/notify.js';
import { addBank, addCash } from '../world/money.js';

const MINUTES = 10 * 60;

function giftCount(row: DbRow): number {
  const raw = typeof row.getDataValue === 'function' ? row.getDataValue('data') : row.data;
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) as { count?: number } : raw as { count?: number };
    return Math.max(0, Math.trunc(Number(data?.count) || 0));
  } catch {
    return 0;
  }
}

export async function checkPromocode(player: mint.Player): Promise<void> {
  const character = getSession(player).character;
  if (!character || character.inviteCompleted || !character.inviterId) return;
  if ((Number(character.minutes) || 0) < MINUTES) return;
  const promo = (await table('Promocode').findOne({ where: { characterId: character.inviterId } })) as DbRow | null;
  const reward = promo ? (await table('PromocodeReward').findOne({ where: { id: promo.rewardId } })) as DbRow | null : null;
  if (!promo || !reward) return;
  if ((Number(promo.invited) || 0) <= (Number(promo.completed) || 0)) return;
  const ownerSum = Number(reward.ownerSum) || 0;
  const playerSum = Number(reward.playerSum) || 0;
  if (!(await addBank(player, playerSum))) return;
  const owner = mint.Player.all.find((entry) => entry.valid && Number(getSession(entry).character?.id) === Number(promo.characterId));
  if (owner) await addBank(owner, ownerSum);
  else {
    const row = (await table('Character').findOne({ where: { id: promo.characterId } })) as DbRow | null;
    if (row) {
      row.bank = (Number(row.bank) || 0) + ownerSum;
      await row.save();
    }
  }
  promo.completed = (Number(promo.completed) || 0) + 1;
  await promo.save();
  character.inviteCompleted = 1;
  await character.save();
  notifySuccess(player, `Получена награда за промокод $${playerSum}`, 'Промокод');
  if (owner) notifySuccess(owner, `Награда за ${character.name} $${ownerSum}`, 'Промокод');
}

export function installPromocodes(): void {
  mint.onClient('crp:promo', async (player, raw) => {
    const header = 'Активация промокода';
    const character = getSession(player).character;
    const account = getSession(player).account;
    const code = String(raw ?? '').trim().toUpperCase();
    if (!character || !account || !code) return;
    if (character.inviterId) return notifyError(player, 'Вы уже активировали реферальный промокод', header);
    if ((Number(character.minutes) || 0) > MINUTES) return notifyError(player, `Вы уже проиграли более ${MINUTES} минут`, header);
    const gift = (await table('GiftPromocode').findOne({ where: { promocode: code } })) as DbRow | null;
    if (gift && Number(gift.rewardId) === 1) {
      const count = giftCount(gift);
      if (!count || !(await addCash(player, count))) return notifyError(player, 'Ошибка начисления наличных', header);
      if (typeof gift.destroy === 'function') await gift.destroy();
      notifySuccess(player, 'Подарочный промокод на наличные активирован', header);
      return;
    }
    const promo = (await table('Promocode').findOne({ where: { promocode: code } })) as DbRow | null;
    if (!promo) return notifyError(player, `Промокод ${code} не найден`, header);
    if (Number(promo.characterId) === Number(character.id)) return notifyError(player, 'Нельзя активировать свой промокод', header);
    const owner = (await table('Character').findOne({ where: { id: promo.characterId } })) as DbRow | null;
    if (owner && Number(owner.accountId) === Number(account.id)) return notifyError(player, 'Нельзя активировать промокод от своего аккаунта', header);
    character.inviterId = promo.characterId;
    await character.save();
    promo.invited = (Number(promo.invited) || 0) + 1;
    await promo.save();
    notifySuccess(player, 'Промокод активирован', header);
  });
}
