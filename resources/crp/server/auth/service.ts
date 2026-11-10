import * as mint from 'mint-server';
import { db, table } from '../core/db.js';
import { writeCrash } from '../core/log.js';
import { getSession, type DbRow } from '../player/session.js';
import { openCharacters } from '../character/service.js';
import { cef } from '../ui/send.js';
import { blockedReason } from '../anticheat/index.js';
import { sendMail } from '../core/mail.js';
import { checkPassword, hashPassword } from './password.js';

function loginResult(player: mint.Player, code: number): void {
  cef(player, `auth.showLoginResult(${code});`);
}

function registerResult(player: mint.Player, code: number): void {
  cef(player, `auth.showRegisterResult(${code});`);
}

function recoveryResult(player: mint.Player, code: number): void {
  cef(player, `loader.show = false; auth.showRecoveryResult(${code});`);
}

function mailCode(): number {
  return 100000 + Math.floor(Math.random() * 900000);
}

const LOGIN = /^[0-9a-z_\.-]{5,20}$/i;
const EMAIL = /^[0-9a-z-_\.]+\@[0-9a-z-_]{1,}\.[a-z]{1,}$/i;
const attempts = new Map<string, { count: number; resetAt: number }>();
const emailCodes = new Map<string, number>();
const recoveryCooldown = new Map<string, number>();
const recovery = new WeakMap<mint.Player, { code: number | null; account: DbRow; access: boolean; attempts: number }>();

interface Operators {
  or: symbol;
}

function op(): Operators {
  return db.Op as Operators;
}

/** Rockstar id. В Rage это rgscId, в MiNT то же значение в socialID. */
export function socialOf(player: mint.Player): string {
  const id = player.socialID?.trim();
  if (id) return id;
  return player.socialClubName?.trim() ?? '';
}

function allowAttempt(key: string): boolean {
  const now = Date.now();
  let rec = attempts.get(key);
  if (!rec || now > rec.resetAt) rec = { count: 0, resetAt: now + 10 * 60 * 1000 };
  rec.count += 1;
  attempts.set(key, rec);
  return rec.count <= 10;
}

function accountOnline(id: number, except: mint.Player): boolean {
  for (const other of mint.Player.all) {
    if (other === except || !other.valid) continue;
    if (getSession(other).account?.id === id) return true;
  }
  return false;
}

export async function beginAuth(player: mint.Player): Promise<void> {
  if (!player.valid) return;
  if (db.models.Ban) {
    const social = socialOf(player);
    const ban = (await table('Ban').findOne({
      where: {
        [op().or]: [{ ip: player.ip }, { socialClub: social }, { serial: player.hwidHash }],
      },
    })) as DbRow | null;
    if (!player.valid) return;
    if (ban) {
      player.kick(`Вы заблокированы (${ban.reason || '-'})`);
      return;
    }
  }
  const cheat = blockedReason(player);
  if (cheat) {
    player.kick(`Вы заблокированы (${cheat})`);
    return;
  }
  cef(player, 'auth.show = true;');
}

function accept(player: mint.Player, account: DbRow): void {
  const session = getSession(player);
  session.account = account;
  account.lastIp = player.ip;
  account.lastDate = new Date();
  void account.save().catch((err: unknown) => writeCrash('auth.last', err));
  loginResult(player, 7);
  void openCharacters(player).catch((err: unknown) => writeCrash('auth.characters', err));
}

export async function login(player: mint.Player, raw: string): Promise<void> {
  const session = getSession(player);
  if (session.account) return loginResult(player, 6);
  if (!allowAttempt(player.ip || socialOf(player))) return loginResult(player, 4);

  let data: { login?: string; loginOrEmail?: string; password?: string };
  try {
    data = JSON.parse(raw) as { login?: string; loginOrEmail?: string; password?: string };
  } catch {
    return loginResult(player, 0);
  }
  const loginOrEmail = String(data.loginOrEmail ?? data.login ?? '').trim().toLowerCase();
  const password = String(data.password ?? '');
  if (!loginOrEmail) return loginResult(player, 0);
  if (!LOGIN.test(loginOrEmail) && !EMAIL.test(loginOrEmail)) return loginResult(player, 1);
  if (password.length < 6 || password.length > 20) return loginResult(player, 2);

  const account = (await table('Account').findOne({
    where: {
      [op().or]: [{ login: loginOrEmail }, { email: loginOrEmail, confirmEmail: 1 }],
    },
  })) as DbRow | null;
  if (!account || !checkPassword(password, String(account.password))) return loginResult(player, 4);
  if (String(account.socialClub) !== socialOf(player)) return loginResult(player, 5);
  if (accountOnline(account.id, player)) return loginResult(player, 6);
  if (account.clearBanDate && Date.now() < new Date(account.clearBanDate as string).getTime()) {
    return loginResult(player, 8);
  }
  if (account.clearBanDate) {
    account.clearBanDate = null;
    await account.save();
  }
  accept(player, account);
}

export async function register(player: mint.Player, raw: string): Promise<void> {
  const session = getSession(player);
  if (session.registered || session.account) return registerResult(player, 0);
  let data: { login?: string; email?: string; password?: string };
  try {
    data = JSON.parse(raw) as { login?: string; email?: string; password?: string };
  } catch {
    return registerResult(player, 1);
  }
  const loginName = String(data.login ?? '').trim().toLowerCase();
  const email = String(data.email ?? '').trim().toLowerCase();
  const password = String(data.password ?? '');
  if (loginName.length < 5 || loginName.length > 20) return registerResult(player, 1);
  if (password.length < 6 || password.length > 20) return registerResult(player, 2);
  if (!email || email.length > 40) return registerResult(player, 3);
  if (!LOGIN.test(loginName)) return registerResult(player, 4);
  if (!EMAIL.test(email)) return registerResult(player, 5);

  const social = socialOf(player);
  if (!social) return registerResult(player, 8);

  const taken = (await table('Account').findOne({
    where: {
      [op().or]: [{ login: loginName }, { socialClub: social }, { email, confirmEmail: 1 }],
    },
  })) as DbRow | null;
  if (taken) {
    if (taken.login === loginName) return registerResult(player, 6);
    if (taken.email === email && taken.confirmEmail) return registerResult(player, 7);
    return registerResult(player, 8);
  }

  const account = (await table('Account').create({
    login: loginName,
    socialClub: social,
    password: hashPassword(password),
    email,
    regIp: player.ip,
    lastIp: player.ip,
    confirmEmail: 0,
  })) as DbRow;
  session.account = account;
  session.registered = true;
  registerResult(player, 9);
}

export function sendEmailCode(player: mint.Player): void {
  const account = getSession(player).account;
  if (!account?.email) return;
  const code = mailCode();
  emailCodes.set(String(account.email).toLowerCase(), code);
  sendMail(String(account.email), 'Подтверждение электронной почты', `Код подтверждения: <b>${code}</b>`);
  cef(player, 'loader.show = false;');
}

export async function confirmEmailCode(player: mint.Player, raw: string): Promise<void> {
  const account = getSession(player).account;
  if (!account) return;
  const email = String(account.email ?? '').toLowerCase();
  const code = Number.parseInt(raw, 10);
  if (emailCodes.get(email) !== code) {
    cef(player, 'loader.show = false; auth.showEmailConfirmResult(0);');
    return;
  }
  emailCodes.delete(email);
  account.confirmEmail = 1;
  await account.save();
  cef(player, 'loader.show = false; auth.showEmailConfirmResult(1);');
  await continueAuth(player);
}

export async function recoverAccount(player: mint.Player, loginOrEmail: string): Promise<void> {
  const value = loginOrEmail.trim();
  if (!value) return recoveryResult(player, 0);
  if (!LOGIN.test(value) && !EMAIL.test(value)) return recoveryResult(player, 1);
  const account = (await table('Account').findOne({
    where: {
      [op().or]: [{ login: value }, { email: value, confirmEmail: 1 }],
    },
  })) as DbRow | null;
  if (!account || String(account.socialClub) !== socialOf(player)) return recoveryResult(player, 2);
  const key = player.ip || value;
  if (Date.now() - (recoveryCooldown.get(key) ?? 0) < 60000) return recoveryResult(player, 0);
  recoveryCooldown.set(key, Date.now());
  const code = mailCode();
  sendMail(String(account.email), 'Восстановление аккаунта', `Код подтверждения: <b>${code}</b>`);
  recovery.set(player, { code, account, access: false, attempts: 0 });
  recoveryResult(player, 3);
}

export function confirmRecovery(player: mint.Player, raw: string): void {
  const current = recovery.get(player);
  if (!current || current.code == null) return recoveryResult(player, 4);
  const code = Number.parseInt(raw, 10);
  if (current.code !== code) {
    current.attempts += 1;
    if (current.attempts >= 5) {
      recovery.delete(player);
      recoveryResult(player, 9);
      player.kick('Превышено количество попыток');
      return;
    }
    return recoveryResult(player, 4);
  }
  current.code = null;
  current.access = true;
  recoveryResult(player, 5);
}

export async function finishRecovery(player: mint.Player, password: string): Promise<void> {
  if (!password || password.length < 6 || password.length > 20) return recoveryResult(player, 6);
  const current = recovery.get(player);
  if (!current?.access) return recoveryResult(player, 7);
  current.account.password = hashPassword(password);
  await current.account.save();
  recovery.delete(player);
  recoveryResult(player, 8);
}

export async function continueAuth(player: mint.Player): Promise<void> {
  const session = getSession(player);
  if (!session.account || session.authDone) return;
  session.authDone = true;
  await openCharacters(player);
}

