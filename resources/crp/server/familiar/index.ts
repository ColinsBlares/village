import * as mint from 'mint-server';
import { db, table } from '../core/db.js';
import { playTimed } from '../animations/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifySuccess } from '../ui/notify.js';

const HEADER = 'Знакомство';
const MAX = 100;
const RANGE = 10;

function opOr(): symbol {
  return (db.Op as { or: symbol }).or;
}

async function pairExists(a: number, b: number): Promise<boolean> {
  const row = (await table('Familiar').findOne({
    where: {
      [opOr()]: [
        { characterA: a, characterB: b },
        { characterA: b, characterB: a },
      ],
    },
  })) as DbRow | null;
  return row != null;
}

async function otherName(selfId: number, row: DbRow): Promise<string> {
  const otherId = Number(row.characterA) === selfId ? Number(row.characterB) : Number(row.characterA);
  const character = (await table('Character').findOne({ where: { id: otherId } })) as DbRow | null;
  return String(character?.name ?? '');
}

export async function sendFamiliarList(player: mint.Player): Promise<void> {
  const character = getSession(player).character;
  if (!character) return;
  const rows = (await table('Familiar').findAll({
    where: { [opOr()]: [{ characterA: character.id }, { characterB: character.id }] },
    limit: MAX,
  })) as DbRow[];
  const names: string[] = [];
  for (const row of rows) {
    const name = await otherName(character.id, row);
    if (name) names.push(name);
  }
  mint.emitClient(player, 'crp:familiar:init', JSON.stringify(names));
  cef(player, `typeof playerMenu !== 'undefined' && playerMenu.setFamiliar && playerMenu.setFamiliar(${names.length});`);
}

async function trimOld(characterId: number): Promise<void> {
  const rows = (await table('Familiar').findAll({
    where: { [opOr()]: [{ characterA: characterId }, { characterB: characterId }] },
    order: [['id', 'ASC']],
  })) as DbRow[];
  while (rows.length > MAX) {
    const old = rows.shift();
    if (old) await old.destroy();
  }
}

export function installFamiliar(): void {
  mint.onClient('crp:familiar:add', async (player, targetId) => {
    const character = getSession(player).character;
    const target = mint.Player.getByID(Number(targetId));
    const other = target ? getSession(target).character : null;
    if (!character || !target?.valid || !other) return notifyError(player, `Игрок #${targetId} не найден`, HEADER);
    if (player.pos.distanceTo(target.pos) > RANGE || player.dimension !== target.dimension) {
      return notifyError(player, `${target.name} далеко`, HEADER);
    }
    if (await pairExists(character.id, other.id)) return notifyError(player, `Вы уже знакомы с ${target.name}`, HEADER);
    cef(target, `offerDialog.show('familiar', ${JSON.stringify({ playerId: player.id })});`);
  });

  mint.onClient('crp:familiar:accept', async (player, fromId) => {
    const character = getSession(player).character;
    const from = mint.Player.getByID(Number(fromId));
    const initiator = from ? getSession(from).character : null;
    if (!character || !from?.valid || !initiator) return notifyError(player, `Игрок #${fromId} не найден`, HEADER);
    if (player.pos.distanceTo(from.pos) > RANGE || player.dimension !== from.dimension) {
      return notifyError(player, `${from.name} далеко`, HEADER);
    }
    if (await pairExists(character.id, initiator.id)) return notifyError(player, `Вы уже знакомы с ${from.name}`, HEADER);
    if (player.getSyncedMeta('crp:knocked') != null) {
      return notifyError(player, 'Игрок не в состоянии знакомиться', HEADER);
    }
    await table('Familiar').create({ characterA: initiator.id, characterB: character.id });
    await trimOld(initiator.id);
    await trimOld(character.id);
    await sendFamiliarList(player);
    await sendFamiliarList(from);
    const aName = String(getSession(from).character?.name ?? from.name);
    const bName = String(character.name ?? player.name);
    mint.emitClient(from, 'crp:familiar:add', bName);
    mint.emitClient(player, 'crp:familiar:add', aName);
    notifySuccess(from, `${bName} ваш новый знакомый`, HEADER);
    notifySuccess(player, `${aName} ваш новый знакомый`, HEADER);
    if (!from.vehicle && from.getSyncedMeta('crp:knocked') == null) {
      playTimed(from, 'mp_ped_interaction', 'handshake_guy_a', 1, 5000);
    }
    if (!player.vehicle) playTimed(player, 'mp_ped_interaction', 'handshake_guy_a', 1, 5000);
  });
}
