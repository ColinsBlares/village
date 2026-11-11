import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { applyWorn } from '../character/clothes.js';
import { giveItem } from '../inventory/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { removeBank, removeCash } from '../world/money.js';
import { ITEM_IDS, clothDlcHash, clothesOf, loadClothes, type Cloth } from '../clothes/index.js';
import { onBizPrice } from '../bizes/prices.js';

const PRODUCT_PRICE = 20;
const HEADERS = ['binco.png', 'discount.png', 'suburban.png', 'ponsonbys.png'];

interface Piece {
  id: number;
  name: string;
  price: number;
  variation: number;
  textures: number[];
  dlc?: number;
  torso?: number;
  undershirt?: number;
  pockets?: unknown;
  clime?: unknown;
}

interface Shop extends DbRow {
  id: number;
  bizId: number | null;
  bType: number;
  class: number;
  priceMultiplier: number;
  x: number;
  y: number;
  z: number;
  placeX: number;
  placeY: number;
  placeZ: number;
  placeH: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
}

const shops = new Map<number, Shop>();
const here = new WeakMap<mint.Player, Shop>();
const fitting = new WeakMap<mint.Player, { shop: Shop; lists: Record<string, Piece[]> }>();

function numbers(value: unknown): number[] {
  if (Array.isArray(value)) return value.map((item) => Number(item) || 0);
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map((item) => Number(item) || 0) : [];
  } catch {
    return [];
  }
}

function pieceOf(row: Cloth): Piece {
  const piece: Piece = {
    id: Number(row.id),
    name: String(row.name ?? ''),
    price: Number(row.price) || 0,
    variation: Number(row.variation) || 0,
    textures: numbers(row.textures),
  };
  const dlc = clothDlcHash(row.dlc);
  if (dlc) piece.dlc = dlc;
  if (row.torso != null) piece.torso = Number(row.torso) || 0;
  if (row.undershirt != null) piece.undershirt = Number(row.undershirt) || 0;
  if (row.pockets != null) piece.pockets = row.pockets;
  if (row.clime != null) piece.clime = row.clime;
  return piece;
}

function note(player: mint.Player, text: string): void {
  cef(player, `selectMenu.loader = false; selectMenu.notification = ${JSON.stringify(text)};`);
}

function afford(player: mint.Player, method: number, price: number): boolean {
  const character = getSession(player).character;
  if (!character) return false;
  const have = method === 1 ? Number(character.bank) || 0 : Number(character.cash) || 0;
  return have >= price;
}

async function stock(shop: Shop, basePrice: number): Promise<(DbRow & { productsCount: number; cashBox: number }) | null | false> {
  if (!shop.bizId) return null;
  const need = Math.trunc((basePrice * 0.8) / PRODUCT_PRICE);
  const biz = (await table('Biz').findOne({ where: { id: shop.bizId } })) as (DbRow & { productsCount: number; cashBox: number }) | null;
  if (!biz || biz.productsCount < need) return false;
  return biz;
}

function open(player: mint.Player, shop: Shop): void {
  const character = getSession(player).character;
  if (!character || player.vehicle || player.dimension !== 0) return;
  const sex = character.gender ? 0 : 1;
  const lists: Record<string, Piece[]> = {};
  for (const group of Object.keys(ITEM_IDS)) {
    const rows = clothesOf(sex, group)
      .filter((row) => Number(row.class) === Number(shop.class))
      .map(pieceOf);
    if (rows.length) lists[group] = rows;
  }
  fitting.set(player, { shop, lists });
  player.dimension = player.id + 1;
  player.pos = new mint.Vector3(shop.placeX, shop.placeY, shop.placeZ);
  player.rot = new mint.Vector3(0, 0, (Number(shop.placeH) * Math.PI) / 180);
  player.frozen = true;
  player.emit('crp:clothing', JSON.stringify({
    bType: Number(shop.bType) || 0,
    multiplier: Number(shop.priceMultiplier) || 1,
    header: HEADERS[Number(shop.bType)] ?? HEADERS[0],
    lists,
    hair: {
      hairstyle: Number(character.hair) || 0,
      hairColor: Number(character.hairColor) || 0,
      hairHighlightColor: Number(character.hairHighlightColor) || 0,
    },
    cam: {
      x: shop.cameraX,
      y: shop.cameraY,
      z: shop.cameraZ,
      lookX: shop.placeX,
      lookY: shop.placeY,
      lookZ: shop.placeZ,
      fov: 42,
    },
  }));
}

async function close(player: mint.Player): Promise<void> {
  const room = fitting.get(player);
  if (!room) return;
  fitting.delete(player);
  const character = getSession(player).character;
  player.frozen = false;
  player.dimension = 0;
  if (character) await applyWorn(player, Number(character.id), Number(character.gender) || 0);
  player.emit('crp:fit:stop');
  cef(player, 'selectMenu.show = false;');
}

export async function loadClothingShops(): Promise<number> {
  const clothes = await loadClothes();
  const rows = (await table('ClothingShop').findAll()) as Shop[];
  for (const shop of rows) {
    shops.set(Number(shop.id), shop);
    const shape = new mint.ColshapeSphere(shop.x, shop.y, shop.z, 1, 0, true);
    setColshapeHandlers(shape, {
      onEnter: (player) => {
        here.set(player, shop);
        cef(player, `prompt.show(${JSON.stringify('Используйте <span>E</span> для того, чтобы войти в примерочную')});`);
      },
      onExit: (player) => {
        here.delete(player);
        cef(player, 'prompt.hide();');
      },
    });
  }
  onBizPrice((bizId, key, value) => {
    for (const shop of shops.values()) if (Number(shop.bizId) === bizId) shop[key] = value;
  });
  mint.log(`crp: одежда ${clothes}, магазинов ${rows.length}`);
  return rows.length;
}

export function installClothing(): void {
  mint.onClient('crp:shop:use', (player: mint.Player) => {
    const shop = here.get(player);
    if (shop && !fitting.has(player)) open(player, shop);
  });
  mint.onClient('clothingShop.exit', (player: mint.Player) => {
    void close(player);
  });
  mint.onClient('clothingShop.item.buy', async (player: mint.Player, ...args: unknown[]) => {
    const room = fitting.get(player);
    const character = getSession(player).character;
    const group = String(args[0] ?? '');
    const itemId = Number(args[1]);
    const textureIndex = Number(args[2]) || 0;
    const method = Number(args[3]) || 0;
    const item = room?.lists[group]?.find((row) => row.id === itemId);
    if (!room || !character || !item || !ITEM_IDS[group]) return note(player, 'Предмет не найден');
    const price = Math.trunc(item.price * (Number(room.shop.priceMultiplier) || 1));
    if (!afford(player, method, price)) return note(player, 'Недостаточно денег');
    const biz = await stock(room.shop, item.price);
    if (biz === false) return note(player, 'В магазине кончилась одежда');
    const params: Record<string, unknown> = {
      sex: character.gender ? 0 : 1,
      variation: item.variation,
      texture: item.textures[textureIndex] ?? 0,
      name: item.name,
    };
    if (item.dlc) params.dlc = item.dlc;
    if (item.torso != null) params.torso = item.torso;
    if (item.undershirt != null) {
      params.undershirt = item.undershirt;
      params.uTexture = 0;
    }
    if (item.clime != null) params.clime = typeof item.clime === 'string' ? item.clime : JSON.stringify(item.clime);
    if (item.pockets != null) params.pockets = typeof item.pockets === 'string' ? item.pockets : JSON.stringify(item.pockets);
    const added = await giveItem(player, ITEM_IDS[group], params);
    if (!added) return note(player, 'Нет места в инвентаре');
    const paid = method === 1 ? await removeBank(player, price) : await removeCash(player, price);
    if (!paid) return note(player, 'Ошибка финансовой операции');
    if (biz) {
      biz.productsCount -= Math.trunc((item.price * 0.8) / PRODUCT_PRICE);
      biz.cashBox += price;
      await biz.save();
    }
    note(player, 'Предмет добавлен в инвентарь');
  });
  mint.on('playerDisconnect', (player: mint.Player) => {
    here.delete(player);
    fitting.delete(player);
  });
}
