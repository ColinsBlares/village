import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { factionInfo, factionKind, rankNumber } from '../factions/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess } from '../ui/notify.js';

const WAR_MS = 5 * 60 * 1000;
const COOLDOWN = 20 * 60 * 1000;
const MAFIA_ZONES = [
  { id: 0, x: 1549.31, y: 2203.41 },
  { id: 1, x: 1063.95, y: 2357.69 },
  { id: 2, x: 2953.53, y: 2787.0 },
  { id: 3, x: 1534.71, y: -2123.95 },
  { id: 4, x: 2386.09, y: 3092.92 },
];

interface Side {
  id: number;
  score: number;
}

interface BandWar {
  zone: DbRow;
  left: Side;
  right: Side;
  timer: ReturnType<typeof setTimeout>;
}

interface BizWar {
  zoneId: number;
  biz: DbRow;
  left: Side;
  right: Side;
  timer: ReturnType<typeof setTimeout>;
}

interface ArmyWar {
  left: Side;
  right: Side;
  teams: Map<number, number>;
  timer: ReturnType<typeof setTimeout>;
}

const zones: DbRow[] = [];
const homes = new Map<number, { x: number; y: number }>();
let band: BandWar | null = null;
let biz: BizWar | null = null;
let army: ArmyWar | null = null;
let bandAt = 0;
let bizAt = 0;
let armyAt = 0;

function nameOf(id: number): string {
  return factionInfo(id)?.name ?? `Организация ${id}`;
}

function bandPlayer(player: mint.Player): boolean {
  return factionKind(Number(getSession(player).character?.factionId) || 0) === 'bands';
}

function mafiaPlayer(player: mint.Player): boolean {
  return factionKind(Number(getSession(player).character?.factionId) || 0) === 'mafia';
}

function armyPlayer(player: mint.Player): boolean {
  return factionKind(Number(getSession(player).character?.factionId) || 0) === 'army';
}

function hoursOk(from: number, to: number): boolean {
  const hour = new Date().getHours();
  return hour >= from && hour <= to;
}

function inSquare(player: mint.Player, x: number, y: number, size: number): boolean {
  return Math.abs(player.pos.x - x) < size && Math.abs(player.pos.y - y) < size;
}

function zoneAt(player: mint.Player): DbRow | null {
  return zones.find((zone) => inSquare(player, Number(zone.x), Number(zone.y), Number(zone.size) || 100)) ?? null;
}

function homeZone(zone: DbRow): boolean {
  for (const spot of homes.values()) {
    if (Math.abs(spot.x - Number(zone.x)) < 100 && Math.abs(spot.y - Number(zone.y)) < 100) return true;
  }
  return false;
}

function score(player: mint.Player, left: number, right: number, leftScore: number, rightScore: number, mine: number): void {
  cef(player, `captureScore.start(${left}, ${right}, ${Math.floor(WAR_MS / 1000)}, ${leftScore}, ${rightScore});`);
  if (mine === left) notifySuccess(player, 'Ваша сторона начала бой', 'Захват');
  else notifyInfo(player, 'На вас напали', 'Захват');
}

function hide(player: mint.Player): void {
  cef(player, 'captureScore.show = false;');
}

function setPoint(id: number, value: number): void {
  for (const player of mint.Player.all) {
    if (!player.valid) continue;
    const faction = Number(getSession(player).character?.factionId) || 0;
    if (faction !== id && !band && !biz && !army) continue;
    cef(player, `captureScore.setScore(${id}, ${value});`);
  }
}

function finishBand(): void {
  if (!band) return;
  const war = band;
  band = null;
  sendBandZonesAll();
  const leftWin = war.left.score > war.right.score;
  const winner = leftWin ? war.left.id : war.right.id;
  war.zone.factionId = winner;
  void war.zone.save();
  bandAt = Date.now();
  for (const player of mint.Player.all) {
    if (!player.valid || !bandPlayer(player)) continue;
    const faction = Number(getSession(player).character?.factionId) || 0;
    hide(player);
    if (faction === winner) notifySuccess(player, 'Ваша банда победила', 'Захват территории');
    else if (faction === war.left.id || faction === war.right.id) notifyError(player, 'Ваша банда проиграла', 'Захват территории');
  }
}

function finishBiz(): void {
  if (!biz) return;
  const war = biz;
  biz = null;
  const leftWin = war.left.score > war.right.score;
  const winner = leftWin ? war.left.id : war.right.id;
  if (winner) {
    war.biz.factionId = winner;
    void war.biz.save();
  }
  bizAt = Date.now();
  for (const player of mint.Player.all) {
    if (!player.valid || !mafiaPlayer(player)) continue;
    const faction = Number(getSession(player).character?.factionId) || 0;
    hide(player);
    if (faction === winner) notifySuccess(player, `Крыша ${war.biz.name} ваша`, 'Рекет');
    else if (faction === war.left.id || faction === war.right.id) notifyError(player, `Крыша ${war.biz.name} осталась у ${nameOf(winner)}`, 'Рекет');
  }
}

function finishArmy(): void {
  if (!army) return;
  const war = army;
  army = null;
  const winner = war.left.score > war.right.score ? war.left.id : war.right.id;
  armyAt = Date.now();
  for (const player of mint.Player.all) {
    if (!player.valid || !armyPlayer(player)) continue;
    const team = war.teams.get(player.id);
    hide(player);
    if (team === winner) notifySuccess(player, 'Ваша команда победила', 'Учения');
    else if (team) notifyError(player, 'Ваша команда проиграла', 'Учения');
  }
}

export function bandPower(factionId: number): number {
  if (!zones.length) return 0;
  let count = 0;
  for (const zone of zones) if (Number(zone.factionId) === factionId) count += 1;
  return count / zones.length;
}

export function sendBandZones(player: mint.Player): void {
  const warId = band ? Number(band.zone.id) : 0;
  const list = zones.map((zone) => ({
    id: Number(zone.id),
    x: Number(zone.x),
    y: Number(zone.y),
    size: Number(zone.size) || 100,
    factionId: Number(zone.factionId) || 0,
    flash: warId > 0 && Number(zone.id) === warId,
  }));
  player.emit('crp:bands:zones', JSON.stringify(list));
}

function sendBandZonesAll(): void {
  for (const player of mint.Player.all) {
    if (player.valid && getSession(player).character) sendBandZones(player);
  }
}

export async function loadWars(): Promise<number> {
  zones.splice(0, zones.length, ...((await table('BandZone').findAll()) as DbRow[]));
  const factions = (await table('Faction').findAll()) as DbRow[];
  homes.clear();
  for (const row of factions) {
    const id = Number(row.id);
    if (id < 8 || id > 11) continue;
    homes.set(id, { x: Number(row.x) || 0, y: Number(row.y) || 0 });
  }
  return zones.length;
}

export function installWars(): void {
  mint.onClient('crp:war:bands', (player) => {
    const header = 'Захват территории';
    const faction = Number(getSession(player).character?.factionId) || 0;
    if (!bandPlayer(player)) return notifyError(player, 'Вы не член банды', header);
    if (rankNumber(player) < 8) return notifyError(player, 'Доступно с ранга 8', header);
    const zone = zoneAt(player);
    if (!zone) return notifyError(player, 'Вы не в гетто', header);
    if (Number(zone.factionId) === faction) return notifyError(player, `Территория уже под контролем ${nameOf(faction)}`, header);
    if (homeZone(zone)) return notifyError(player, 'Нельзя захватить зону, в которой проживает банда', header);
    if (band) return notifyError(player, 'В гетто уже идет война', header);
    if (Date.now() - bandAt < COOLDOWN) return notifyError(player, `Повторный захват будет доступен через ${Math.ceil((COOLDOWN - (Date.now() - bandAt)) / 60000)} мин.`, header);
    if (!hoursOk(11, 20)) return notifyError(player, 'Захват доступен с 11 до 20 ч.', header);
    const enemy = Number(zone.factionId) || 0;
    band = {
      zone,
      left: { id: faction, score: 0 },
      right: { id: enemy, score: 0 },
      timer: setTimeout(finishBand, WAR_MS),
    };
    sendBandZonesAll();
    for (const other of mint.Player.all) {
      if (!other.valid || !bandPlayer(other)) continue;
      const id = Number(getSession(other).character?.factionId) || 0;
      if (id === faction) score(other, faction, enemy, 0, 0, faction);
      else if (id === enemy) score(other, enemy, faction, 0, 0, enemy);
    }
  });

  mint.onClient('crp:war:biz:show', async (player) => {
    const faction = Number(getSession(player).character?.factionId) || 0;
    if (!mafiaPlayer(player)) return notifyError(player, 'Вы не член мафии');
    const rows = (await table('Biz').findAll()) as DbRow[];
    const list = rows.filter((row) => Number(row.type) !== 10 && Number(row.factionId) !== faction);
    if (!list.length) return notifyError(player, 'Все бизнесы захвачены');
    const items = list.map((row) => ({ text: String(row.name ?? 'Бизнес'), values: [`ID: ${row.id}`], factionId: Number(row.factionId) || 0 }));
    items.push({ text: 'Закрыть', values: [], factionId: 0 });
    const counts = [0, 0, 0];
    for (const row of list) {
      const index = Number(row.factionId) - 12;
      if (index >= 0 && index < 3) counts[index] += 1;
    }
    const names = [12, 13, 14].map((id) => factionInfo(id)?.name ?? '');
    cef(player, [
      `selectMenu.setItems('mafiaBizWar', ${JSON.stringify(items)});`,
      `selectMenu.setProp('mafiaBizWar', 'bizCount', ${rows.length});`,
      `selectMenu.setProp('mafiaBizWar', 'names', ${JSON.stringify(names)});`,
      `selectMenu.setProp('mafiaBizWar', 'counts', ${JSON.stringify(counts)});`,
      `selectMenu.menus['mafiaBizWar'].update();`,
      `selectMenu.showByName('mafiaBizWar');`,
    ].join('\n'));
  });

  mint.onClient('crp:war:biz:start', async (player, rawId) => {
    const header = 'Рекет';
    const faction = Number(getSession(player).character?.factionId) || 0;
    if (!mafiaPlayer(player)) return notifyError(player, 'Вы не член мафии', header);
    if (rankNumber(player) < 8) return notifyError(player, 'Доступно с ранга 8', header);
    const spot = MAFIA_ZONES.find((zone) => inSquare(player, zone.x, zone.y, 150));
    if (!spot) return notifyError(player, 'Вы не в зоне, где можно забить стрелку', header);
    const row = (await table('Biz').findOne({ where: { id: Number(rawId) } })) as DbRow | null;
    if (!row) return notifyError(player, 'Бизнес не найден', header);
    if (Number(row.type) === 10) return notifyError(player, 'Нельзя захватить клуб', header);
    if (Number(row.factionId) === faction) return notifyError(player, `${row.name} уже под вашей крышей`, header);
    if (biz) return notifyError(player, 'В штате уже идет война за бизнес', header);
    if (Date.now() - bizAt < COOLDOWN) return notifyError(player, `Повторный захват будет доступен через ${Math.ceil((COOLDOWN - (Date.now() - bizAt)) / 60000)} мин.`, header);
    if (!hoursOk(11, 20)) return notifyError(player, 'Захват доступен с 11 до 20 ч.', header);
    const enemy = Number(row.factionId) || 0;
    biz = {
      zoneId: spot.id,
      biz: row,
      left: { id: faction, score: 0 },
      right: { id: enemy, score: 0 },
      timer: setTimeout(finishBiz, WAR_MS),
    };
    for (const other of mint.Player.all) {
      if (!other.valid || !mafiaPlayer(other)) continue;
      const id = Number(getSession(other).character?.factionId) || 0;
      if (id === faction) {
        score(other, faction, enemy, 0, 0, faction);
        notifySuccess(other, `Ваша мафия отжимает ${row.name}`, header);
      } else if (enemy && id === enemy) {
        score(other, enemy, faction, 0, 0, enemy);
        notifyInfo(other, `${nameOf(faction)} отжимает ${row.name}`, header);
      }
    }
  });

  mint.onClient('crp:war:army', (player) => {
    const header = 'Учения';
    if (!armyPlayer(player)) return notifyError(player, 'Вы не служите в армии', header);
    if (rankNumber(player) < 8) return notifyError(player, 'Доступно с ранга 8', header);
    if (army) return notifyError(player, 'Учения уже идут', header);
    if (Date.now() - armyAt < COOLDOWN) return notifyError(player, `Повторные учения через ${Math.ceil((COOLDOWN - (Date.now() - armyAt)) / 60000)} мин.`, header);
    const near = mint.Player.all.filter((other) => other.valid && armyPlayer(other) && player.pos.distanceTo(other.pos) <= 100);
    if (near.length < 2) return notifyError(player, 'Нужно минимум двое военных рядом', header);
    near.sort((a, b) => player.pos.distanceTo(a.pos) - player.pos.distanceTo(b.pos));
    const teams = new Map<number, number>();
    const half = Math.ceil(near.length / 2);
    near.forEach((other, index) => teams.set(other.id, index < half ? 1 : 2));
    army = { left: { id: 1, score: 0 }, right: { id: 2, score: 0 }, teams, timer: setTimeout(finishArmy, WAR_MS) };
    for (const other of near) {
      const team = teams.get(other.id) ?? 1;
      const enemy = team === 1 ? 2 : 1;
      score(other, team, enemy, 0, 0, team);
    }
  });

  mint.on('playerDeath', (victim, killer) => {
    if (!victim.valid || !(killer instanceof mint.Player) || killer.id === victim.id) return;
    const victimFaction = Number(getSession(victim).character?.factionId) || 0;
    const killerFaction = Number(getSession(killer).character?.factionId) || 0;
    if (band && bandPlayer(victim) && bandPlayer(killer) && victimFaction !== killerFaction) {
      if (killerFaction === band.left.id) band.left.score += 1;
      else if (killerFaction === band.right.id) band.right.score += 1;
      else return;
      const value = killerFaction === band.left.id ? band.left.score : band.right.score;
      setPoint(killerFaction, value);
    }
    if (biz && mafiaPlayer(victim) && mafiaPlayer(killer) && victimFaction !== killerFaction) {
      const spot = MAFIA_ZONES.find((zone) => zone.id === biz?.zoneId);
      if (!spot || !inSquare(victim, spot.x, spot.y, 150) || !inSquare(killer, spot.x, spot.y, 150)) return;
      if (killerFaction === biz.left.id) biz.left.score += 1;
      else if (killerFaction === biz.right.id) biz.right.score += 1;
      else return;
      const value = killerFaction === biz.left.id ? biz.left.score : biz.right.score;
      setPoint(killerFaction, value);
    }
    if (army && army.teams.has(victim.id) && army.teams.has(killer.id)) {
      const team = army.teams.get(killer.id) ?? 0;
      const other = army.teams.get(victim.id) ?? 0;
      if (!team || team === other) return;
      if (team === 1) army.left.score += 1;
      else army.right.score += 1;
      setPoint(team, team === 1 ? army.left.score : army.right.score);
    }
  });
}
