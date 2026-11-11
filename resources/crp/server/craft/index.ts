import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { giveItem, sendInventory } from '../inventory/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifySuccess } from '../ui/notify.js';

const BENCH = { x: -585.55, y: 5288.92, z: 69.29 };
const WOOD = 131;
const RECIPES = [
  { itemId: 76, name: 'Топор', time: 5 * 60 * 1000, materials: [{ itemId: 137, count: 10 }, { itemId: 138, count: 15 }], params: { health: 100 } },
  { itemId: 136, name: 'Кирка', time: 5 * 60 * 1000, materials: [{ itemId: 137, count: 15 }, { itemId: 138, count: 10 }], params: { health: 100 } },
  { itemId: 5, name: 'Удочка', time: 7 * 60 * 1000, materials: [{ itemId: 137, count: 12 }, { itemId: 138, count: 8 }], params: { health: 100 } },
];
const FIRE_TYPES = [
  {
    name: 'Еда',
    items: [
      { itemId: 142, params: { satiety: 60 }, materials: [{ itemId: 15, count: 4 }], time: 60, skill: 0 },
      { itemId: 143, params: { satiety: 70 }, materials: [{ itemId: 36, count: 4 }], time: 70, skill: 50 * 60 },
      { itemId: 144, params: { satiety: 80 }, materials: [{ itemId: 146, count: 4 }], time: 70, skill: 90 * 60 },
    ],
  },
  {
    name: 'Напитки',
    items: [
      { itemId: 145, params: { thirst: 80 }, materials: [{ itemId: 147, count: 4 }], time: 70, skill: 20 * 60 },
    ],
  },
];

interface Job {
  itemId: number;
  name: string;
  ready: number;
  params: Record<string, unknown>;
  skill: number;
}

interface FireRecipe {
  itemId: number;
  params: Record<string, unknown>;
  materials: { itemId: number; count: number }[];
  time: number;
  skill: number;
}

interface Fire {
  destroyAt: number;
  queue: Job[];
  inside: Set<mint.Player>;
  object: mint.Object | null;
  shape: mint.ColshapeSphere | null;
  timer: ReturnType<typeof setTimeout> | null;
}

const here = new WeakSet<mint.Player>();
const queues = new Map<number, Job[]>();
const fires = new Set<Fire>();
const atFire = new WeakMap<mint.Player, Fire>();

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

function stackOf(row: DbRow): { param: DbRow | null; value: number } {
  const list = (row.params ?? row.CharacterInventoryParams ?? []) as DbRow[];
  const param = list.find((entry) => entry.key === 'count') ?? null;
  return { param, value: param ? Number(param.value) || 0 : 1 };
}

export async function spendItems(player: mint.Player, materials: { itemId: number; count: number }[]): Promise<boolean> {
  const character = getSession(player).character;
  if (!character) return false;
  const rows = (await table('CharacterInventory').findAll({
    where: { playerId: character.id },
    include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
  })) as DbRow[];
  const have = (itemId: number): number => rows.filter((row) => Number(row.itemId) === itemId).reduce((sum, row) => sum + stackOf(row).value, 0);
  if (materials.some((material) => have(material.itemId) < material.count)) return false;
  for (const material of materials) {
    let left = material.count;
    for (const row of rows.filter((entry) => Number(entry.itemId) === material.itemId)) {
      if (!left) break;
      const stack = stackOf(row);
      const take = Math.min(stack.value, left);
      left -= take;
      if (!stack.param || stack.value - take <= 0) {
        if (typeof row.destroy === 'function') await row.destroy();
      } else {
        stack.param.value = String(stack.value - take);
        await stack.param.save();
      }
    }
  }
  await sendInventory(player);
  return true;
}

function columnsOf(list: Job[]): { itemId?: number; ready?: boolean }[] {
  const columns = [{}, {}, {}, {}] as { itemId?: number; ready?: boolean }[];
  list.slice(0, 4).forEach((job, index) => {
    columns[index] = { itemId: job.itemId, ready: Date.now() >= job.ready };
  });
  return columns;
}

function skillLine(player: mint.Player): string {
  return `craft.skill = ${Number(getSession(player).character?.craft) || 0};`;
}

async function addCraft(player: mint.Player, seconds: number): Promise<void> {
  const character = getSession(player).character;
  if (!character || !(seconds > 0)) return;
  character.craft = (Number(character.craft) || 0) + seconds;
  await character.save();
  cef(player, skillLine(player));
}

function fireBody(fire: Fire): Record<string, unknown> {
  return {
    name: 'Костер',
    description: 'Используется для приготовления еды.',
    destroyTime: Math.max(0, Math.ceil((fire.destroyAt - Date.now()) / 1000)),
    types: FIRE_TYPES,
    queue: { columns: columnsOf(fire.queue) },
  };
}

function showFire(player: mint.Player, fire: Fire): void {
  atFire.set(player, fire);
  fire.inside.add(player);
  cef(player, `${skillLine(player)} craft.show = true; craft.initCrafter(${JSON.stringify(fireBody(fire))});`);
}

function hideFire(player: mint.Player, fire: Fire): void {
  if (atFire.get(player) !== fire) return;
  atFire.delete(player);
  fire.inside.delete(player);
  cef(player, 'craft.clearCrafter();');
}

function destroyFire(fire: Fire): void {
  if (fire.timer) clearTimeout(fire.timer);
  fire.timer = null;
  fires.delete(fire);
  for (const player of [...fire.inside]) hideFire(player, fire);
  if (fire.shape?.valid) fire.shape.destroy();
  if (fire.object?.valid) fire.object.destroy();
}

function armFire(fire: Fire): void {
  if (fire.timer) clearTimeout(fire.timer);
  fire.timer = setTimeout(() => destroyFire(fire), Math.max(0, fire.destroyAt - Date.now()));
}

function refreshFire(fire: Fire): void {
  const body = JSON.stringify(fireBody(fire));
  for (const player of fire.inside) cef(player, `craft.initCrafter(${body});`);
}

export function createBonfire(player: mint.Player, pos: { x: number; y: number; z: number }): void {
  const spot = { x: pos.x, y: pos.y, z: pos.z + 0.1 };
  const fire: Fire = { destroyAt: Date.now() + 3 * 60 * 1000, queue: [], inside: new Set(), object: null, shape: null, timer: null };
  try {
    fire.object = new mint.Object(mint.hash('prop_beach_fire'), spot.x, spot.y, spot.z, 0, 0, player.rot.z, player.dimension, true);
  } catch {
    fire.object = null;
  }
  fire.shape = new mint.ColshapeSphere(spot.x, spot.y, spot.z, 2.5, player.dimension, true);
  setColshapeHandlers(fire.shape, {
    onEnter: (guest) => {
      if (guest.vehicle) return;
      showFire(guest, fire);
    },
    onExit: (guest) => hideFire(guest, fire),
  });
  fires.add(fire);
  armFire(fire);
  if (!player.vehicle && player.pos.distanceTo(new mint.Vector3(spot.x, spot.y, spot.z)) <= 2.5) showFire(player, fire);
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
      cef(player, `${skillLine(player)} craft.initCrafter(${JSON.stringify(body)});`);
    },
    onExit: (player) => {
      here.delete(player);
      if (!atFire.has(player)) cef(player, 'craft.clearCrafter();');
    },
  });

  mint.onClient('crp:craft', async (player, raw) => {
    const data = JSON.parse(String(raw ?? '{}')) as { typeI?: number; itemI?: number };
    const fire = atFire.get(player);
    if (fire) {
      const type = FIRE_TYPES[Math.trunc(Number(data.typeI) || 0)];
      const recipe = type?.items[Math.trunc(Number(data.itemI) || 0)] as FireRecipe | undefined;
      if (!recipe) return notifyError(player, 'Рецепт не найден', 'Костер');
      if (fire.queue.length >= 4) return notifyError(player, 'Очередь заполнена', 'Костер');
      if (!(await spendItems(player, recipe.materials))) return notifyError(player, 'Недостаточно ресурсов', 'Костер');
      fire.queue.push({ itemId: recipe.itemId, name: 'Блюдо', ready: Date.now() + recipe.time * 1000, params: recipe.params, skill: recipe.time });
      notifySuccess(player, 'Предмет добавлен в очередь', 'Костер');
      refreshFire(fire);
      return;
    }
    if (!here.has(player)) return notifyError(player, 'Подойдите к станку', 'Крафт');
    const recipe = RECIPES[Math.trunc(Number(data.itemI) || 0)];
    const id = Number(getSession(player).character?.id) || 0;
    if (!recipe || !id) return notifyError(player, 'Рецепт не найден', 'Крафт');
    const queue = queues.get(id) ?? [];
    if (queue.length >= 4) return notifyError(player, 'Очередь заполнена', 'Крафт');
    if (!(await spendItems(player, recipe.materials))) return notifyError(player, 'Не хватает материалов', 'Крафт');
    queue.push({ itemId: recipe.itemId, name: recipe.name, ready: Date.now() + recipe.time, params: recipe.params, skill: recipe.time / 1000 });
    queues.set(id, queue);
    notifySuccess(player, `${recipe.name} поставлен в очередь`, 'Крафт');
    cef(player, `craft.initCrafter(${JSON.stringify({ ...payload(), queue: { columns: queuesOf(id) } })});`);
  });

  mint.onClient('crp:craft:take', async (player, raw) => {
    const index = Math.trunc(Number(raw) || 0);
    const fire = atFire.get(player);
    const queue = fire ? fire.queue : queues.get(Number(getSession(player).character?.id) || 0) ?? [];
    if (!fire && !here.has(player)) return;
    const job = queue[index];
    const header = fire ? 'Костер' : 'Крафт';
    if (!job) return notifyError(player, 'Ячейка пуста', header);
    if (Date.now() < job.ready) return notifyError(player, 'Ещё не готово', header);
    if (!(await giveItem(player, job.itemId, job.params))) return notifyError(player, 'Нет места в инвентаре', header);
    queue.splice(index, 1);
    if (!fire) queues.set(Number(getSession(player).character?.id) || 0, queue);
    await addCraft(player, job.skill);
    notifySuccess(player, fire ? 'Предмет получен' : `${job.name} готов`, header);
    if (fire) refreshFire(fire);
    else cef(player, `craft.initCrafter(${JSON.stringify({ ...payload(), queue: { columns: queuesOf(Number(getSession(player).character?.id) || 0) } })});`);
  });

  mint.onClient('crp:craft:update', (player) => {
    const fire = atFire.get(player);
    if (fire) return refreshFire(fire);
    if (!here.has(player)) return;
    const id = Number(getSession(player).character?.id) || 0;
    cef(player, `craft.initCrafter(${JSON.stringify({ ...payload(), queue: { columns: queuesOf(id) } })});`);
  });

  mint.onClient('crp:craft:wood', async (player, raw) => {
    const header = 'Костер';
    const fire = atFire.get(player);
    const count = Math.trunc(Number(raw));
    if (!fire) return notifyError(player, 'Подойдите к костру', header);
    if (!Number.isFinite(count) || count < 1) return;
    if (!(await spendItems(player, [{ itemId: WOOD, count }]))) return notifyError(player, 'Недостаточно дерева', header);
    fire.destroyAt += 60 * 1000 * count;
    armFire(fire);
    const left = Math.max(0, Math.ceil((fire.destroyAt - Date.now()) / 1000));
    for (const guest of fire.inside) cef(guest, `craft.crafter.destroyTime = ${left};`);
  });
}
