import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { factionInfo, rankNumber } from '../factions/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifySuccess } from '../ui/notify.js';
import { applyBizPrice } from './prices.js';

const SPECS = [
  { model: 'FuelStation', key: 'fuelPrice', name: 'Цена топлива', min: 1, max: 8, integer: true },
  { model: 'Supermarket', key: 'priceMultiplier', name: 'Наценка на товары', min: 1, max: 2, integer: false },
  { model: 'ClothingShop', key: 'priceMultiplier', name: 'Наценка на товары', min: 1, max: 2, integer: false },
  { model: 'Barbershop', key: 'priceMultiplier', name: 'Наценка на товары', min: 1, max: 2, integer: false },
  { model: 'TattooParlor', key: 'priceMultiplier', name: 'Наценка на товары', min: 1, max: 2, integer: false },
  { model: 'MaskShop', key: 'priceMultiplier', name: 'Наценка на товары', min: 1, max: 2, integer: false },
  { model: 'Ammunation', key: 'priceMultiplier', name: 'Наценка на товары', min: 1, max: 2, integer: false },
  { model: 'Eatery', key: 'priceMultiplier', name: 'Наценка на товары', min: 1, max: 2, integer: false },
  { model: 'CarService', key: 'priceMultiplier', name: 'Наценка на товары', min: 1, max: 2, integer: false },
  { model: 'Club', key: 'alcoholPrice', name: 'Цена спиртного', min: 1, max: 8, integer: true },
  { model: 'LosSantosCustoms', key: 'priceMultiplier', name: 'Наценка на товары', min: 1, max: 2, integer: false },
];

async function pointOf(bizId: number): Promise<{ spec: (typeof SPECS)[number]; row: DbRow } | null> {
  for (const spec of SPECS) {
    const row = (await table(spec.model).findOne({ where: { bizId } })) as DbRow | null;
    if (row) return { spec, row };
  }
  return null;
}

function leader(player: mint.Player, factionId: number): boolean {
  const info = factionInfo(factionId);
  if (!info?.ranks.length) return false;
  return rankNumber(player) >= Math.max(...info.ranks.map((rank) => rank.rank));
}

export function installBizFinance(at: WeakMap<mint.Player, number>): void {
  mint.onClient('crp:biz:finance', async (player) => {
    const id = at.get(player);
    const biz = id ? (await table('Biz').findOne({ where: { id } })) as DbRow | null : null;
    const character = getSession(player).character;
    const point = biz ? await pointOf(Number(biz.id)) : null;
    if (!biz || !character || !point) return notifyError(player, 'Экономические параметры бизнеса недоступны', 'Ошибка');
    const owned = Number(biz.characterId) === Number(character.id);
    const faction = Number(biz.factionId) === Number(character.factionId) && leader(player, Number(biz.factionId));
    if (!owned && !faction) return notifyError(player, 'Экономические параметры бизнеса недоступны', 'Ошибка');
    const { spec, row } = point;
    const current = Number(row[spec.key]) || spec.min;
    const step = spec.integer ? 1 : 0.1;
    const values: string[] = [];
    for (let value = spec.min; value < spec.max + step / 2; value += step) values.push(value.toFixed(1));
    const index = Math.max(0, values.findIndex((value) => value === current.toFixed(1)));
    cef(player, [
      `selectMenu.menu = cloneObj(selectMenu.menus["bizEconomic"]);`,
      `selectMenu.menu.items.unshift({ paramKey: ${JSON.stringify(spec.key)}, text: ${JSON.stringify(spec.name)}, values: ${JSON.stringify(values)}, i: ${index}, min: ${JSON.stringify(spec.min.toFixed(1))}, max: ${JSON.stringify(spec.max.toFixed(1))} });`,
      'selectMenu.show = true;',
    ].join('\n'));
  });

  mint.onClient('crp:biz:finance:save', async (player, raw) => {
    let data: { bizId?: number; params?: { key?: string; value?: number | string; paramKey?: string }[] };
    try {
      const parsed = JSON.parse(String(raw ?? '{}')) as { bizId?: number; params?: unknown } | { key?: string; paramKey?: string; value?: number | string }[];
      if (Array.isArray(parsed)) data = { params: parsed };
      else {
        const params = Array.isArray(parsed.params) ? parsed.params : JSON.parse(String(parsed.params ?? '[]'));
        data = { bizId: parsed.bizId, params };
      }
    } catch {
      return notifyError(player, 'Экономические параметры бизнеса недоступны', 'Ошибка');
    }
    const id = Number(data.bizId) || at.get(player);
    const biz = id ? (await table('Biz').findOne({ where: { id } })) as DbRow | null : null;
    const character = getSession(player).character;
    const point = biz ? await pointOf(Number(biz.id)) : null;
    if (!biz || !character || !point) return notifyError(player, 'Экономические параметры бизнеса недоступны', 'Ошибка');
    const owned = Number(biz.characterId) === Number(character.id);
    const faction = Number(biz.factionId) === Number(character.factionId) && leader(player, Number(biz.factionId));
    if (!owned && !faction) return notifyError(player, 'Экономические параметры бизнеса недоступны', 'Ошибка');
    const { spec, row } = point;
    const next = (data.params ?? []).find((param) => (param.key ?? param.paramKey) === spec.key);
    if (!next) return notifyError(player, 'Экономические параметры бизнеса недоступны', 'Ошибка');
    const value = Math.max(spec.min, Math.min(spec.max, Number(next.value)));
    if (!Number.isFinite(value)) return;
    row[spec.key] = spec.integer ? Math.round(value) : Math.round(value * 10) / 10;
    await row.save();
    applyBizPrice(Number(biz.id), spec.key, Number(row[spec.key]));
    notifySuccess(player, 'Экономические параметры успешно изменены', 'Успешно');
  });
}
