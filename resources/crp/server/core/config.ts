import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface AppConfig {
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  smtpHost: string;
  smtpPort: number;
  emailLogin: string;
  emailPass: string;
  ignoredModules: string[];
}

let current: AppConfig | null = null;

function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`config.json: поле ${key} должно быть непустой строкой`);
  }
  return value;
}

function readPort(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`config.json: поле ${key} должно быть портом`);
  }
  return value;
}

export function configPath(): string {
  return fileURLToPath(new URL('../../../config.json', import.meta.url));
}

export function loadConfig(): AppConfig {
  const path = configPath();
  const source = JSON.parse(fs.readFileSync(path, 'utf8')) as Record<string, unknown>;
  const ignored = source.ignoredModules;
  current = {
    dbHost: readString(source, 'dbHost'),
    dbPort: readPort(source, 'dbPort'),
    dbName: readString(source, 'dbName'),
    dbUser: readString(source, 'dbUser'),
    dbPassword: typeof source.dbPassword === 'string' ? source.dbPassword : '',
    smtpHost: readString(source, 'smtpHost'),
    smtpPort: readPort(source, 'smtpPort'),
    emailLogin: readString(source, 'emailLogin'),
    emailPass: typeof source.emailPass === 'string' ? source.emailPass : '',
    ignoredModules: Array.isArray(ignored)
      ? ignored.filter((name): name is string => typeof name === 'string')
      : ['test', 'bugTracker'],
  };
  return current;
}

export function getConfig(): AppConfig {
  if (!current) throw new Error('Конфиг ещё не загружен');
  return current;
}
