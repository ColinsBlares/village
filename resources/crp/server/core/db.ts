import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AppConfig } from './config.js';

const require = createRequire(import.meta.url);

export interface ModelTable {
  name: string;
  create(values: object): Promise<unknown>;
  findAll(options?: object): Promise<unknown[]>;
  findOne(options?: object): Promise<unknown | null>;
  associate?: (models: Record<string, ModelTable>) => void;
}

interface SequelizeInstance {
  sync(): Promise<unknown>;
  close(): Promise<void>;
}

type ModelFactory = (sequelize: SequelizeInstance, dataTypes: unknown) => ModelTable;

interface SequelizeLibrary {
  new (
    database: string,
    username: string,
    password: string,
    options: Record<string, unknown>,
  ): SequelizeInstance;
  DataTypes: unknown;
  Op: unknown;
}

export const db: {
  sequelize: SequelizeInstance | null;
  models: Record<string, ModelTable>;
  Op: unknown;
} = {
  sequelize: null,
  models: {},
  Op: null,
};

/** Те же объекты, что закроют сеттеры старых моделей farms и settings. */
export const farmLimits = {
  grainsMax: 2000,
  productsMax: 800,
  soilsMax: 1000,
  cropMax: 1000,
  priceMax: 100,
  payMax: 100,
  taxBalanceMax: 10000,
};

export const settingsLimits = {
  walkingCount: 7,
  moodCount: 7,
};

declare global {
  interface Math {
    clamp(value: number, min: number, max: number): number;
  }
}

function installModelGlobals(): void {
  Math.clamp = (value: number, min: number, max: number) => {
    if (Number.isNaN(value)) return min;
    return Math.max(min, Math.min(max, value));
  };
  const modules = new Map<string, Record<string, unknown>>([
    ['farms', farmLimits],
    ['settings', settingsLimits],
  ]);
  const target = globalThis as typeof globalThis & {
    call?: (moduleName: string) => Record<string, unknown>;
  };
  target.call = (moduleName: string) => modules.get(moduleName) ?? { isEmpty: true };
}

export async function connectDatabase(config: AppConfig): Promise<number> {
  installModelGlobals();
  const Sequelize = require('sequelize') as SequelizeLibrary;
  db.Op = Sequelize.Op;
  const sequelize = new Sequelize(config.dbName, config.dbUser, config.dbPassword, {
    host: config.dbHost,
    dialect: 'mysql',
    port: config.dbPort,
    logging: false,
    pool: { max: 100, min: 2, idle: 10000 },
  });
  db.sequelize = sequelize;

  const root = fileURLToPath(new URL('../../../db', import.meta.url));
  for (const dir of fs.readdirSync(root)) {
    if (config.ignoredModules.includes(dir)) continue;
    const full = path.join(root, dir);
    if (!fs.statSync(full).isDirectory()) continue;
    for (const file of fs.readdirSync(full)) {
      if (!file.endsWith('.cjs')) continue;
      const filePath = path.join(full, file);
      try {
        const factory = require(filePath) as ModelFactory;
        const model = factory(sequelize, Sequelize.DataTypes);
        db.models[model.name] = model;
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        throw new Error(`Модель ${dir}/${file} не загрузилась: ${reason}`);
      }
    }
  }

  for (const model of Object.values(db.models)) {
    if (!model.associate) continue;
    try {
      model.associate(db.models);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`Связь модели ${model.name} не собралась: ${reason}`);
    }
  }

  await sequelize.sync();
  return Object.keys(db.models).length;
}

export function table(name: string): ModelTable {
  const model = db.models[name];
  if (!model) throw new Error(`Модель ${name} не загружена`);
  return model;
}

export async function closeDatabase(): Promise<void> {
  if (!db.sequelize) return;
  await db.sequelize.close();
  db.sequelize = null;
}
