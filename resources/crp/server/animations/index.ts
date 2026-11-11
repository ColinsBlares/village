import { createRequire } from 'module';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import * as mint from 'mint-server';

const require = createRequire(import.meta.url);

function loadCatalog(): string[] {
  const candidates = [
    fileURLToPath(new URL('./catalog.cjs', import.meta.url)),
    fileURLToPath(new URL('../../../server/animations/catalog.cjs', import.meta.url)),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const list = require(path) as unknown;
    if (Array.isArray(list)) return list.map((item) => String(item));
  }
  return [];
}

const catalog = loadCatalog();
const catalogSet = new Set(catalog);

export const ANIMATIONS = [
  { title: 'Руки вверх', dict: 'missminuteman_1ig_2', name: 'handsup_base', flag: 49 },
  { title: 'Сидеть', dict: 'amb@world_human_picnic@male@base', name: 'base', flag: 1 },
  { title: 'Опереться', dict: 'amb@world_human_leaning@male@wall@back@foot_up@base', name: 'base', flag: 1 },
  { title: 'Курить', dict: 'amb@world_human_smoking@male@male_a@base', name: 'base', flag: 1 },
  { title: 'Охрана', dict: 'amb@world_human_stand_guard@male@base', name: 'base', flag: 1 },
  { title: 'Планшет', dict: 'amb@world_human_clipboard@male@base', name: 'base', flag: 49 },
  { title: 'Приветствие', dict: 'anim@mp_player_intcelebrationmale@salute', name: 'salute', flag: 49 },
  { title: 'Танец', dict: 'anim@amb@nightclub@dancers@podium_dancers@', name: 'hi_dance_facedj_17_v2_male^5', flag: 1 },
];

export function playAnimation(player: mint.Player, dict: string, name: string, flag = 1, speed = 8): void {
  player.playAnimation(dict, name, speed, -8, -1, flag);
  player.setSyncedMeta('crp:anim', `${dict} ${name}`);
}

export function hasAnim(dict: string, name: string): boolean {
  return catalogSet.has(`${dict} ${name}`);
}

export function playCatalog(player: mint.Player, id: number): void {
  if (!catalog.length) return;
  const index = Math.max(0, Math.min(catalog.length - 1, Math.trunc(id)));
  const parts = catalog[index].split(' ');
  if (!parts[0] || !parts[1]) return;
  playAnimation(player, parts[0], parts[1], 1, 1);
  mint.emitClient(player, 'crp:anim:line', index, `${parts[0]} ${parts[1]}`);
}

export function playTimed(player: mint.Player, dict: string, name: string, flag: number, ms: number): void {
  playAnimation(player, dict, name, flag);
  const id = player.id;
  setTimeout(() => {
    const current = mint.Player.getByID(id);
    if (current?.valid) stopAnimation(current);
  }, ms);
}

export function stopAnimation(player: mint.Player): void {
  player.clearTasks();
  player.setSyncedMeta('crp:anim', '');
}

export function installAnimations(): void {
  mint.onClient('crp:anim:id', (player, id) => playCatalog(player, Number(id)));
  mint.onClient('crp:anim:stop', (player) => stopAnimation(player));
}

export function playByIndex(player: mint.Player, index: number): boolean {
  const anim = ANIMATIONS[index];
  if (!anim) return false;
  playAnimation(player, anim.dict, anim.name, anim.flag);
  return true;
}
