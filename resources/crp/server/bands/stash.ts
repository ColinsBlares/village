import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { factionKind } from '../factions/index.js';
import { giveItem } from '../inventory/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifySuccess } from '../ui/notify.js';
import { bandPower } from '../war/index.js';
import { removeCash } from '../world/money.js';

const POS = { x: 2435.65, y: 4965.74, z: 42.35 - 1 };
const ITEMS = [29, 30, 31, 32];
const PRICE = [20, 40, 60, 120];
const PRICE_MIN = [10, 20, 30, 60];
const inside = new WeakSet<mint.Player>();
const names = new Map<number, string>();

async function title(itemId: number): Promise<string> {
  const cached = names.get(itemId);
  if (cached) return cached;
  const row = (await table('InventoryItem').findOne({ where: { id: itemId } })) as DbRow | null;
  const name = String(row?.name ?? `Предмет ${itemId}`);
  names.set(itemId, name);
  return name;
}

export function installDrugStash(): void {
  new mint.Marker(
    mint.MarkerType.MarkerCylinder,
    POS.x, POS.y, POS.z,
    0, 0, 0, 0, 0, 0,
    0.5, 0.5, 0.5,
    70, 187, 255, 0,
    0,
  );
  new mint.PointBlip(140, POS.x, POS.y, POS.z, 25, 1, true, 0, 'Наркопритон');
  const shape = new mint.ColshapeSphere(POS.x, POS.y, POS.z, 1.5, 0, true);
  setColshapeHandlers(shape, {
    onEnter: (player) => {
      if (player.vehicle) return;
      if (factionKind(Number(getSession(player).character?.factionId) || 0) !== 'bands') {
        notifyError(player, 'Вы не член группировки', 'Наркопритон');
        return;
      }
      inside.add(player);
      cef(player, `selectMenu.showByName('drugsStash');`);
    },
    onExit: (player) => {
      inside.delete(player);
      cef(player, 'selectMenu.show = false;');
    },
  });

  mint.onClient('crp:bands:drugs', async (player, raw) => {
    const header = 'Наркопритон';
    const character = getSession(player).character;
    if (!inside.has(player)) return notifyError(player, 'Вы далеко', header);
    if (!character || factionKind(Number(character.factionId) || 0) !== 'bands') return notifyError(player, 'Вы не член группировки', header);
    const data = JSON.parse(String(raw ?? '{}')) as { index?: number; count?: number };
    const index = Math.max(0, Math.min(ITEMS.length - 1, Math.trunc(Number(data.index) || 0)));
    const count = Number.parseInt(String(data.count), 10);
    if (!Number.isInteger(count) || count <= 0) return notifyError(player, 'Некорректное количество', header);
    const power = bandPower(Number(character.factionId));
    let price = PRICE[index] * count;
    price -= Math.trunc(price * power);
    price = Math.max(PRICE_MIN[index] * count, price);
    if ((Number(character.cash) || 0) < price) return notifyError(player, `Необходимо $${price}`, header);
    if (!(await removeCash(player, price))) return notifyError(player, 'Ошибка списания наличных', header);
    const itemId = ITEMS[index];
    if (!(await giveItem(player, itemId, { count }))) {
      notifyError(player, 'Нет места в инвентаре', header);
      return;
    }
    notifySuccess(player, `Вы приобрели ${await title(itemId)} (${count} г.)`, header);
    cef(player, `prompt.show(${JSON.stringify(`Влияние вашей банды снизило цену на ${Math.trunc(power * 100)}%`)});`);
  });
}
