import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { factionInfo, factionKind, rankNumber } from '../factions/index.js';
import { pushFaction, pushFines } from '../player/menu.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess, notifyWarning } from '../ui/notify.js';

interface Call {
  id: number;
  num: number;
  name: string;
  description: string;
  pos: { x: number; y: number };
}

const BOARDS: Record<string, { ids: number[]; members: string; type: string }> = {
  gover: { ids: [1], members: 'mapCaseGoverMembersData', type: 'gover' },
  pd: { ids: [2, 3], members: 'mapCasePdMembersData', type: 'pd' },
  fib: { ids: [4], members: 'mapCaseFIBMembersData', type: 'fib' },
  army: { ids: [6], members: 'mapCaseNgMembersData', type: 'ng' },
  ems: { ids: [5], members: 'mapCaseEmsMembersData', type: 'ems' },
  news: { ids: [7], members: 'mapCaseWnewsMembersData', type: 'wnews' },
};

const policeCalls: Call[] = [];
const emsCalls: Call[] = [];
const searchAt = new WeakMap<mint.Player, number>();

function callStore(name: string, method: string, payload: unknown): string {
  const arg = JSON.stringify(JSON.stringify(payload));
  const box = JSON.stringify(name);
  const fn = JSON.stringify(method);
  return `(function(){var n=0;var run=function(){var store=window[${box}];if(store&&typeof store[${fn}]==='function'){store[${fn}](${arg});return;}if(++n<50)setTimeout(run,100);};run();})();`;
}

function boardOf(factionId: number): { key: string; ids: number[]; members: string; type: string } | null {
  for (const [key, board] of Object.entries(BOARDS)) {
    if (board.ids.includes(factionId)) return { key, ...board };
  }
  return null;
}

function onlineByCharacter(id: number): mint.Player | null {
  return mint.Player.all.find((player) => player.valid && Number(getSession(player).character?.id) === id) ?? null;
}

function green(player: mint.Player, text: string): void {
  cef(player, `(function(){if(window.mapCase&&typeof mapCase.showGreenMessage==='function')mapCase.showGreenMessage(${JSON.stringify(text)});})();`);
}

function sameFaction(player: mint.Player): mint.Player[] {
  const id = Number(getSession(player).character?.factionId) || 0;
  return mint.Player.all.filter((other) => other.valid && Number(getSession(other).character?.factionId) === id);
}

async function membersOf(factionId: number): Promise<{ id: number; num: number; name: string; rank: number }[]> {
  const info = factionInfo(factionId);
  const rows = (await table('Character').findAll({ where: { factionId } })) as DbRow[];
  return rows.map((row) => {
    const live = onlineByCharacter(Number(row.id));
    const rank = info?.ranks.find((item) => item.id === Number(row.factionRank))?.rank ?? 0;
    return { id: Number(row.id), num: live?.id ?? 0, name: String(row.name ?? ''), rank };
  });
}

function wantedList(): { id: number; name: string; description: string; danger: number }[] {
  const list = [];
  for (const player of mint.Player.all) {
    const character = player.valid ? getSession(player).character : null;
    const danger = Number(character?.wanted) || 0;
    if (!character || danger <= 0) continue;
    list.push({
      id: Number(character.id),
      name: String(character.name ?? player.name),
      description: String(character.wantedCause ?? ''),
      danger,
    });
  }
  return list;
}

function pushCalls(kind: 'pd' | 'ems'): void {
  const calls = kind === 'pd' ? policeCalls : emsCalls;
  const store = kind === 'pd' ? 'mapCasePdCallsData' : 'mapCaseEmsCallsData';
  for (const player of mint.Player.all) {
    if (!player.valid) continue;
    const faction = Number(getSession(player).character?.factionId) || 0;
    const showPd = kind === 'pd' && (faction === 2 || faction === 3 || faction === 4);
    const showEms = kind === 'ems' && faction === 5;
    if (showPd || showEms) cef(player, callStore(store, 'add', calls));
    if (kind === 'pd' && faction === 4) cef(player, callStore('mapCaseFIBCallsData', 'add', calls));
  }
}

export async function openTablet(player: mint.Player): Promise<void> {
  const character = getSession(player).character;
  const factionId = Number(character?.factionId) || 0;
  const board = boardOf(factionId);
  const info = factionInfo(factionId);
  if (!character || !board || !info) return;
  const members = await membersOf(factionId);
  const ranks = info.ranks.slice().sort((a, b) => a.rank - b.rank).map((rank) => rank.name);
  const lines = [
    `mapCase.type = ${JSON.stringify(board.type)};`,
    `mapCase.userName = ${JSON.stringify(String(character.name ?? ''))};`,
    `mapCase.enable = true;`,
    callStore(board.members, 'setRanks', ranks),
    callStore(board.members, 'add', members),
  ];
  if (factionId === 2) lines.push(`mapCasePdData.menuHeader = ${JSON.stringify('LOS SANTOS<br/>POLICE DEPARTMENT')};`);
  if (factionId === 3) lines.push(`mapCasePdData.menuHeader = ${JSON.stringify('BLAINE COUNTY<br/>SHERIFF DEPARTMENT')};`);
  if (board.key === 'pd' || board.key === 'fib') {
    lines.push(callStore('mapCasePdCallsData', 'add', policeCalls));
    lines.push(callStore('mapCasePdWantedData', 'add', wantedList()));
    if (board.key === 'fib') {
      lines.push(callStore('mapCaseFIBCallsData', 'add', policeCalls));
      lines.push(callStore('mapCaseFIBWantedData', 'add', wantedList()));
    }
  }
  if (board.key === 'ems') lines.push(callStore('mapCaseEmsCallsData', 'add', emsCalls));
  cef(player, lines.join('\n'));
  pushFaction(player);
}

function owns(player: mint.Player, board: string): boolean {
  const ids = BOARDS[board]?.ids ?? [];
  return ids.includes(Number(getSession(player).character?.factionId) || 0);
}

export function addServiceCall(player: mint.Player, text: string, kind: 'pd' | 'ems'): void {
  const description = text.trim().slice(0, 120);
  const character = getSession(player).character;
  if (!character || !description) return;
  const list = kind === 'pd' ? policeCalls : emsCalls;
  const id = Number(character.id);
  const index = list.findIndex((call) => call.id === id);
  if (index >= 0) list.splice(index, 1);
  list.push({
    id,
    num: player.id,
    name: String(character.name ?? player.name),
    description,
    pos: { x: player.pos.x, y: player.pos.y },
  });
  pushCalls(kind);
  notifySuccess(player, 'Вызов отправлен', kind === 'pd' ? 'Полиция' : 'Больница');
}

function takeCall(player: mint.Player, rawId: number, kind: 'pd' | 'ems'): void {
  const allowed = kind === 'pd'
    ? factionKind(Number(getSession(player).character?.factionId) || 0) === 'police' || factionKind(Number(getSession(player).character?.factionId) || 0) === 'fib'
    : factionKind(Number(getSession(player).character?.factionId) || 0) === 'hospital';
  if (!allowed) return notifyError(player, 'Вы не являетесь сотрудником', 'Планшет');
  const list = kind === 'pd' ? policeCalls : emsCalls;
  const index = list.findIndex((call) => call.id === rawId);
  const call = index >= 0 ? list[index] : undefined;
  if (!call) return notifyError(player, 'Вызов уже закрыт', kind === 'pd' ? 'Полиция' : 'Больница');
  list.splice(index, 1);
  const author = onlineByCharacter(call.id);
  const pos = author?.pos ?? call.pos;
  mint.emitClient(player, 'crp:waypoint', pos.x, pos.y);
  if (author?.valid) notifySuccess(author, `${getSession(player).character?.name ?? player.name} принял ваш вызов, оставайтесь на месте`, 'Вызов');
  green(player, `Вы приняли вызов от <br/><span>${call.name}</span>`);
  pushCalls(kind);
}

async function shiftRank(player: mint.Player, board: string, dir: number, characterId: number): Promise<void> {
  const header = dir > 0 ? 'Повышение' : 'Понижение';
  if (!owns(player, board)) return notifyError(player, 'Вы не являетесь сотрудником', 'Планшет');
  const factionId = Number(getSession(player).character?.factionId) || 0;
  const info = factionInfo(factionId);
  if (!info || rankNumber(player) < info.giveRankRank) return notifyError(player, 'Недостаточно прав', header);
  const target = onlineByCharacter(characterId);
  const character = target ? getSession(target).character : null;
  if (!target?.valid || !character || Number(character.factionId) !== factionId) return notifyError(player, `Игрок #${characterId} оффлайн`, header);
  if (target.id === player.id) return notifyError(player, dir > 0 ? 'Нельзя повысить себя' : 'Нельзя понизить себя', header);
  const current = info.ranks.find((rank) => rank.id === Number(character.factionRank))?.rank ?? 0;
  const actor = rankNumber(player);
  const numbers = info.ranks.map((rank) => rank.rank);
  const nextNumber = current + dir;
  const next = info.ranks.find((rank) => rank.rank === nextNumber);
  if (dir > 0 && (current >= actor - 1 || current >= Math.max(...numbers))) return notifyError(player, `Недостаточно прав для повышения ${character.name}`, header);
  if (dir < 0 && (current >= actor || current <= Math.min(...numbers))) return notifyError(player, `Недостаточно прав для понижения ${character.name}`, header);
  if (!next) return notifyError(player, 'Ранг не найден', header);
  character.factionRank = next.id;
  await character.save();
  const store = BOARDS[board]?.members;
    if (store) {
    for (const member of sameFaction(player)) {
      cef(member, `(function(){var box=window[${JSON.stringify(store)}];if(box&&typeof box.setMemberRank==='function')box.setMemberRank(${characterId}, ${next.rank});})();`);
    }
  }
  notifySuccess(target, `${getSession(player).character?.name ?? player.name} ${dir > 0 ? 'повысил' : 'понизил'} вас до ${next.name}`, header);
  green(player, `<span>${character.name}</span><br /> был ${dir > 0 ? 'повышен' : 'понижен'} до ранга ${next.name}`);
  pushFaction(target);
}

async function dismiss(player: mint.Player, board: string, characterId: number): Promise<void> {
  const header = 'Увольнение';
  if (!owns(player, board)) return notifyError(player, 'Вы не являетесь сотрудником', 'Планшет');
  const factionId = Number(getSession(player).character?.factionId) || 0;
  const info = factionInfo(factionId);
  if (!info || rankNumber(player) < info.uvalRank) return notifyError(player, 'Недостаточно прав', header);
  const target = onlineByCharacter(characterId);
  const character = target ? getSession(target).character : null;
  if (!target?.valid || !character || Number(character.factionId) !== factionId) return notifyError(player, `Игрок #${characterId} оффлайн`, header);
  if (target.id === player.id) return notifyError(player, 'Нельзя уволить себя', header);
  const current = info.ranks.find((rank) => rank.id === Number(character.factionRank))?.rank ?? 0;
  if (current >= rankNumber(player)) return notifyError(player, `Недостаточно прав для увольнения ${character.name}`, header);
  character.factionId = null;
  character.factionRank = null;
  await character.save();
  const store = BOARDS[board]?.members;
  if (store) {
    for (const member of sameFaction(player)) {
      cef(member, `(function(){var box=window[${JSON.stringify(store)}];if(box&&typeof box.remove==='function')box.remove(${characterId});})();`);
    }
  }
  cef(target, 'mapCase.enable = false;');
  notifyInfo(target, `${getSession(player).character?.name ?? player.name} уволил вас`, header);
  green(player, `<span>${character.name}</span><br /> был уволен`);
  pushFaction(target);
}

async function profile(player: mint.Player, characterId: number, fib: boolean): Promise<void> {
  const kind = factionKind(Number(getSession(player).character?.factionId) || 0);
  if (fib ? kind !== 'fib' : kind !== 'police' && kind !== 'fib') return notifyError(player, 'Вы не являетесь сотрудником', 'Планшет');
  const character = (await table('Character').findOne({ where: { id: characterId } })) as DbRow | null;
  if (!character) return notifyError(player, 'Персонаж не найден', 'Планшет');
  const phone = (await table('Phone').findOne({ where: { characterId } })) as DbRow | null;
  const house = (await table('House').findOne({ where: { characterId } })) as DbRow | null;
  const vehicles = (await table('Vehicle').findAll({ where: { key: 'private', owner: characterId } })) as DbRow[];
  const fines = (await table('Fine').findAll({ where: { recId: characterId } })) as DbRow[];
  const spouse = (await table('Spouse').findOne({ where: { characterA: characterId } })) as DbRow | null
    ?? (await table('Spouse').findOne({ where: { characterB: characterId } })) as DbRow | null;
  let spouseName = '';
  if (spouse) {
    const otherId = Number(spouse.characterA) === characterId ? Number(spouse.characterB) : Number(spouse.characterA);
    const other = (await table('Character').findOne({ where: { id: otherId } })) as DbRow | null;
    spouseName = String(other?.name ?? '');
  }
  const gender = Number(character.gender) || 0;
  const data = {
    id: character.id,
    name: character.name,
    phone: phone?.number ?? null,
    housePos: house ? { x: house.pickupX, y: house.pickupY, z: house.pickupZ } : null,
    houseId: house?.id ?? 0,
    property: house ? `Дом #${house.id}` : '-',
    danger: Number(character.wanted) || 0,
    cause: character.wantedCause || '-',
    gender: gender ? 'Ж' : 'М',
    spouse: spouseName ? `${gender ? 'замужем за ' : 'женат на '}${spouseName}` : '-',
    veh: vehicles.map((row) => `${row.modelName ?? 'Транспорт'} (${row.plate})`).join(', ') || '-',
    law: Number(character.law) || 0,
    crimes: Number(character.crimes) || 0,
    fines: fines.length,
    pass: 2608180000 + Number(character.id),
  };
  const store = fib ? 'mapCaseFIBProfileData' : 'mapCasePdProfileData';
  cef(player, callStore(store, 'setProfileData', data));
}

export function installTablet(): void {
  mint.onClient('crp:tablet:open', (player) => {
    void openTablet(player);
  });
  mint.onClient('crp:tablet:rank', (player, raw) => {
    const data = JSON.parse(String(raw ?? '{}')) as { board?: string; dir?: number; id?: number };
    void shiftRank(player, String(data.board ?? ''), Number(data.dir) || 0, Number(data.id) || 0);
  });
  mint.onClient('crp:tablet:uval', (player, raw) => {
    const data = JSON.parse(String(raw ?? '{}')) as { board?: string; id?: number };
    void dismiss(player, String(data.board ?? ''), Number(data.id) || 0);
  });
  mint.onClient('crp:tablet:profile', (player, rawId) => {
    const fib = factionKind(Number(getSession(player).character?.factionId) || 0) === 'fib';
    void profile(player, Number(rawId), fib);
  });
  mint.onClient('crp:tablet:identity', (player, rawId) => {
    const target = mint.Player.getByID(Number(rawId));
    const id = Number(getSession(target ?? player).character?.id);
    if (!target?.valid) return notifyError(player, `Игрок #${rawId} не найден`, 'Установление личности');
    const fib = factionKind(Number(getSession(player).character?.factionId) || 0) === 'fib';
    void profile(player, id, fib);
  });
  mint.onClient('crp:tablet:fine', async (player, raw) => {
    if (factionKind(Number(getSession(player).character?.factionId) || 0) !== 'police' && factionKind(Number(getSession(player).character?.factionId) || 0) !== 'fib') {
      return notifyError(player, 'Вы не являетесь сотрудником', 'Штраф');
    }
    const data = JSON.parse(String(raw ?? '{}')) as { recId?: number; cause?: string; price?: number; recName?: string };
    const price = Math.max(1, Math.min(10000, Math.trunc(Number(data.price) || 0)));
    const cause = String(data.cause ?? '').slice(0, 80);
    if (!data.recId || !cause) return;
    await table('Fine').create({ copId: getSession(player).character?.id, recId: data.recId, cause, price });
    const target = onlineByCharacter(Number(data.recId));
    if (target) {
      const rows = (await table('Fine').findAll({ where: { recId: data.recId } })) as DbRow[];
      pushFines(target, rows.length);
      notifyInfo(target, `${getSession(player).character?.name ?? player.name} выписал вам штраф на сумму $${price} (${cause})`, 'Штраф');
    }
    green(player, `Штраф на сумму <span>${price}$</span><br/>выдан <span>${data.recName ?? ''}</span><br/> по причине <span>${cause}</span>`);
  });
  mint.onClient('crp:tablet:wanted', async (player, raw) => {
    const kind = factionKind(Number(getSession(player).character?.factionId) || 0);
    if (kind !== 'police' && kind !== 'fib') return notifyError(player, 'Вы не являетесь сотрудником', 'Розыск');
    const data = JSON.parse(String(raw ?? '{}')) as { recId?: number; wanted?: number; cause?: string; recName?: string };
    const wanted = Math.max(0, Math.min(5, Math.trunc(Number(data.wanted) || 0)));
    const cause = String(data.cause ?? '').slice(0, 80);
    const target = onlineByCharacter(Number(data.recId));
    const character = target ? getSession(target).character : (await table('Character').findOne({ where: { id: Number(data.recId) } })) as DbRow | null;
    if (!character) return;
    character.wanted = wanted;
    character.wantedCause = cause;
    await character.save();
    if (target) {
      cef(target, `mp.event.call('hud.setData', ${JSON.stringify({ wanted })});`);
      notifyInfo(target, `${getSession(player).character?.name ?? player.name} выдал вам ${wanted} ур. по причине: ${cause}`, 'Розыск');
    }
    const store = kind === 'fib' ? 'mapCaseFIBWantedData' : 'mapCasePdWantedData';
    for (const cop of mint.Player.all) {
      const copKind = factionKind(Number(getSession(cop).character?.factionId) || 0);
      if (!cop.valid || (copKind !== 'police' && copKind !== 'fib')) continue;
      cef(cop, callStore(store, 'add', wantedList()));
      if (target) notifyWarning(cop, `${getSession(player).character?.name ?? player.name} выдал ${wanted} ур. ${character.name} по причине ${cause}`, 'Розыск');
    }
    green(player, `Уровень розыска <span>${wanted}</span><br/>выдан <span>${data.recName ?? character.name}</span><br/> по причине <span>${cause}</span>`);
  });
  mint.onClient('crp:tablet:search', (player, rawId) => {
    const kind = factionKind(Number(getSession(player).character?.factionId) || 0);
    if (kind !== 'police' && kind !== 'fib') return notifyError(player, 'Вы не сотрудник', 'Розыск');
    const target = onlineByCharacter(Number(rawId));
    const character = target ? getSession(target).character : null;
    if (!target?.valid || !character) return notifyError(player, `Персонаж #${rawId} оффлайн`, 'Розыск');
    if (!(Number(character.wanted) > 0)) return notifyError(player, `${character.name} не в розыске`, 'Розыск');
    if (target.dimension !== 0) return notifyError(player, `${character.name} достаточно хорошо скрыт`, 'Розыск');
    const left = 15000 - (Date.now() - (searchAt.get(player) ?? 0));
    if (left > 0) return notifyError(player, 'Ожидайте...', 'Розыск');
    searchAt.set(player, Date.now());
    const angle = Math.random() * Math.PI * 2;
    mint.emitClient(player, 'crp:waypoint', target.pos.x + Math.cos(angle) * 40, target.pos.y + Math.sin(angle) * 40);
    green(player, `Приблизительное местоположение ${character.name} отмечено на карте`);
  });
  mint.onClient('crp:ems:call', (player, raw) => addServiceCall(player, String(raw ?? ''), 'ems'));
  mint.onClient('crp:ems:call:take', (player, rawId) => takeCall(player, Number(rawId), 'ems'));
  mint.onClient('crp:ems:call:drop', (player, rawId) => {
    if (factionKind(Number(getSession(player).character?.factionId) || 0) !== 'hospital') return;
    const index = emsCalls.findIndex((call) => call.id === Number(rawId));
    if (index >= 0) emsCalls.splice(index, 1);
    pushCalls('ems');
  });
  mint.onClient('crp:pd:backup', (player) => backup(player, 'police', 'Вы не являетесь сотрудником', 'Police'));
  mint.onClient('crp:fib:backup', (player) => backup(player, 'fib', 'Вы не являетесь агентом', 'FIB'));
}

function backup(player: mint.Player, kind: string, denied: string, header: string): void {
  if (factionKind(Number(getSession(player).character?.factionId) || 0) !== kind) return notifyError(player, denied);
  const name = String(getSession(player).character?.name ?? player.name);
  for (const cop of sameFaction(player)) {
    notifyWarning(cop, `${name} запросил подкрепление`, header);
    mint.emitClient(cop, 'crp:backup:blip', name, player.pos.x, player.pos.y, player.pos.z);
  }
  green(player, 'Сработал экстренный вызов');
}

export function policeCallList(): Call[] {
  return policeCalls;
}

export function takePoliceCall(player: mint.Player, rawId: number): void {
  takeCall(player, rawId, 'pd');
}
