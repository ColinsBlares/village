import type * as mint from 'mint-server';

/** Строка Sequelize. Поля моделей читаются напрямую. */
export interface DbRow {
  id: number;
  save(): Promise<unknown>;
  destroy(): Promise<unknown>;
  [key: string]: any;
}

export interface Session {
  initSent: boolean;
  pendingInit: boolean;
  account: DbRow | null;
  character: DbRow | null;
  characters: DbRow[];
  registered: boolean;
  authDone: boolean;
  creating: boolean;
  spawnedAt: number;
}

const sessions = new WeakMap<mint.Player, Session>();

export function getSession(player: mint.Player): Session {
  let session = sessions.get(player);
  if (!session) {
    session = {
      initSent: false,
      pendingInit: false,
      account: null,
      character: null,
      characters: [],
      registered: false,
      authDone: false,
      creating: false,
      spawnedAt: 0,
    };
    sessions.set(player, session);
  }
  return session;
}

export function isAdmin(player: mint.Player, level = 1): boolean {
  return (Number(getSession(player).character?.admin) || 0) >= level;
}
