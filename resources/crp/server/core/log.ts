import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const crashPath = fileURLToPath(new URL('../../../crash.log', import.meta.url));

/** Консоль server-core по умолчанию OEM (866) и рисует UTF-8 кракозябрами. */
export function enableUtf8Console(): void {
  if (process.platform !== 'win32') return;
  try {
    execFileSync('chcp.com', ['65001'], { stdio: 'ignore' });
  } catch {
    // Вывод уже ушёл в файл, консоли нет.
  }
}

export function formatError(err: unknown): string {
  if (err instanceof Error) return err.stack ?? err.message;
  return String(err);
}

export function writeCrash(label: string, err: unknown): string {
  const text = formatError(err);
  const line = `[${new Date().toISOString()}] ${label}\n${text}\n\n`;
  try {
    fs.appendFileSync(crashPath, line);
  } catch {
    // Файл лога вторичен: ошибка записи не должна скрыть исходный сбой.
  }
  return text;
}
