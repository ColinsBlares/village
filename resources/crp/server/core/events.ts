import { writeCrash } from './log.js';

type Handler = (...args: unknown[]) => void;

const listeners = new Map<string, Handler[]>();

export function on(name: string, handler: Handler): void {
  const list = listeners.get(name) ?? [];
  list.push(handler);
  listeners.set(name, list);
}

export function emit(name: string, ...args: unknown[]): void {
  const list = listeners.get(name);
  if (!list) return;
  for (const handler of [...list]) {
    try {
      handler(...args);
    } catch (err) {
      writeCrash(`event ${name}`, err);
    }
  }
}
