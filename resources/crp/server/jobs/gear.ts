import * as mint from 'mint-server';
import { giveItem } from '../inventory/index.js';
import { getSession } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifySuccess } from '../ui/notify.js';
import { addCash, removeCash } from '../world/money.js';

interface Gear {
  itemId: number;
  price: number;
  params: Record<string, unknown>;
}

const MASON_TOOL: Gear = { itemId: 136, price: 100, params: { health: 100 } };
const WOOD_TOOL: Gear = { itemId: 76, price: 100, params: { health: 100, weaponHash: mint.hash('weapon_stone_hatchet') } };

const MASON_CLOTHES: Record<0 | 1, Gear[]> = {
  0: [
    { itemId: 7, price: 100, params: { variation: 56, texture: 0, torso: 0, undershirt: 59, uTexture: 1, sex: 1, pockets: '[5,5,5,5,10,5]', clime: '[-5,30]', name: 'Жилетка камещика', rockDamage: 10 } },
    { itemId: 8, price: 100, params: { variation: 31, texture: 2, sex: 1, pockets: '[5,5,5,5,10,5]', clime: '[-5,30]', name: 'Штаны каменщика', rockDamage: 10 } },
    { itemId: 9, price: 100, params: { variation: 24, texture: 0, sex: 1, clime: '[-5,30]', name: 'Ботинки каменщика', rockDamage: 10 } },
  ],
  1: [
    { itemId: 7, price: 100, params: { variation: 49, texture: 0, torso: 14, undershirt: 36, uTexture: 1, sex: 0, pockets: '[5,5,5,5,10,5]', clime: '[-5,30]', name: 'Жилетка каменщика', rockDamage: 10 } },
    { itemId: 8, price: 100, params: { variation: 30, texture: 4, sex: 0, pockets: '[5,5,5,5,10,5]', clime: '[-5,30]', name: 'Штаны камещика', rockDamage: 10 } },
    { itemId: 9, price: 100, params: { variation: 24, texture: 0, sex: 0, clime: '[-5,30]', name: 'Ботинки каменщика', rockDamage: 10 } },
  ],
};

const WOOD_CLOTHES: Record<0 | 1, Gear[]> = {
  0: [
    { itemId: 7, price: 100, params: { variation: 170, texture: 3, torso: 99, tTexture: 7, undershirt: 81, uTexture: 5, sex: 1, pockets: '[5,5,5,5,10,5]', clime: '[-5,30]', name: 'Жилетка лесоруба', treeDamage: 10 } },
    { itemId: 8, price: 100, params: { variation: 97, texture: 1, sex: 1, pockets: '[5,5,5,5,10,5]', clime: '[-5,30]', name: 'Штаны лесоруба', treeDamage: 10 } },
    { itemId: 9, price: 100, params: { variation: 27, texture: 0, sex: 1, clime: '[-5,30]', name: 'Ботинки лесоруба', treeDamage: 10 } },
  ],
  1: [
    { itemId: 7, price: 100, params: { variation: 167, texture: 0, torso: 46, tTexture: 1, undershirt: 86, sex: 0, pockets: '[5,5,5,5,10,5]', clime: '[-5,30]', name: 'Жилетка лесоруба', treeDamage: 10 } },
    { itemId: 8, price: 100, params: { variation: 100, texture: 13, sex: 0, pockets: '[5,5,5,5,10,5]', clime: '[-5,30]', name: 'Штаны лесоруба', treeDamage: 10 } },
    { itemId: 9, price: 100, params: { variation: 26, texture: 0, sex: 0, clime: '[-5,30]', name: 'Ботинки лесоруба', treeDamage: 10 } },
  ],
};

function sexKey(player: mint.Player): 0 | 1 {
  return Number(getSession(player).character?.gender) === 1 ? 1 : 0;
}

export function showMason(player: mint.Player): void {
  const prices = [MASON_TOOL.price, ...MASON_CLOTHES[sexKey(player)].map((item) => item.price)];
  const data = { itemPrices: prices, rockPrice: 10 };
  cef(player, `selectMenu.menus['mason'].init(${JSON.stringify(data)}); selectMenu.showByName('mason');`);
}

export function showWood(player: mint.Player): void {
  const prices = [WOOD_TOOL.price, ...WOOD_CLOTHES[sexKey(player)].map((item) => item.price)];
  const data = { itemPrices: prices, treePrice: 10 };
  cef(player, `selectMenu.menus['woodman'].init(${JSON.stringify(data)}); selectMenu.showByName('woodman');`);
}

export function readGearBuy(raw: unknown): { clothes: boolean; index: number } {
  if (typeof raw === 'string' && raw.startsWith('{')) {
    const data = JSON.parse(raw) as { clothes?: boolean; index?: number };
    return { clothes: data.clothes === true, index: Math.max(0, Math.trunc(Number(data.index) || 0)) };
  }
  const index = Math.max(0, Math.trunc(Number(raw) || 0));
  return { clothes: index > 0, index: index > 0 ? index - 1 : 0 };
}

export async function buyMason(player: mint.Player, clothes: boolean, index: number): Promise<void> {
  await buy(player, 'Каменщик', clothes ? MASON_CLOTHES[sexKey(player)][Math.min(2, index)] : MASON_TOOL);
}

export async function buyWood(player: mint.Player, clothes: boolean, index: number): Promise<void> {
  await buy(player, 'Дровосек', clothes ? WOOD_CLOTHES[sexKey(player)][Math.min(2, index)] : WOOD_TOOL);
}

async function buy(player: mint.Player, header: string, gear: Gear | undefined): Promise<void> {
  if (!gear) return notifyError(player, 'Нет такого товара', header);
  if (!(await removeCash(player, gear.price))) return notifyError(player, `Необходимо $${gear.price}`, header);
  const ok = await giveItem(player, gear.itemId, gear.params);
  if (!ok) {
    await addCash(player, gear.price);
    return notifyError(player, 'Нет места в инвентаре', header);
  }
  notifySuccess(player, 'Вы приобрели снаряжение', header);
}
