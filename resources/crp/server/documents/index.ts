import * as mint from 'mint-server';
import { rankName } from '../factions/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo } from '../ui/notify.js';
import { table } from '../core/db.js';

const PASS = 2608180000;
const CAR = 1703190000;
const LIC = 2206180000;
const GUN = 0;
const MED = 221119000000;
const BADGE = 10000;
const KINDS = ['characterPass', 'carPass', 'driverLicense', 'gunLicense', 'medCard', 'governmentBadge'];

interface Offer {
  from: mint.Player;
  type: string;
  data: string;
}

const offers = new WeakMap<mint.Player, Offer>();

function nameOf(player: mint.Player): string {
  return String(getSession(player).character?.name ?? '');
}

function show(target: mint.Player, type: string, data: unknown): void {
  cef(target, `mp.event.call('documents.show', ${JSON.stringify([type, data])});`);
}

function me(player: mint.Player, text: string): void {
  const name = nameOf(player);
  for (const other of mint.Player.all) {
    if (!other.valid || other.dimension !== player.dimension) continue;
    const dx = other.pos.x - player.pos.x;
    const dy = other.pos.y - player.pos.y;
    const dz = other.pos.z - player.pos.z;
    if (dx * dx + dy * dy + dz * dz <= 225) mint.emitClient(other, 'crp:chat', `!{#dd90ff}${name}[${player.id}] ${text}`);
  }
}

function shown(player: mint.Player, target: mint.Player, self: string, other: string): void {
  const female = getSession(player).character?.gender ? 'а' : '';
  me(player, player.id === target.id ? self : other.replace('{а}', female));
}

async function payload(player: mint.Player, type: string, extra: string): Promise<unknown> {
  const character = getSession(player).character;
  if (!character) return null;
  if (type === 'characterPass') {
    return { name: character.name, sex: character.gender, number: PASS + Number(character.id), regDate: character.creationDate, spouse: null };
  }
  if (type === 'driverLicense') {
    return {
      name: character.name,
      categories: [character.carLicense, character.passengerLicense, character.bikeLicense, character.truckLicense, character.airLicense, character.boatLicense],
      sex: character.gender,
      number: LIC + Number(character.id),
    };
  }
  if (type === 'gunLicense') return { name: character.name, sex: character.gender, number: GUN + Number(character.id), date: character.gunLicenseDate };
  if (type === 'medCard') {
    return { name: character.name, gender: character.gender ? 'Ж' : 'М', identifier: MED + Number(character.id), time: character.medCardDate, factionId: character.factionId };
  }
  if (type === 'governmentBadge') {
    return { name: character.name, gender: character.gender ? 'Женский' : 'Мужской', identifier: BADGE + Number(character.id), factionId: character.factionId, directorSign: 'C.Slade', rank: rankName(player) || 'Нет' };
  }
  const parsed = JSON.parse(extra || '{}') as { id?: number };
  const row = (await table('Vehicle').findOne({ where: { id: Number(parsed.id), owner: character.id } })) as DbRow | null;
  if (!row) return null;
  return { id: CAR + Number(row.id), name: row.modelName, regDate: row.regDate, price: row.price, owners: row.owners, number: row.plate };
}

export function installDocuments(): void {
  mint.onClient('crp:doc:offer', async (player, type, targetId, extra) => {
    const character = getSession(player).character;
    const kind = String(type ?? '');
    if (!character || !KINDS.includes(kind)) return;
    if (kind === 'driverLicense' && !character.carLicense && !character.passengerLicense && !character.bikeLicense && !character.truckLicense && !character.airLicense && !character.boatLicense) {
      return notifyError(player, 'У вас нет лицензий', 'Документы');
    }
    if (kind === 'gunLicense' && !character.gunLicenseDate) return notifyError(player, 'У вас нет лицензии на оружие', 'Документы');
    if (kind === 'medCard' && !character.medCardDate) return notifyError(player, 'У вас нет медкарты', 'Документы');
    if (kind === 'governmentBadge' && ![2, 3, 4].includes(Number(character.factionId))) return notifyError(player, 'Вы не сотрудник PD/FIB', 'Документы');
    const target = mint.Player.getByID(Number(targetId));
    if (!target?.valid) return;
    const data = await payload(player, kind, String(extra ?? ''));
    if (!data) return notifyError(player, 'Документ не найден', 'Документы');
    if (target.id === player.id) {
      shown(player, target, selfText(kind), otherText(kind));
      show(target, kind, data);
      return;
    }
    offers.set(target, { from: player, type: kind, data: JSON.stringify(data) });
    notifyInfo(player, 'Вы предложили игроку посмотреть документы', 'Документы');
    cef(target, `offerDialog.show('documents', ${JSON.stringify({ name: nameOf(player), doc: docTitle(kind) })});`);
  });
  mint.onClient('crp:doc:accept', (player, accept) => {
    const offer = offers.get(player);
    if (!offer || !offer.from.valid) return;
    offers.delete(player);
    if (accept !== true && accept !== 1) return;
    const data = JSON.parse(offer.data) as unknown;
    shown(offer.from, player, selfText(offer.type), otherText(offer.type));
    show(player, offer.type, data);
  });
  mint.onClient('crp:doc:cars', async (player) => {
    const character = getSession(player).character;
    if (!character) return;
    const rows = (await table('Vehicle').findAll({ where: { owner: character.id, key: 'private' } })) as DbRow[];
    if (!rows.length) return notifyError(player, 'У вас нет транспорта', 'Ошибка');
    mint.emitClient(player, 'crp:doc:cars', JSON.stringify(rows.map((row) => ({ id: row.id, plate: row.plate }))));
  });
}

function docTitle(type: string): string {
  if (type === 'carPass') return 'паспорт Т/С';
  if (type === 'driverLicense') return 'лицензии на Т/С';
  if (type === 'gunLicense') return 'лицензию на оружие';
  if (type === 'medCard') return 'медкарту';
  if (type === 'governmentBadge') return 'удостоверение';
  return 'паспорт';
}

function selfText(type: string): string {
  if (type === 'carPass') return 'смотрит паспорт Т/С';
  if (type === 'driverLicense') return 'смотрит свои лицензии на Т/С';
  if (type === 'gunLicense') return 'смотрит свою лицензию на оружие';
  if (type === 'medCard') return 'смотрит свою медкарту';
  if (type === 'governmentBadge') return 'смотрит свое удостоверение';
  return 'смотрит свой паспорт';
}

function otherText(type: string): string {
  if (type === 'carPass') return 'показал{а} паспорт своего Т/С';
  if (type === 'driverLicense') return 'показал{а} свои лицензии на Т/С';
  if (type === 'gunLicense') return 'показал{а} свою лицензию на оружие';
  if (type === 'medCard') return 'показал{а} свою медкарту';
  if (type === 'governmentBadge') return 'показал{а} свое удостоверение';
  return 'показал{а} свой паспорт';
}
