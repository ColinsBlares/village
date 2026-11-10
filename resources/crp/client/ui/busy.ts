import { focusUi, inWorld, pushCef } from '../cef/view.js';

const names: string[] = [];
const mice: string[] = [];

function paint(code: string): void {
  pushCef(code);
}

export function busyHas(name?: string | string[] | null): boolean {
  if (name == null) return names.length > 0;
  if (Array.isArray(name)) return name.some((item) => names.includes(item));
  return names.includes(name);
}

export function busyAdd(name: string, mouse = true): void {
  if (!names.includes(name)) names.push(name);
  if (mouse && !mice.includes(name)) mice.push(name);
  paint(`busy.add(${JSON.stringify(name)}, ${mouse}, false);`);
  if (mouse && inWorld()) focusUi(true);
}

export function busyRemove(name: string): void {
  const index = names.indexOf(name);
  if (index !== -1) names.splice(index, 1);
  const mouse = mice.indexOf(name);
  if (mouse !== -1) mice.splice(mouse, 1);
  paint(`busy.remove(${JSON.stringify(name)}, false);`);
  if (mice.length === 0 && inWorld()) focusUi(false);
}

export function busyNote(name: string, mouse = true): void {
  if (!names.includes(name)) names.push(name);
  if (mouse && !mice.includes(name)) {
    mice.push(name);
    if (inWorld()) focusUi(true);
  }
}

export function busyForget(name: string): void {
  const index = names.indexOf(name);
  if (index !== -1) names.splice(index, 1);
  const mouse = mice.indexOf(name);
  if (mouse !== -1) mice.splice(mouse, 1);
  if (mice.length === 0 && inWorld()) focusUi(false);
}

export function busyClear(): void {
  const left = names.slice();
  names.length = 0;
  mice.length = 0;
  for (const name of left) paint(`busy.remove(${JSON.stringify(name)}, false);`);
}
