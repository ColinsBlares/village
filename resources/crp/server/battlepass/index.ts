import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { pushDonate } from '../player/menu.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifySuccess } from '../ui/notify.js';
import { addCash } from '../world/money.js';

const TASKS = [
  { id: 'online_10', title: 'Первый шаг', description: 'Проведите в игре 10 минут', metric: 'onlineMinutes', target: 10, unit: 'мин.', points: 50 },
  { id: 'spend_25000', title: 'Первые покупки', description: 'Потратьте 25 000 $ наличными', metric: 'cashSpent', target: 25000, unit: '$', points: 100 },
  { id: 'drive_5km', title: 'По дорогам города', description: 'Проедьте 5 км за рулём автомобиля', metric: 'drivenMeters', target: 5000, unit: 'км', displayScale: 1000, points: 100 },
  { id: 'online_60', title: 'Постоянный участник', description: 'Проведите в игре 60 минут', metric: 'onlineMinutes', target: 60, unit: 'мин.', points: 150 },
  { id: 'spend_100000', title: 'Активный покупатель', description: 'Потратьте 100 000 $ наличными', metric: 'cashSpent', target: 100000, unit: '$', points: 200 },
];
const PREMIUM_TASKS = [
  { id: 'premium_online_30', title: 'Знакомство с городом', description: 'Проведите в игре 30 минут', metric: 'onlineMinutes', target: 30, unit: 'мин.', points: 50 },
  { id: 'premium_drive_15km', title: 'Дальняя поездка', description: 'Проедьте 15 км за рулём автомобиля', metric: 'drivenMeters', target: 15000, unit: 'км', displayScale: 1000, points: 100 },
  { id: 'premium_spend_100000', title: 'Большие планы', description: 'Потратьте 100 000 $ наличными', metric: 'cashSpent', target: 100000, unit: '$', points: 150 },
  { id: 'premium_online_120', title: 'Жизнь города', description: 'Проведите в игре 120 минут', metric: 'onlineMinutes', target: 120, unit: 'мин.', points: 200 },
  { id: 'premium_spend_300000', title: 'Премиальный шопинг', description: 'Потратьте 300 000 $ наличными', metric: 'cashSpent', target: 300000, unit: '$', points: 200 },
];
const REWARDS = [
  { id: 'level_1', level: 1, requiredPoints: 50, type: 'cash', cash: 1000 },
  { id: 'level_2', level: 2, requiredPoints: 150, type: 'cash', cash: 3000 },
  { id: 'level_3', level: 3, requiredPoints: 300, type: 'cash', cash: 5000 },
  { id: 'level_4', level: 4, requiredPoints: 500, type: 'cash', cash: 10000 },
];
const PREMIUM_REWARDS = [
  { id: 'premium_case_1', level: 1, requiredPoints: 50, type: 'case', cases: 1 },
  { id: 'premium_case_2', level: 2, requiredPoints: 150, type: 'case', cases: 1 },
  { id: 'premium_case_3', level: 3, requiredPoints: 300, type: 'case', cases: 1 },
  { id: 'premium_case_4', level: 4, requiredPoints: 500, type: 'case', cases: 2 },
];
const PREMIUM_PRICE = 500;
const PRIZES = [2500, 5000, 10000, 20000, 50000];

interface Task {
  id: string;
  metric: string;
  target: number;
  points: number;
  displayScale?: number;
}

const drive = new WeakMap<mint.Player, mint.Vector3>();

function ids(raw: unknown): string[] {
  try {
    const list = JSON.parse(String(raw ?? '[]')) as unknown;
    return Array.isArray(list) ? list.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

async function row(name: string, characterId: number): Promise<DbRow> {
  const found = (await table(name).findOne({ where: { characterId } })) as DbRow | null;
  if (found) return found;
  return (await table(name).create({ characterId })) as DbRow;
}

function taskView(task: Task & Record<string, unknown>, value: number, claimed: string[]): unknown {
  const scale = task.displayScale || 1;
  return {
    ...task,
    progress: Math.min(value, task.target) / scale,
    target: task.target / scale,
    completed: value >= task.target,
    claimed: claimed.includes(task.id),
  };
}

async function payload(characterId: number): Promise<Record<string, unknown>> {
  const progress = await row('BattlePassProgress', characterId);
  const premium = await row('BattlePassPremium', characterId);
  const stats = await row('BattlePassStats', characterId);
  const claimedTasks = ids(progress.claimedTasks);
  const claimedRewards = ids(progress.claimedRewards);
  const claimedPremiumTasks = ids(premium.claimedTasks);
  const claimedPremiumRewards = ids(premium.claimedRewards);
  const value = (task: Task): number => task.metric === 'onlineMinutes' ? Number(progress.onlineMinutes) || 0 : Number(stats[task.metric]) || 0;
  const top = (await table('BattlePassProgress').findAll()) as DbRow[];
  top.sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0));
  const board = top.filter((item) => (Number(item.points) || 0) > 0).slice(0, 10);
  const names = new Map<number, string>();
  for (const item of board) {
    const character = (await table('Character').findOne({ where: { id: item.characterId } })) as DbRow | null;
    names.set(Number(item.characterId), String(character?.name ?? 'Игрок'));
  }
  const rank = top.filter((item) => (Number(item.points) || 0) > (Number(progress.points) || 0)).length;
  return {
    season: 'Сезон 01',
    points: Number(progress.points) || 0,
    onlineMinutes: Number(progress.onlineMinutes) || 0,
    premiumEnabled: !!premium.enabled,
    premiumPoints: Number(premium.points) || 0,
    premiumCases: Number(premium.cases) || 0,
    premiumPrice: PREMIUM_PRICE,
    rank: rank + 1,
    tasks: TASKS.map((task) => taskView(task, value(task), claimedTasks)),
    premiumTasks: PREMIUM_TASKS.map((task) => taskView(task, value(task), claimedPremiumTasks)),
    rewards: REWARDS.map((reward) => ({ ...reward, unlocked: (Number(progress.points) || 0) >= reward.requiredPoints, claimed: claimedRewards.includes(reward.id) })),
    premiumRewards: PREMIUM_REWARDS.map((reward) => ({
      ...reward,
      unlocked: !!premium.enabled && (Number(premium.points) || 0) >= reward.requiredPoints,
      claimed: claimedPremiumRewards.includes(reward.id),
    })),
    leaderboard: board.map((item) => ({ characterId: item.characterId, name: names.get(Number(item.characterId)), points: item.points })),
  };
}

function push(player: mint.Player, data: unknown): void {
  cef(player, `mp.event.call('battlePass.data', ${JSON.stringify(data)});`);
}

async function spendDonate(player: mint.Player, price: number): Promise<boolean> {
  const account = getSession(player).account;
  if (!account || (Number(account.donate) || 0) < price) return false;
  account.donate = Number(account.donate) - price;
  await account.save();
  pushDonate(player);
  return true;
}

export async function noteSpend(player: mint.Player, amount: number): Promise<void> {
  const id = Number(getSession(player).character?.id) || 0;
  if (!id || amount <= 0) return;
  const stats = await row('BattlePassStats', id);
  stats.cashSpent = (Number(stats.cashSpent) || 0) + amount;
  await stats.save();
}

export function installBattlePass(): void {
  mint.onClient('crp:pass:open', async (player) => {
    const id = Number(getSession(player).character?.id) || 0;
    if (id) push(player, await payload(id));
  });
  mint.onClient('crp:pass:task', async (player, taskId, premiumFlag) => {
    const id = Number(getSession(player).character?.id) || 0;
    if (!id) return;
    const premium = premiumFlag === true || premiumFlag === 1;
    const list = premium ? PREMIUM_TASKS : TASKS;
    const task = list.find((item) => item.id === String(taskId));
    const progress = await row('BattlePassProgress', id);
    const track = premium ? await row('BattlePassPremium', id) : progress;
    const stats = await row('BattlePassStats', id);
    if (!task) return;
    if (premium && !track.enabled) return notifyError(player, 'Нужна премиум-ветка', 'Боевой пропуск');
    const value = task.metric === 'onlineMinutes' ? Number(progress.onlineMinutes) || 0 : Number(stats[task.metric]) || 0;
    const claimed = ids(track.claimedTasks);
    if (value < task.target || claimed.includes(task.id)) return notifyError(player, 'Задание недоступно', 'Боевой пропуск');
    claimed.push(task.id);
    track.claimedTasks = JSON.stringify(claimed);
    track.points = (Number(track.points) || 0) + task.points;
    await track.save();
    notifySuccess(player, `+${task.points} очков`, 'Боевой пропуск');
    push(player, await payload(id));
  });
  mint.onClient('crp:pass:reward', async (player, rewardId, premiumFlag) => {
    const id = Number(getSession(player).character?.id) || 0;
    if (!id) return;
    const premium = premiumFlag === true || premiumFlag === 1;
    const progress = await row('BattlePassProgress', id);
    const track = premium ? await row('BattlePassPremium', id) : progress;
    const list = premium ? PREMIUM_REWARDS : REWARDS;
    const reward = list.find((item) => item.id === String(rewardId));
    const claimed = ids(track.claimedRewards);
    if (!reward || claimed.includes(reward.id) || (Number(track.points) || 0) < reward.requiredPoints) {
      return notifyError(player, 'Награда недоступна', 'Боевой пропуск');
    }
    if (premium && !track.enabled) return notifyError(player, 'Нужна премиум-ветка', 'Боевой пропуск');
    claimed.push(reward.id);
    track.claimedRewards = JSON.stringify(claimed);
    if ('cases' in reward) track.cases = (Number(track.cases) || 0) + reward.cases;
    await track.save();
    if ('cash' in reward && !(await addCash(player, reward.cash))) return notifyError(player, 'Не удалось выдать награду', 'Боевой пропуск');
    notifySuccess(player, 'Награда получена', 'Боевой пропуск');
    push(player, await payload(id));
  });
  mint.onClient('crp:pass:premium', async (player) => {
    const id = Number(getSession(player).character?.id) || 0;
    const premium = id ? await row('BattlePassPremium', id) : null;
    if (!premium || premium.enabled) return;
    if (!(await spendDonate(player, PREMIUM_PRICE))) return notifyError(player, `Нужно ${PREMIUM_PRICE} CC`, 'Боевой пропуск');
    premium.enabled = 1;
    await premium.save();
    notifySuccess(player, 'Премиум-ветка открыта', 'Боевой пропуск');
    push(player, await payload(id));
  });
  mint.onClient('crp:pass:case', async (player) => {
    const id = Number(getSession(player).character?.id) || 0;
    const premium = id ? await row('BattlePassPremium', id) : null;
    if (!premium || (Number(premium.cases) || 0) < 1) return cef(player, `mp.event.call('battlePass.error', ${JSON.stringify('Нет кейсов')});`);
    premium.cases = Number(premium.cases) - 1;
    await premium.save();
    const prize = PRIZES[Math.floor(Math.random() * PRIZES.length)];
    await addCash(player, prize);
    cef(player, `mp.event.call('battlePass.case.opened', ${JSON.stringify(prize)});`);
    push(player, await payload(id));
  });
  mint.setInterval(() => {
    for (const player of mint.Player.all) {
      const character = getSession(player).character;
      if (!player.valid || !character || !getSession(player).spawnedAt) continue;
      void row('BattlePassProgress', Number(character.id)).then(async (progress) => {
        progress.onlineMinutes = (Number(progress.onlineMinutes) || 0) + 1;
        await progress.save();
      });
    }
  }, 60 * 1000);
  mint.setInterval(() => {
    for (const player of mint.Player.all) {
      const character = getSession(player).character;
      const vehicle = player.vehicle;
      if (!player.valid || !character || !vehicle || (player.seat !== 1 && player.seat !== 0)) {
        drive.delete(player);
        continue;
      }
      const prev = drive.get(player);
      drive.set(player, player.pos);
      if (!prev) continue;
      const distance = player.pos.distanceTo(prev);
      if (distance < 1 || distance > 80) continue;
      void row('BattlePassStats', Number(character.id)).then(async (stats) => {
        stats.drivenMeters = (Number(stats.drivenMeters) || 0) + distance;
        await stats.save();
      });
    }
  }, 2000);
}
