import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { giveItem } from '../inventory/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { notifyError, notifySuccess } from '../ui/notify.js';
import { addCash, removeCash } from '../world/money.js';
import { sendInventory } from '../inventory/index.js';

const ROD = 5;
const FISH = 15;
const ROD_PRICE = 100;

interface Catch {
  name: string;
  price: number;
  weight: number;
  ready: boolean;
  timer: ReturnType<typeof setTimeout>;
}

const fish: DbRow[] = [];
const sessions = new WeakMap<mint.Player, Catch>();
const atFisher = new WeakSet<mint.Player>();

async function rodOf(player: mint.Player): Promise<DbRow | null> {
  const character = getSession(player).character;
  if (!character) return null;
  return (await table('CharacterInventory').findOne({
    where: { playerId: character.id, itemId: ROD },
    include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
  })) as DbRow | null;
}

function healthOf(item: DbRow): { param: DbRow | null; value: number } {
  const list = (item.params ?? []) as DbRow[];
  const param = list.find((row) => row.key === 'health') ?? null;
  return { param, value: param ? Number(param.value) || 0 : 100 };
}

export async function loadFishing(): Promise<number> {
  fish.splice(0, fish.length, ...((await table('Fish').findAll()) as DbRow[]));
  const spots = (await table('Fisher').findAll()) as DbRow[];
  for (const spot of spots) {
    const shape = new mint.ColshapeSphere(Number(spot.x), Number(spot.y), Number(spot.z), 2, 0, true);
    setColshapeHandlers(shape, {
      onEnter: (player) => {
        atFisher.add(player);
        mint.emitClient(player, 'crp:fish:zone', true);
      },
      onExit: (player) => {
        atFisher.delete(player);
        mint.emitClient(player, 'crp:fish:zone', false);
      },
    });
    const blip = new mint.PointBlip(68, Number(spot.x), Number(spot.y), Number(spot.z), 3, 0.8, true, 0, 'Рыбалка');
    void blip;
  }
  return spots.length;
}

export function installFishing(): void {
  mint.onClient('crp:fish:enter', async (player) => {
    if (!atFisher.has(player)) return;
    const rod = await rodOf(player);
    if (!rod) {
      notifyError(player, 'У вас нет удочки', 'Ошибка');
      mint.emitClient(player, 'crp:fish:exit');
      return;
    }
    mint.emitClient(player, 'crp:fish:enter');
  });

  mint.onClient('crp:fish:start', async (player) => {
    if (!atFisher.has(player)) return;
    const previous = sessions.get(player);
    if (previous) clearTimeout(previous.timer);
    const rod = await rodOf(player);
    if (!rod) return mint.emitClient(player, 'crp:fish:exit');
    const health = healthOf(rod);
    if (health.value <= 0) return mint.emitClient(player, 'crp:fish:exit');
    if (health.param) {
      health.param.value = String(health.value - 1);
      await health.param.save();
    }
    const kind = fish[Math.floor(Math.random() * Math.max(1, fish.length))];
    const name = String(kind?.name ?? 'Рыба');
    const min = Number(kind?.minWeight) || 0.4;
    const max = Number(kind?.maxWeight) || 2;
    const weight = Math.round((min + Math.random() * (max - min)) * 10) / 10;
    const price = Number(kind?.price) || 20;
    const session: Catch = { name, price, weight, ready: false, timer: setTimeout(() => undefined, 0) };
    session.timer = setTimeout(() => {
      if (sessions.get(player) !== session || !player.valid) return;
      session.ready = true;
      const speed = Math.max(1, Math.trunc(health.value / 5));
      const zone = 10 + Math.floor(Math.random() * 11);
      mint.emitClient(player, 'crp:fish:fetch', speed, zone, weight);
    }, (5 + Math.floor(Math.random() * 11)) * 1000);
    sessions.set(player, session);
  });

  mint.onClient('crp:fish:end', async (player, result) => {
    const session = sessions.get(player);
    if (!session) return;
    sessions.delete(player);
    clearTimeout(session.timer);
    const caught = result === true || result === 1;
    if (!session.ready || !caught) {
      notifyError(player, 'Рыба сорвалась', 'Провал!');
    } else {
      const ok = await giveItem(player, FISH, { weight: session.weight, name: session.name });
      if (ok) notifySuccess(player, `${session.name} весом ${session.weight} кг в инвентаре`, 'Отлично!');
      else notifyError(player, 'Нет места в инвентаре', 'Ошибка');
    }
    const rod = await rodOf(player);
    if (rod && healthOf(rod).value <= 0) {
      if (typeof rod.destroy === 'function') await rod.destroy();
      await sendInventory(player);
      notifyError(player, 'Удочка сломалась', '');
      mint.emitClient(player, 'crp:fish:exit');
    }
  });

  mint.onClient('crp:fish:exit', (player) => {
    const session = sessions.get(player);
    if (!session) return;
    clearTimeout(session.timer);
    sessions.delete(player);
  });

  mint.onClient('crp:fish:rod', async (player) => {
    if (!atFisher.has(player)) return notifyError(player, 'Подойдите к рыбаку', 'Удочка');
    if (await rodOf(player)) return notifyError(player, 'Удочка уже есть', 'Удочка');
    if (!(await removeCash(player, ROD_PRICE))) return notifyError(player, `Необходимо $${ROD_PRICE}`, 'Удочка');
    const ok = await giveItem(player, ROD, { health: 100 });
    if (!ok) {
      await addCash(player, ROD_PRICE);
      return notifyError(player, 'Нет места в инвентаре', 'Удочка');
    }
    notifySuccess(player, 'Удочка куплена', 'Рыбалка');
  });

  mint.onClient('crp:fish:sell', async (player) => {
    if (!atFisher.has(player)) return notifyError(player, 'Подойдите к скупщику', 'Рыба');
    const character = getSession(player).character;
    if (!character) return;
    const rows = (await table('CharacterInventory').findAll({
      where: { playerId: character.id, itemId: FISH },
      include: [{ model: table('CharacterInventoryParam'), as: 'params' }],
    })) as DbRow[];
    if (!rows.length) return notifyError(player, 'У вас нет рыбы', 'Рыба');
    let sum = 0;
    for (const row of rows) {
      const params = (row.params ?? []) as DbRow[];
      const weight = Number(params.find((param) => param.key === 'weight')?.value) || 1;
      const name = String(params.find((param) => param.key === 'name')?.value ?? '');
      const kind = fish.find((item) => String(item.name) === name);
      sum += Math.trunc(weight * (Number(kind?.price) || 20));
      if (typeof row.destroy === 'function') await row.destroy();
    }
    await sendInventory(player);
    await addCash(player, sum);
    notifySuccess(player, `Рыба продана за $${sum}`, 'Рыба');
  });
}
