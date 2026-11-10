import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { giveItem, sendInventory } from '../inventory/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifySuccess } from '../ui/notify.js';

const BENCH = { x: -585.55, y: 5288.92, z: 69.29 };
const RECIPES = [
  { itemId: 76, name: 'Топор', time: 5 * 60 * 1000, materials: [{ itemId: 137, count: 10 }, { itemId: 138, count: 15 }], params: { health: 100 } },
  { itemId: 136, name: 'Кирка', time: 5 * 60 * 1000, materials: [{ itemId: 137, count: 15 }, { itemId: 138, count: 10 }], params: { health: 100 } },
  { itemId: 5, name: 'Удочка', time: 7 * 60 * 1000, materials: [{ itemId: 137, count: 12 }, { itemId: 138, count: 8 }], params: { health: 100 } },
];

interface Job {
  itemId: number;
  name: string;
  ready: number;
  params: Record<string, unknown>;
}

const here = new WeakSet<mint.Player>();
const queues = new Map<number, Job[]>();

function payload(): { name: string; description: string; types: unknown[]; queue: { columns: unknown[] } } {
  return {
    name: 'Станок',
    description: 'Переработка ресурсов и изготовление инструментов.',
    types: [{
      name: 'Инструменты',
      items: RECIPES.map((recipe) => ({
        itemId: recipe.itemId,
        params: recipe.params,
        materials: recipe.materials,
        time: recipe.time / 1000,
        skill: 0,
      })),
    }],
    queue: { columns: queuesOf(0) },
  };
}

function queuesOf(characterId: number): { itemId?: number; ready?: boolean }[] {
  const list = queues.get(characterId) ?? [];
  const columns = [{}, {}, {}, {}] as { itemId?: number; ready?: boolean }[];
  list.slice(0, 4).forEach((job, index) => {
    columns[index] = { itemId: job.itemId, ready: Date.now() >= job.ready };
  });
  return columns;
}

async function takeMaterials(player: mint.Player, materials: { itemId: number; count: number }[]): Promise<boolean> {
  const character = getSession(player).character;
  if (!character) return false;
  const rows = (await table('CharacterInventory').findAll({ where: { playerId: character.id } })) as DbRow[];
  for (const material of materials) {
    const have = rows.filter((row) => Number(row.itemId) === material.itemId);
    if (have.length < material.count) return false;
  }
  for (const material of materials) {
    const have = rows.filter((row) => Number(row.itemId) === material.itemId).slice(0, material.count);
    for (const row of have) if (typeof row.destroy === 'function') await row.destroy();
  }
  await sendInventory(player);
  return true;
}

export function installCraft(): void {
  const shape = new mint.ColshapeSphere(BENCH.x, BENCH.y, BENCH.z, 2.5, 0, true);
  setColshapeHandlers(shape, {
    onEnter: (player) => {
      if (player.vehicle) return;
      here.add(player);
      const id = Number(getSession(player).character?.id) || 0;
      const body = payload();
      (body as { queue: { columns: unknown[] } }).queue.columns = queuesOf(id);
      cef(player, `craft.initCrafter(${JSON.stringify(body)});`);
    },
    onExit: (player) => {
      here.delete(player);
      cef(player, 'craft.clearCrafter();');
    },
  });

  mint.onClient('crp:craft', async (player, raw) => {
    if (!here.has(player)) return notifyError(player, 'Подойдите к станку', 'Крафт');
    const data = JSON.parse(String(raw ?? '{}')) as { typeI?: number; itemI?: number };
    const recipe = RECIPES[Math.trunc(Number(data.itemI) || 0)];
    const id = Number(getSession(player).character?.id) || 0;
    if (!recipe || !id) return notifyError(player, 'Рецепт не найден', 'Крафт');
    const queue = queues.get(id) ?? [];
    if (queue.length >= 4) return notifyError(player, 'Очередь заполнена', 'Крафт');
    if (!(await takeMaterials(player, recipe.materials))) return notifyError(player, 'Не хватает материалов', 'Крафт');
    queue.push({ itemId: recipe.itemId, name: recipe.name, ready: Date.now() + recipe.time, params: recipe.params });
    queues.set(id, queue);
    notifySuccess(player, `${recipe.name} поставлен в очередь`, 'Крафт');
    cef(player, `craft.initCrafter(${JSON.stringify({ ...payload(), queue: { columns: queuesOf(id) } })});`);
  });

  mint.onClient('crp:craft:take', async (player, raw) => {
    if (!here.has(player)) return;
    const id = Number(getSession(player).character?.id) || 0;
    const queue = queues.get(id) ?? [];
    const index = Math.trunc(Number(raw) || 0);
    const job = queue[index];
    if (!job) return notifyError(player, 'Ячейка пуста', 'Крафт');
    if (Date.now() < job.ready) return notifyError(player, 'Ещё не готово', 'Крафт');
    if (!(await giveItem(player, job.itemId, job.params))) return notifyError(player, 'Нет места в инвентаре', 'Крафт');
    queue.splice(index, 1);
    queues.set(id, queue);
    notifySuccess(player, `${job.name} готов`, 'Крафт');
    cef(player, `craft.initCrafter(${JSON.stringify({ ...payload(), queue: { columns: queuesOf(id) } })});`);
  });

  mint.onClient('crp:craft:update', (player) => {
    if (!here.has(player)) return;
    const id = Number(getSession(player).character?.id) || 0;
    cef(player, `craft.initCrafter(${JSON.stringify({ ...payload(), queue: { columns: queuesOf(id) } })});`);
  });
}
