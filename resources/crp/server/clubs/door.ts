import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { allowMove } from '../anticheat/index.js';
import { factionInfo } from '../factions/index.js';
import { giveItem } from '../inventory/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifySuccess, notifyWarning } from '../ui/notify.js';
import { addCash, removeCash } from '../world/money.js';
import { CLUB_ALCOHOL, CLUB_SMOKE, CLUB_SNACKS, type ClubItem } from './menu.js';

export interface ClubPlace {
  row: DbRow;
  biz: DbRow | null;
  factionId: number;
  name: string;
}

const open = new Map<number, boolean>();
const inside = new WeakMap<mint.Player, ClubPlace>();

function leader(player: mint.Player, factionId: number): boolean {
  const info = factionInfo(factionId);
  const character = getSession(player).character;
  if (!info?.ranks.length || !character) return false;
  const top = info.ranks.reduce((best, rank) => (rank.rank > best.rank ? rank : best));
  return Number(character.factionRank) === top.id;
}

function placeOf(player: mint.Player): ClubPlace | undefined {
  return inside.get(player);
}

async function payClub(place: ClubPlace, price: number): Promise<void> {
  if (place.biz) {
    place.biz.productsCount = Math.max(0, (Number(place.biz.productsCount) || 0) - price);
    void place.biz.save();
  }
  const faction = (await table('Faction').findOne({ where: { id: place.factionId } })) as DbRow | null;
  if (!faction) return;
  faction.cash = (Number(faction.cash) || 0) + price;
  await faction.save();
}

async function buy(player: mint.Player, list: ClubItem[], raw: unknown, itemId: number): Promise<void> {
  const place = placeOf(player);
  if (!place) return notifyError(player, 'Вы не в клубе');
  const index = Math.max(0, Math.min(list.length - 1, Math.trunc(Number(raw) || 0)));
  const item = list[index];
  if (!item) return notifyError(player, 'Клуб не найден');
  const header = `Барная стойка ${place.name}`;
  const factor = Number(place.row.alcoholPrice) || 1;
  const price = Math.trunc(item.price * factor);
  if (!(await removeCash(player, price))) return notifyError(player, `Необходимо $${price}`, header);
  const ok = await giveItem(player, itemId, item.params);
  if (!ok) {
    await addCash(player, price);
    return notifyError(player, 'Нет места в инвентаре', header);
  }
  await payClub(place, price);
  notifySuccess(player, `Вы приобрели ${item.params.name}`, header);
}

export function enterClub(player: mint.Player, place: ClubPlace): boolean {
  if (player.vehicle) return false;
  const id = Number(place.row.id);
  if (open.get(id) === false) {
    if (Number(getSession(player).character?.factionId) !== place.factionId) {
      notifyError(player, 'Клуб закрыт', place.name);
      return false;
    }
    notifyWarning(player, 'Вы вошли в закрытый клуб как член мафии', place.name);
  }
  inside.set(player, place);
  const factor = Number(place.row.alcoholPrice) || 1;
  cef(player, [
    `selectMenu.menus["club"].init(${JSON.stringify({
      name: place.name,
      hasControl: leader(player, place.factionId),
      alcoholPrice: factor,
      alcohol: CLUB_ALCOHOL[place.factionId] ?? [],
      snacks: CLUB_SNACKS[place.factionId] ?? [],
      smoke: CLUB_SMOKE[place.factionId] ?? [],
    })});`,
    `prompt.showByName('clubs_buy');`,
    `selectMenu.showByName('club');`,
  ].join('\n'));
  allowMove(player);
  player.dimension = place.factionId;
  player.pos = new mint.Vector3(Number(place.row.exitX), Number(place.row.exitY) + 2, Number(place.row.exitZ));
  player.rot = new mint.Vector3(0, 0, ((Number(place.row.exitH) || 0) * Math.PI) / 180);
  return true;
}

export function leaveClub(player: mint.Player, place: ClubPlace): void {
  if (player.vehicle || !inside.has(player)) return;
  inside.delete(player);
  cef(player, `prompt.hide(); selectMenu.show = false;`);
  allowMove(player);
  player.dimension = 0;
  player.pos = new mint.Vector3(Number(place.row.enterX), Number(place.row.enterY) - 2, Number(place.row.enterZ));
  player.rot = new mint.Vector3(0, 0, ((Number(place.row.enterH) || 0) * Math.PI) / 180);
}

export function installClubDoors(): void {
  mint.onClient('crp:club:open', (player, raw) => {
    const place = placeOf(player);
    if (!place) return notifyError(player, 'Вы не в клубе');
    const header = `Управление ${place.name}`;
    if (!leader(player, place.factionId)) return notifyError(player, 'Вы не владелец клуба', header);
    const opened = !(raw === false || raw === 0 || raw === '0' || raw === 'false');
    open.set(Number(place.row.id), opened);
    notifySuccess(player, `Клуб ${opened ? 'открыт' : 'закрыт'}`, header);
  });
  mint.onClient('crp:club:alcohol', (player, raw) => {
    const place = placeOf(player);
    void buy(player, CLUB_ALCOHOL[place?.factionId ?? 0] ?? [], raw, 133);
  });
  mint.onClient('crp:club:snack', (player, raw) => {
    const place = placeOf(player);
    void buy(player, CLUB_SNACKS[place?.factionId ?? 0] ?? [], raw, 134);
  });
  mint.onClient('crp:club:smoke', (player, raw) => {
    const place = placeOf(player);
    void buy(player, CLUB_SMOKE[place?.factionId ?? 0] ?? [], raw, 16);
  });
}
