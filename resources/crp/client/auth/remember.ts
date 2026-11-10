import * as mint from 'mint-client';

const KEY = 'auth.remember';

interface SavedLogin {
  login: string;
  password: string;
}

let pending: { login: string; password: string; remember: boolean } | null = null;
let filled = false;

export function noteLogin(raw: string): void {
  try {
    const data = JSON.parse(raw) as { loginOrEmail?: string; login?: string; password?: string; rememberMe?: boolean };
    pending = {
      login: String(data.loginOrEmail ?? data.login ?? ''),
      password: String(data.password ?? ''),
      remember: data.rememberMe === true,
    };
  } catch {
    pending = null;
  }
}

export function commitRemember(): void {
  if (!pending) return;
  if (pending.remember && pending.login && pending.password) {
    mint.LocalStorage.set(KEY, JSON.stringify({ login: pending.login, password: pending.password }));
  } else {
    mint.LocalStorage.delete(KEY);
  }
  mint.LocalStorage.save();
  pending = null;
}

export function clearRemember(): void {
  pending = null;
  mint.LocalStorage.delete(KEY);
  mint.LocalStorage.save();
}

function savedLogin(): SavedLogin | null {
  const raw = mint.LocalStorage.get(KEY);
  if (typeof raw !== 'string') return null;
  try {
    const data = JSON.parse(raw) as SavedLogin;
    if (!data.login || !data.password) return null;
    return data;
  } catch {
    return null;
  }
}

/** Подставляет логин и пароль и сразу входит, как auth.init в Rage. */
export function fillRemembered(): string | null {
  const saved = savedLogin();
  if (!saved || filled) return null;
  filled = true;
  const body = JSON.stringify({ loginOrEmail: saved.login, password: saved.password, rememberMe: true });
  noteLogin(body);
  mint.setTimeout(() => {
    mint.emitServer('crp:auth:login', body);
  }, 600);
  return `auth.loginOrEmail = ${JSON.stringify(saved.login)}; auth.password = ${JSON.stringify(saved.password)}; auth.rememberMe = true;`;
}
