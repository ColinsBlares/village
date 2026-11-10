import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { applyWorn } from '../character/clothes.js';
import { giveItem } from '../inventory/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { removeBank, removeCash } from '../world/money.js';
import { onBizPrice } from '../bizes/prices.js';

const PRODUCT_PRICE = 10;
const MASK_ITEM = 14;

interface Shop extends DbRow {
  id: number;
  bizId: number | null;
  priceMultiplier: number;
  x: number;
  y: number;
  z: number;
  fittingX: number;
  fittingY: number;
  fittingZ: number;
  fittingH: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
}

interface MaskRow extends DbRow {
  id: number;
  drawable: number;
  name: string;
  price: number | string;
  isAvailable: number | boolean;
}

let shop: Shop | null = null;
const masks: MaskRow[] = [];
const here = new WeakSet<mint.Player>();
const inside = new WeakSet<mint.Player>();

function note(player: mint.Player, text: string): void {
  cef(player, `selectMenu.loader = false; selectMenu.notification = ${JSON.stringify(text)};`);
}

function afford(player: mint.Player, method: number, price: number): boolean {
  const character = getSession(player).character;
  if (!character) return false;
  const have = method === 1 ? Number(character.bank) || 0 : Number(character.cash) || 0;
  return have >= price;
}

async function stock(need: number): Promise<(DbRow & { productsCount: number; cashBox: number }) | null | false> {
  if (!shop?.bizId) return null;
  const biz = (await table('Biz').findOne({ where: { id: shop.bizId } })) as (DbRow & { productsCount: number; cashBox: number }) | null;
  if (!biz || biz.productsCount < need) return false;
  return biz;
}

function open(player: mint.Player): void {
  const character = getSession(player).character;
  if (!shop || !character || player.vehicle || inside.has(player)) return;
  const multiplier = Number(shop.priceMultiplier) || 1;
  inside.add(player);
  player.dimension = player.id + 1;
  player.pos = new mint.Vector3(shop.fittingX, shop.fittingY, shop.fittingZ);
  player.rot = new mint.Vector3(0, 0, (Number(shop.fittingH) * Math.PI) / 180);
  player.frozen = true;
  player.emit('crp:masks', JSON.stringify({
    list: masks
      .filter((row) => row.isAvailable)
      .map((row) => ({
        id: row.id,
        drawable: row.drawable,
        name: row.name,
        price: Math.trunc(Number(row.price) * multiplier),
      })),
    hair: {
      hairstyle: Number(character.hair) || 0,
      hairColor: Number(character.hairColor) || 0,
      hairHighlightColor: Number(character.hairHighlightColor) || 0,
    },
    cam: {
      x: shop.cameraX,
      y: shop.cameraY,
      z: shop.cameraZ,
      lookX: shop.fittingX,
      lookY: shop.fittingY,
      lookZ: Number(shop.fittingZ) + 0.6,
      fov: 40,
    },
  }));
}

async function close(player: mint.Player): Promise<void> {
  if (!inside.has(player)) return;
  inside.delete(player);
  const character = getSession(player).character;
  player.frozen = false;
  player.dimension = 0;
  if (character) await applyWorn(player, Number(character.id), Number(character.gender) || 0);
  player.emit('crp:fit:stop');
  cef(player, 'selectMenu.show = false;');
}

export async function loadMasks(): Promise<number> {
  const rows = (await table('Mask').findAll()) as MaskRow[];
  masks.splice(0, masks.length, ...rows);
  const shops = (await table('MaskShop').findAll()) as Shop[];
  shop = shops[0] ?? null;
  if (shop) {
    const shape = new mint.ColshapeSphere(shop.x, shop.y, shop.z, 1, 0, true);
    setColshapeHandlers(shape, {
      onEnter: (player) => {
        if (player.vehicle) return;
        here.add(player);
        cef(player, `prompt.show(${JSON.stringify('Нажмите <span>E</span> для того, чтобы посмотреть маски')});`);
      },
      onExit: (player) => {
        here.delete(player);
        cef(player, 'prompt.hide();');
      },
    });
  }
  onBizPrice((bizId, key, value) => {
    if (shop && Number(shop.bizId) === bizId) shop[key] = value;
  });
  mint.log(`crp: масок ${rows.length}`);
  return shop ? 1 : 0;
}

export function installMasks(): void {
  mint.onClient('crp:shop:use', (player: mint.Player) => {
    if (here.has(player)) open(player);
  });
  mint.onClient('masks.shop.exit', (player: mint.Player) => {
    void close(player);
  });
  mint.onClient('masks.buy', async (player: mint.Player, ...args: unknown[]) => {
    const character = getSession(player).character;
    const mask = masks.find((row) => row.id === Number(args[0]));
    const texture = Number(args[1]) || 0;
    const method = Number(args[2]) || 0;
    if (!shop || !inside.has(player) || !character || !mask) return note(player, 'Маска не найдена');
    if (!mask.isAvailable) return note(player, 'Маска недоступна');
    const price = Math.trunc(Number(mask.price) * (Number(shop.priceMultiplier) || 1));
    if (!afford(player, method, price)) return note(player, 'Недостаточно денег');
    const need = Math.trunc((Number(mask.price) * 0.7) / PRODUCT_PRICE);
    const biz = await stock(need);
    if (biz === false) return note(player, 'В магазине кончились маски');
    const added = await giveItem(player, MASK_ITEM, {
      sex: character.gender ? 0 : 1,
      variation: mask.drawable,
      texture,
    });
    if (!added) return note(player, 'Нет места в инвентаре');
    const paid = method === 1 ? await removeBank(player, price) : await removeCash(player, price);
    if (!paid) return note(player, 'Ошибка финансовой операции');
    if (biz) {
      biz.productsCount -= need;
      biz.cashBox += price;
      await biz.save();
    }
    note(player, 'Маска добавлена в инвентарь');
  });
  mint.on('playerDisconnect', (player: mint.Player) => {
    here.delete(player);
    inside.delete(player);
  });
}
