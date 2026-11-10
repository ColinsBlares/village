import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { getSession, type DbRow } from '../player/session.js';
import { notifyError, notifySuccess } from '../ui/notify.js';
import { checkPassword, hashPassword } from '../auth/password.js';
import { sendMail } from '../core/mail.js';

const WALK = [null, 'move_m@brave', 'move_m@confident', 'move_m@shadyped@a', 'move_m@quick', 'move_m@sad@a', 'move_m@fat@a', 'move_m@drunk@verydrunk'];
const MOOD = [null, 'mood_aiming_1', 'mood_angry_1', 'mood_happy_1', 'mood_stressed_1', 'mood_sulk_1'];
const KEYS = ['spawn', 'chatTimestamp', 'chatSize', 'nicknames', 'hudKeys', 'ghetto', 'walking', 'mood'] as const;
const MAX: Record<(typeof KEYS)[number], number> = {
  spawn: 2,
  chatTimestamp: 1,
  chatSize: 3,
  nicknames: 1,
  hudKeys: 1,
  ghetto: 1,
  walking: WALK.length - 1,
  mood: MOOD.length - 1,
};

const rows = new WeakMap<mint.Player, DbRow>();
const mailCodes = new WeakMap<mint.Player, { email: string; code: string; tries: number }>();
const EMAIL = /^[0-9a-z-_.]+@[0-9a-z-_]{1,}\.[a-z]{1,}$/i;

function clamp(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.trunc(value)));
}

function pushStyle(player: mint.Player, row: DbRow): void {
  const walk = WALK[clamp(Number(row.walking) || 0, WALK.length - 1)];
  const mood = MOOD[clamp(Number(row.mood) || 0, MOOD.length - 1)];
  player.setStreamSyncedMeta('crp:walk', walk ?? '');
  player.setStreamSyncedMeta('crp:mood', mood ?? '');
}

export function setWalkIndex(player: mint.Player, index: number): void {
  const walk = WALK[clamp(index, WALK.length - 1)];
  player.setStreamSyncedMeta('crp:walk', walk ?? '');
}

export function restoreWalk(player: mint.Player): void {
  const row = rows.get(player);
  if (row) pushStyle(player, row);
}

export function settingsPayload(player: mint.Player): Record<string, number> | null {
  const row = rows.get(player);
  if (!row) return null;
  const data: Record<string, number> = {};
  for (const key of KEYS) data[key] = Number(row[key]) || 0;
  return data;
}

export async function applySettings(player: mint.Player): Promise<void> {
  const id = Number(getSession(player).character?.id);
  if (!id) return;
  let row = (await table('CharacterSettings').findOne({ where: { characterId: id } })) as DbRow | null;
  if (!row) row = (await table('CharacterSettings').create({ characterId: id })) as DbRow;
  rows.set(player, row);
  pushStyle(player, row);
}

export function installSettings(): void {
  mint.onClient('crp:settings', async (player, raw) => {
    const row = rows.get(player);
    if (!row) return;
    let modified: Record<string, unknown>;
    try {
      modified = JSON.parse(String(raw ?? '{}')) as Record<string, unknown>;
    } catch {
      return;
    }
    let changed = false;
    for (const key of KEYS) {
      if (modified[key] == null) continue;
      row[key] = clamp(Number(modified[key]), MAX[key]);
      changed = true;
    }
    if (!changed) return;
    await row.save();
    pushStyle(player, row);
  });

  mint.onClient('crp:settings:password', async (player, raw) => {
    const header = 'Смена пароля';
    const account = getSession(player).account;
    let data: { oldPass?: string; newPass?: string };
    try {
      data = JSON.parse(String(raw ?? '{}')) as { oldPass?: string; newPass?: string };
    } catch {
      return;
    }
    const next = String(data.newPass ?? '');
    const prev = String(data.oldPass ?? '');
    if (!account) return;
    if (next.length < 6 || next.length > 20) return notifyError(player, 'Пароль должен состоять из 6-20 символов', header);
    if (!checkPassword(prev, String(account.password ?? ''))) return notifyError(player, 'Старый пароль не совпадает', header);
    if (checkPassword(next, String(account.password ?? ''))) return notifyError(player, 'Новый пароль совпадает со старым', header);
    account.password = hashPassword(next);
    account.passwordDate = new Date();
    await account.save();
    notifySuccess(player, 'Пароль успешно изменен', header);
  });

  mint.onClient('crp:settings:email', async (player, raw) => {
    const header = 'Смена почты';
    const email = String(raw ?? '').trim();
    if (!email || email.length > 40) return notifyError(player, 'Email должен быть менее 40 символов', header);
    if (!EMAIL.test(email)) return notifyError(player, 'Некорректный email', header);
    const exists = (await table('Account').findOne({ where: { email, confirmEmail: 1 } })) as DbRow | null;
    if (exists) return notifyError(player, `Email ${email} занят`, header);
    mailCodes.set(player, { email, code: '', tries: 0 });
    notifySuccess(player, `Подтвердите ${email} кодом из письма`, header);
  });

  mint.onClient('crp:settings:email:code', async (player) => {
    const header = 'Подтверждение почты';
    const account = getSession(player).account;
    const pending = mailCodes.get(player);
    if (!account) return;
    if (Number(account.confirmEmail) && !pending) return notifyError(player, 'Email уже подтвержден', header);
    const email = pending?.email || String(account.email ?? '');
    const exists = (await table('Account').findOne({ where: { email, confirmEmail: 1 } })) as DbRow | null;
    if (exists && Number(exists.id) !== Number(account.id)) return notifyError(player, `Email ${email} занят`, header);
    const code = String(100000 + Math.floor(Math.random() * 900000));
    sendMail(email, 'Подтверждение электронной почты', `Код подтверждения: <b>${code}</b>`);
    mailCodes.set(player, { email, code, tries: 0 });
    notifySuccess(player, `Код подтверждения отправлен на ${email}`, header);
  });

  mint.onClient('crp:settings:email:check', async (player, raw) => {
    const header = 'Подтверждение почты';
    const account = getSession(player).account;
    const pending = mailCodes.get(player);
    if (!account) return;
    if (Number(account.confirmEmail) && !pending?.code) return notifyError(player, 'Email уже подтвержден', header);
    if (!pending?.code) return notifyError(player, 'Код подтверждения не найден', header);
    pending.tries += 1;
    if (pending.tries > 5) {
      mailCodes.delete(player);
      return notifyError(player, 'Превышено число попыток', header);
    }
    if (String(raw ?? '') !== pending.code) return notifyError(player, 'Неверный код подтверждения', header);
    account.email = pending.email;
    account.confirmEmail = 1;
    await account.save();
    mailCodes.delete(player);
    notifySuccess(player, 'Email успешно подтвержден', header);
  });
}
