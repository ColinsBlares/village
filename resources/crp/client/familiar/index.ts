import * as mint from 'mint-client';
import { pushCef } from '../cef/view.js';

const names = new Set<string>();

export function hasFamiliar(name: string): boolean {
  return names.has(name);
}

export function installFamiliarClient(): void {
  mint.onServer('crp:familiar:init', (raw) => {
    names.clear();
    if (typeof raw !== 'string') return;
    try {
      const list = JSON.parse(raw) as string[];
      for (const name of list) names.add(name);
      pushCef(`typeof playerMenu !== 'undefined' && playerMenu.setFamiliar && playerMenu.setFamiliar(${list.length});`);
    } catch {
      return;
    }
  });
  mint.onServer('crp:familiar:add', (name) => {
    if (typeof name !== 'string' || !name || names.has(name)) return;
    names.add(name);
    pushCef(`typeof playerMenu !== 'undefined' && playerMenu.setFamiliar && playerMenu.setFamiliar(${names.size});`);
  });
}
