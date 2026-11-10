import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess } from '../ui/notify.js';
import { removeCash } from '../world/money.js';
import { vehicleBySqlId } from '../vehicles/index.js';
import { pushFaction, pushFactionRank } from '../player/menu.js';
import { factionInfo, rankNumber } from './index.js';

const RESPAWN = 1000;

function factionId(player: mint.Player): number {
  return Number(getSession(player).character?.factionId) || 0;
}

function leader(player: mint.Player): boolean {
  const info = factionInfo(factionId(player));
  if (!info?.ranks.length) return false;
  const top = Math.max(...info.ranks.map((rank) => rank.rank));
  return rankNumber(player) >= top;
}

function names(id: number): string[] {
  return (factionInfo(id)?.ranks ?? []).slice().sort((a, b) => a.rank - b.rank).map((rank) => rank.name);
}

function rankByNumber(id: number, number: number): { id: number; rank: number; name: string } | undefined {
  return factionInfo(id)?.ranks.find((rank) => rank.rank === number);
}

async function characterBy(data: { sqlId?: number; recId?: number }): Promise<{ row: DbRow; online: mint.Player | null }> {
  const sqlId = Number(data.sqlId) || 0;
  const onlineById = data.recId != null ? mint.Player.getByID(Number(data.recId)) : null;
  const online = mint.Player.all.find((player) => player.valid && Number(getSession(player).character?.id) === sqlId) ?? onlineById;
  const row = online?.valid && getSession(online).character
    ? getSession(online).character!
    : (await table('Character').findOne({ where: { id: sqlId || Number(getSession(online ?? ({} as mint.Player)).character?.id) } })) as DbRow | null;
  if (!row) throw new Error('missing');
  return { row, online: online?.valid ? online : null };
}

export function installFactionControl(): void {
  mint.onClient('crp:faction:members', async (player, offline) => {
    const id = factionId(player);
    const info = factionInfo(id);
    if (!info) return notifyError(player, 'Вы не состоите в организации', 'Организация');
    if (rankNumber(player) < info.giveRankRank) return notifyError(player, 'Недостаточно прав', 'Организация');
    const rows = (await table('Character').findAll({ where: { factionId: id } })) as DbRow[];
    const onlineIds = new Set(mint.Player.all.filter((other) => other.valid).map((other) => Number(getSession(other).character?.id)));
    const members = rows
      .filter((row) => (offline === true || offline === 1 ? !onlineIds.has(Number(row.id)) : onlineIds.has(Number(row.id))))
      .map((row) => {
        const live = mint.Player.all.find((other) => other.valid && Number(getSession(other).character?.id) === Number(row.id));
        return {
          id: live?.id ?? row.id,
          sqlId: row.id,
          name: row.name,
          rank: info.ranks.find((rank) => rank.id === Number(row.factionRank))?.rank ?? 0,
        };
      });
    cef(player, `selectMenu.menus['factionControlMembers'].init(${JSON.stringify({ members, rankNames: names(id) })}); selectMenu.showByName('factionControlMembers');`);
  });

  mint.onClient('crp:faction:members:rank', async (player, raw) => {
    const id = factionId(player);
    const info = factionInfo(id);
    const data = JSON.parse(String(raw ?? '{}')) as { sqlId?: number; recId?: number; rank?: number };
    if (!info) return notifyError(player, 'Вы не состоите в организации', 'Организация');
    if (rankNumber(player) < info.giveRankRank) return notifyError(player, 'Недостаточно прав', 'Организация');
    let found: { row: DbRow; online: mint.Player | null };
    try {
      found = await characterBy(data);
    } catch {
      return notifyError(player, 'Игрок не найден', 'Организация');
    }
    if (Number(found.row.factionId) !== id) return notifyError(player, `${found.row.name} не вашей организации`, 'Организация');
    const next = rankByNumber(id, Number(data.rank));
    if (!next) return notifyError(player, 'Ранг не найден', 'Организация');
    if (next.rank >= rankNumber(player)) return notifyError(player, 'Нельзя повысить до своего ранга или выше', 'Организация');
    found.row.factionRank = next.id;
    await found.row.save();
    if (found.online) {
      const character = getSession(found.online).character;
      if (character) character.factionRank = next.id;
      pushFactionRank(found.online);
      notifyInfo(found.online, `${player.name} изменил ваш ранг на ${next.name}`, 'Организация');
    }
    notifySuccess(player, `${found.row.name} теперь ${next.name}`, 'Организация');
  });

  mint.onClient('crp:faction:members:uval', async (player, raw) => {
    const id = factionId(player);
    const info = factionInfo(id);
    const data = JSON.parse(String(raw ?? '{}')) as { sqlId?: number; recId?: number };
    if (!info) return notifyError(player, 'Вы не состоите в организации', 'Организация');
    if (rankNumber(player) < info.uvalRank) return notifyError(player, 'Недостаточно прав', 'Организация');
    let found: { row: DbRow; online: mint.Player | null };
    try {
      found = await characterBy(data);
    } catch {
      return notifyError(player, 'Игрок не найден', 'Организация');
    }
    const theirs = info.ranks.find((rank) => rank.id === Number(found.row.factionRank))?.rank ?? 0;
    if (Number(found.row.factionId) !== id) return notifyError(player, `${found.row.name} не вашей организации`, 'Организация');
    if (rankNumber(player) <= theirs) return notifyError(player, `${found.row.name} должен иметь ниже ранг`, 'Организация');
    found.row.factionId = null;
    found.row.factionRank = null;
    await found.row.save();
    if (found.online) {
      const character = getSession(found.online).character;
      if (character) {
        character.factionId = null;
        character.factionRank = null;
      }
      cef(found.online, 'mapCase.enable = false;');
      pushFaction(found.online);
      notifyInfo(found.online, `${player.name} вас уволил`, 'Организация');
    }
    notifySuccess(player, `${found.row.name} уволен`, 'Организация');
  });

  mint.onClient('crp:faction:access', async (player, raw) => {
    const id = factionId(player);
    const info = factionInfo(id);
    const data = JSON.parse(String(raw ?? '{}')) as { index?: number; rank?: number };
    if (!info || !leader(player)) return notifyError(player, 'Вы не лидер', 'Организация');
    const key = (['inviteRank', 'uvalRank', 'giveRankRank'] as const)[Number(data.index)] ;
    if (!key) return;
    const rank = Math.max(1, Math.trunc(Number(data.rank) || 1));
    info[key] = rank;
    const row = (await table('Faction').findOne({ where: { id } })) as DbRow | null;
    if (row) {
      row[key] = rank;
      await row.save();
    }
    notifySuccess(player, 'Доступ к составу изменён', info.name);
  });

  mint.onClient('crp:faction:ranks:name', async (player, raw) => {
    const id = factionId(player);
    const info = factionInfo(id);
    const data = JSON.parse(String(raw ?? '{}')) as { rank?: number; name?: string };
    if (!info || !leader(player)) return notifyError(player, 'Вы не лидер', 'Организация');
    const rank = rankByNumber(id, Number(data.rank));
    const name = String(data.name ?? '').trim();
    if (!rank || !name) return notifyError(player, 'Ранг не найден', 'Организация');
    rank.name = name;
    const row = (await table('FactionRank').findOne({ where: { id: rank.id } })) as DbRow | null;
    if (row) {
      row.name = name;
      await row.save();
    }
    notifySuccess(player, `Ранг ${data.rank} теперь ${name}`, info.name);
  });

  mint.onClient('crp:faction:vehicles', async (player) => {
    const id = factionId(player);
    if (!factionInfo(id) || !leader(player)) return notifyError(player, 'Вы не лидер', 'Организация');
    const rows = (await table('Vehicle').findAll({ where: { key: 'faction', owner: id } })) as DbRow[];
    const gates = (await table('FactionVehicleRank').findAll()) as DbRow[];
    const vehicles = rows.map((row) => ({
      id: row.id,
      name: row.modelName,
      plate: row.plate,
      minRank: gates.find((gate) => Number(gate.vehicleId) === Number(row.id))?.rank ?? null,
    }));
    cef(player, `selectMenu.menus['factionControlVehicles'].init(${JSON.stringify({ vehicles })}); selectMenu.showByName('factionControlVehicles');`);
  });

  mint.onClient('crp:faction:vehicles:rank', async (player, raw) => {
    const id = factionId(player);
    const data = JSON.parse(String(raw ?? '{}')) as { vehId?: number; rank?: number };
    if (!leader(player)) return notifyError(player, 'Вы не лидер', 'Организация');
    const row = (await table('Vehicle').findOne({ where: { id: Number(data.vehId), key: 'faction', owner: id } })) as DbRow | null;
    if (!row) return notifyError(player, 'Авто не найдено', 'Организация');
    const rank = Math.max(1, Math.trunc(Number(data.rank) || 1));
    let gate = (await table('FactionVehicleRank').findOne({ where: { vehicleId: row.id } })) as DbRow | null;
    if (!gate) gate = (await table('FactionVehicleRank').create({ vehicleId: row.id, rank })) as DbRow;
    else {
      gate.rank = rank;
      await gate.save();
    }
    notifySuccess(player, `Ранг авто ${row.modelName} — ${rank}`, 'Организация');
  });

  mint.onClient('crp:faction:vehicles:respawn', async (player) => {
    const id = factionId(player);
    const info = factionInfo(id);
    if (!info || !leader(player)) return notifyError(player, 'Вы не лидер', 'Организация');
    if (!(await removeCash(player, RESPAWN))) return notifyError(player, `Необходимо $${RESPAWN}`, 'Организация');
    const home = (await table('Faction').findOne({ where: { id } })) as DbRow | null;
    const rows = (await table('Vehicle').findAll({ where: { key: 'faction', owner: id } })) as DbRow[];
    const pos = new mint.Vector3(Number(home?.x) || player.pos.x, Number(home?.y) || player.pos.y, Number(home?.z) || player.pos.z);
    for (const row of rows) {
      const vehicle = vehicleBySqlId(Number(row.id));
      if (vehicle && !vehicle.driver) vehicle.pos = pos;
    }
    notifySuccess(player, 'Свободный транспорт возвращён', info.name);
  });

  mint.onClient('crp:faction:warehouse', async (player) => {
    const id = factionId(player);
    if (!factionInfo(id) || !leader(player)) return notifyError(player, 'Вы не лидер', 'Организация');
    const clothesRanks = (await table('FactionClothesRank').findAll({ where: { factionId: id } })) as DbRow[];
    const itemRanks = (await table('FactionItemRank').findAll({ where: { factionId: id } })) as DbRow[];
    cef(player, `selectMenu.menus['factionControlStorage'].init(${JSON.stringify({
      clothesRanks: clothesRanks.map((row) => ({ clothesIndex: row.clothesIndex, rank: row.rank })),
      itemRanks: itemRanks.map((row) => ({ itemId: row.itemId, rank: row.rank })),
    })}); selectMenu.showByName('factionControlStorage');`);
  });

  mint.onClient('crp:faction:clothes:rank', async (player, raw) => {
    const id = factionId(player);
    const data = JSON.parse(String(raw ?? '{}')) as { index?: number; rank?: number };
    if (!leader(player)) return notifyError(player, 'Вы не лидер', 'Организация');
    const index = Math.trunc(Number(data.index) || 0);
    const rank = Math.max(1, Math.trunc(Number(data.rank) || 1));
    let row = (await table('FactionClothesRank').findOne({ where: { factionId: id, clothesIndex: index } })) as DbRow | null;
    if (!row) row = (await table('FactionClothesRank').create({ factionId: id, clothesIndex: index, rank })) as DbRow;
    else {
      row.rank = rank;
      await row.save();
    }
    notifySuccess(player, 'Ранг формы изменён', 'Организация');
  });

  mint.onClient('crp:faction:items:rank', async (player, raw) => {
    const id = factionId(player);
    const data = JSON.parse(String(raw ?? '{}')) as { itemId?: number; rank?: number };
    if (!leader(player)) return notifyError(player, 'Вы не лидер', 'Организация');
    const itemId = Math.trunc(Number(data.itemId) || 0);
    const rank = Math.max(1, Math.trunc(Number(data.rank) || 1));
    if (!itemId) return;
    let row = (await table('FactionItemRank').findOne({ where: { factionId: id, itemId } })) as DbRow | null;
    if (!row) row = (await table('FactionItemRank').create({ factionId: id, itemId, rank })) as DbRow;
    else {
      row.rank = rank;
      await row.save();
    }
    notifySuccess(player, 'Ранг предмета изменён', 'Организация');
  });
}
