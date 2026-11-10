import { createRequire } from 'node:module';
import type * as mint from 'mint-server';
import { db } from './db.js';
import { getSession } from '../player/session.js';

const require = createRequire(import.meta.url);

interface Operators {
  gte: symbol;
  lt: symbol;
  or: symbol;
  like: symbol;
}

function operators(): Operators {
  return require('sequelize').Op as Operators;
}

function logModel() {
  const model = db.models.Log;
  if (!model) throw new Error('Модель Log не загружена');
  return model;
}

function debugModel() {
  const model = db.models.DebugLog;
  if (!model) throw new Error('Модель DebugLog не загружена');
  return model;
}

function actor(player: mint.Player | number | null): { characterId?: number; playerId?: number } {
  if (typeof player === 'number') return { characterId: player };
  if (!player) return {};
  const session = getSession(player);
  return {
    characterId: session.character?.id,
    playerId: player.id,
  };
}

export async function log(
  text: string,
  moduleName: string | null = null,
  player: mint.Player | number | null = null,
): Promise<void> {
  const data: Record<string, unknown> = { text, ...actor(player) };
  if (moduleName) data.module = moduleName;
  await logModel().create(data);
}

export async function debug(
  text: string,
  moduleName: string | null = null,
  player: mint.Player | number | null = null,
): Promise<void> {
  const data: Record<string, unknown> = { text, ...actor(player) };
  if (moduleName) data.module = moduleName;
  await debugModel().create(data);
}

export async function loadLogs(characterId: number, dateA: Date, dateB: Date): Promise<unknown[]> {
  const Op = operators();
  return logModel().findAll({
    where: {
      characterId,
      date: { [Op.gte]: dateA, [Op.lt]: dateB },
    },
  });
}

export async function loadLogIds(playerId: number, date: Date): Promise<unknown[]> {
  const Op = operators();
  const character = db.models.Character;
  return logModel().findAll({
    where: {
      playerId,
      date: {
        [Op.gte]: date,
        [Op.lt]: new Date(date.getTime() + 24 * 60 * 60 * 1000),
      },
      text: {
        [Op.or]: [{ [Op.like]: '%Авторизовал персонажа%' }, { [Op.like]: '%Деавторизовал персонажа%' }],
      },
    },
    include: character ? { model: character, attributes: ['name'] } : undefined,
  });
}
