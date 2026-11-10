import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { pushDonate, pushName, pushSlots, pushWarns } from '../player/menu.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifySuccess } from '../ui/notify.js';
import { addCash } from '../world/money.js';

const CASES = [
  { id: 'bronze', price: 100, prizes: [5000, 10000, 15000, 25000] },
  { id: 'silver', price: 300, prizes: [25000, 50000, 75000, 100000] },
  { id: 'gold', price: 700, prizes: [50000, 100000, 200000, 500000] },
];

async function spend(player: mint.Player, price: number): Promise<boolean> {
  const account = getSession(player).account;
  if (!account || (Number(account.donate) || 0) < price) return false;
  account.donate = Number(account.donate) - price;
  await account.save();
  pushDonate(player);
  return true;
}

export function installDonate(): void {
  mint.onClient('crp:donate:convert', async (player, raw) => {
    const header = 'Конвертация';
    const amount = Math.trunc(Number(raw));
    if (!Number.isInteger(amount) || amount <= 0) return notifyError(player, 'Некорректная сумма', header);
    if (!(await spend(player, amount))) return notifyError(player, `Необходимо ${amount} CC`, header);
    await addCash(player, amount * 100);
    notifySuccess(player, `Списано ${amount} CC`, header);
  });
  mint.onClient('crp:donate:name', async (player, raw) => {
    const header = 'Смена имени';
    const name = String(raw ?? '').trim().replace(/\s+/g, ' ');
    const parts = name.split(' ');
    if (parts.length !== 2 || parts.some((part) => !/^[A-Za-zА-Яа-яЁё]{2,16}$/.test(part))) {
      return notifyError(player, 'Имя и фамилия, 2-16 букв', header);
    }
    const character = getSession(player).character;
    if (!character) return;
    const taken = (await table('Character').findOne({ where: { name } })) as DbRow | null;
    if (taken && Number(taken.id) !== Number(character.id)) return notifyError(player, 'Имя занято', header);
    if (!(await spend(player, 100))) return notifyError(player, 'Необходимо 100 CC', header);
    character.name = name;
    await character.save();
    player.setStreamSyncedMeta('crp:name', name);
    pushName(player);
    notifySuccess(player, `Списано 100 CC`, header);
  });
  mint.onClient('crp:donate:warn', async (player) => {
    const header = 'Снятие варна';
    const character = getSession(player).character;
    if (!character || !(Number(character.warnNumber) > 0)) return notifyError(player, 'У вас нет варнов', header);
    if (!(await spend(player, 200))) return notifyError(player, 'Необходимо 200 CC', header);
    character.warnNumber = Math.max(0, Number(character.warnNumber) - 1);
    await character.save();
    pushWarns(player);
    notifySuccess(player, 'Списано 200 CC', header);
  });
  mint.onClient('crp:donate:slot', async (player) => {
    const header = 'Слот персонажа';
    const account = getSession(player).account;
    if (!account) return;
    if ((Number(account.slots) || 1) >= 3) return notifyError(player, 'Достигнут максимум слотов', header);
    if (!(await spend(player, 500))) return notifyError(player, 'Необходимо 500 CC', header);
    account.slots = (Number(account.slots) || 1) + 1;
    await account.save();
    pushSlots(player);
    notifySuccess(player, 'Списано 500 CC', header);
  });
  mint.onClient('crp:donate:case', async (player, raw) => {
    const box = CASES.find((item) => item.id === String(raw));
    if (!box) return cef(player, 'playerMenu.setDonateCaseFailed();');
    if (!(await spend(player, box.price))) {
      notifyError(player, `Для покупки кейса необходимо ${box.price} CC`, 'Донат-кейс');
      cef(player, 'playerMenu.setDonateCaseFailed();');
      return;
    }
    const cash = box.prizes[Math.floor(Math.random() * box.prizes.length)];
    await addCash(player, cash);
    cef(player, `playerMenu.setDonateCaseResult(${JSON.stringify({ id: box.id, cash })});`);
    notifySuccess(player, `Кейс: $${cash}`, 'Донат-кейс');
  });
}
