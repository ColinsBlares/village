import * as mint from 'mint-server';
import { db, table } from '../core/db.js';
import { factionKind } from '../factions/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifySuccess } from '../ui/notify.js';
import { addBank, addCash, removeCash } from '../world/money.js';
import { addServiceCall, installTablet, takePoliceCall } from './tablet.js';

const PRICE = 5;

function like(): symbol {
  return (db.Op as { like: symbol }).like;
}

interface Ad {
  id: number;
  characterId: number;
  name: string;
  text: string;
  price: number;
}

const ads: Ad[] = [];
let adSeq = 1;
const lastAd = new Map<number, number>();

function police(player: mint.Player): boolean {
  const kind = factionKind(Number(getSession(player).character?.factionId) || 0);
  return kind === 'police' || kind === 'fib';
}

function news(player: mint.Player): boolean {
  return factionKind(Number(getSession(player).character?.factionId) || 0) === 'news';
}

async function people(where: object): Promise<unknown[]> {
  const rows = (await table('Character').findAll({ where, limit: 20 })) as DbRow[];
  const result = [];
  for (const row of rows) {
    const phone = (await table('Phone').findOne({ where: { characterId: row.id } })) as DbRow | null;
    const house = (await table('House').findOne({ where: { characterId: row.id } })) as DbRow | null;
    result.push({
      id: row.id,
      num: result.length + 1,
      name: row.name,
      phone: phone?.number ?? '-',
      address: house ? `Дом #${house.id}` : '-',
      housePos: house ? { x: house.pickupX, y: house.pickupY, z: house.pickupZ } : null,
    });
  }
  return result;
}

function show(player: mint.Player, result: unknown[]): void {
  const store = factionKind(Number(getSession(player).character?.factionId) || 0) === 'fib' ? 'mapCaseFIBDBResultData' : 'mapCasePdDBResultData';
  const arg = JSON.stringify(JSON.stringify(result));
  cef(player, `(function(){var box=window[${JSON.stringify(store)}];if(box&&typeof box.setResult==='function')box.setResult(${arg});})();`);
}

export function installMapCase(): void {
  installTablet();
  mint.onClient('crp:pd:phone', async (player, raw) => {
    if (!police(player)) return notifyError(player, 'Вы не являетесь сотрудником', 'Планшет');
    const phone = (await table('Phone').findOne({ where: { number: { [like()]: `%${String(raw ?? '').replace(/%/g, '')}%` } } })) as DbRow | null;
    show(player, phone ? await people({ id: phone.characterId }) : []);
  });
  mint.onClient('crp:pd:name', async (player, raw) => {
    if (!police(player)) return notifyError(player, 'Вы не являетесь сотрудником', 'Планшет');
    const query = String(raw ?? '').trim().replace(/%/g, '');
    show(player, query ? await people({ name: { [like()]: `%${query}%` } }) : []);
  });
  mint.onClient('crp:pd:car', async (player, raw) => {
    if (!police(player)) return notifyError(player, 'Вы не являетесь сотрудником', 'Планшет');
    const plate = String(raw ?? '').trim().replace(/%/g, '');
    const vehicles = plate
      ? (await table('Vehicle').findAll({ where: { key: 'private', plate: { [like()]: `%${plate}%` } }, limit: 20 })) as DbRow[]
      : [];
    const ids = [...new Set(vehicles.map((row) => Number(row.owner)))];
    const result = [];
    for (const id of ids) result.push(...await people({ id }));
    show(player, result);
  });
  mint.onClient('crp:pd:call', (player, raw) => {
    addServiceCall(player, String(raw ?? ''), 'pd');
  });
  mint.onClient('crp:pd:call:take', (player, rawId) => {
    takePoliceCall(player, Number(rawId));
  });
  mint.onClient('crp:news:ad', async (player, raw) => {
    const header = 'Weazel News';
    const text = String(raw ?? '').trim().slice(0, 160);
    const character = getSession(player).character;
    if (!character || !text) return;
    const phone = (await table('Phone').findOne({ where: { characterId: character.id } })) as DbRow | null;
    if (!phone) return notifyError(player, 'Необходим телефон', header);
    if (ads.some((ad) => ad.characterId === Number(character.id))) return notifyError(player, 'Ожидайте публикацию пред. объявления', header);
    const wait = 30 * 1000 - (Date.now() - (lastAd.get(Number(character.id)) ?? 0));
    if (wait > 0) return notifyError(player, `Повторная отправка доступна через ${Math.ceil(wait / 1000)} сек.`, header);
    const price = PRICE * text.length;
    if (!(await removeCash(player, price))) return notifyError(player, `Необходимо $${price}`, header);
    lastAd.set(Number(character.id), Date.now());
    ads.push({ id: adSeq++, characterId: Number(character.id), name: String(character.name), text, price });
    for (const editor of mint.Player.all) {
      if (editor.valid && news(editor)) cef(editor, `mapCaseWnewsAdsData.adsAmount = ${ads.length};`);
    }
    notifySuccess(player, 'Объявление отправлено', header);
  });
  mint.onClient('crp:news:list', (player) => {
    if (!news(player)) return;
    const ad = ads[0];
    cef(player, `mapCaseWnewsAdsData.adsAmount = ${ads.length};`);
    if (ad) cef(player, `(function(){if(window.mapCaseWnewsAdsData&&typeof mapCaseWnewsAdsData.setAd==='function')mapCaseWnewsAdsData.setAd(${JSON.stringify(ad)});})();`);
  });
  mint.onClient('crp:news:accept', async (player, raw) => {
    if (!news(player)) return;
    const data = JSON.parse(String(raw ?? '{}')) as { id?: number };
    const index = ads.findIndex((ad) => ad.id === Number(data.id));
    const ad = index >= 0 ? ads[index] : ads[0];
    if (!ad) return;
    ads.splice(Math.max(0, index), 1);
    const pay = Math.min(200, ad.price) * 0.3;
    await addBank(player, Math.trunc(pay));
    for (const other of mint.Player.all) {
      if (other.valid) mint.emitClient(other, 'crp:chat', `!{#bd7aff}[WN] ${ad.name}: ${ad.text}`);
    }
    notifySuccess(player, 'Объявление опубликовано', 'Weazel News');
    cef(player, `mapCaseWnewsAdsData.adsAmount = ${ads.length};`);
  });
  mint.onClient('crp:news:cancel', async (player, raw) => {
    if (!news(player)) return;
    const data = JSON.parse(String(raw ?? '{}')) as { id?: number };
    const index = ads.findIndex((ad) => ad.id === Number(data.id));
    if (index < 0) return;
    const [ad] = ads.splice(index, 1);
    const author = mint.Player.all.find((entry) => entry.valid && Number(getSession(entry).character?.id) === ad.characterId);
    if (author) await addCash(author, ad.price);
    notifySuccess(player, 'Объявление отклонено', 'Weazel News');
  });
}
