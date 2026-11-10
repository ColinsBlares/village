import * as mint from 'mint-server';
import { db, table } from '../core/db.js';
import { allowHeal, allowMove, godmodeOn, setGodmode, setVanished } from '../anticheat/index.js';
import { addAttachment } from '../attaches/index.js';
import { hasAnim, playAnimation, playCatalog, stopAnimation } from '../animations/index.js';
import { spawnAdminVehicle } from '../vehicles/index.js';
import { openWeatherPanel, resetCustomTemperature, setCustomTemperature, setGlobalWeather, weatherHere } from '../world/weather.js';
import { pushWarns } from '../player/menu.js';
import { getSession, type DbRow } from '../player/session.js';
import { notifyError, notifyInfo, notifyWarning } from '../ui/notify.js';
import { silence } from '../voice/index.js';

export interface Out {
  info(text: string, player?: mint.Player): void;
  error(text: string, player?: mint.Player): void;
}

export interface Command {
  access: number;
  description: string;
  args: string;
  handler(player: mint.Player, args: unknown[], out: Out): void | Promise<void>;
}

const back = new WeakMap<mint.Player, { x: number; y: number; z: number; dimension: number }>();
const returned = new WeakMap<mint.Player, { x: number; y: number; z: number; dimension: number }>();
let mass: { x: number; y: number; z: number; dimension: number } | null = null;

const LICENSES: Record<string, [string, string]> = {
  car: ['carLicense', 'автомобиль'],
  passenger: ['passengerLicense', 'пассажирский транспорт'],
  bike: ['bikeLicense', 'мотоцикл'],
  truck: ['truckLicense', 'грузовой транспорт'],
  air: ['airLicense', 'воздушный транспорт'],
  boat: ['boatLicense', 'водный транспорт'],
};

function nameOf(player: mint.Player): string {
  return String(getSession(player).character?.name ?? player.name);
}

function playerById(id: number): mint.Player | null {
  const player = mint.Player.getByID(id);
  return player?.valid ? player : null;
}

function near(player: mint.Player, radius: number): mint.Player[] {
  const list: mint.Player[] = [];
  for (const other of mint.Player.all) {
    if (!other.valid || !getSession(other).character || other.dimension !== player.dimension) continue;
    const dx = other.pos.x - player.pos.x;
    const dy = other.pos.y - player.pos.y;
    const dz = other.pos.z - player.pos.z;
    if (dx * dx + dy * dy + dz * dz <= radius * radius) list.push(other);
  }
  return list;
}

function move(player: mint.Player, x: number, y: number, z: number, dimension: number): void {
  allowMove(player);
  player.dimension = dimension;
  player.pos = new mint.Vector3(x, y, z);
}

export function rememberBack(player: mint.Player): void {
  saveBack(player, back);
}

function saveBack(player: mint.Player, store: WeakMap<mint.Player, { x: number; y: number; z: number; dimension: number }>): void {
  store.set(player, { x: player.pos.x, y: player.pos.y, z: player.pos.z, dimension: player.dimension });
}

async function characterByName(name: string): Promise<DbRow | null> {
  return (await table('Character').findOne({ where: { name } })) as DbRow | null;
}

async function accountOf(character: DbRow): Promise<DbRow | null> {
  return (await table('Account').findOne({ where: { id: character.accountId } })) as DbRow | null;
}

export function massPoint(): { x: number; y: number; z: number; dimension: number } | null {
  return mass;
}

export function useMassTeleport(player: mint.Player): boolean {
  if (!mass) return false;
  saveBack(player, returned);
  move(player, mass.x, mass.y, mass.z, mass.dimension);
  return true;
}

export const commands: Record<string, Command> = {
  '/a': {
    access: 1,
    description: 'Сообщение в админский чат',
    args: '[сообщение]',
    handler(player, args) {
      tellAdmins(`!{#b5e865}[A] ${nameOf(player)}[${player.id}]: ${args.join(' ')}`);
    },
  },
  '/ans': {
    access: 1,
    description: 'Ответ игроку',
    args: '[id]:n [сообщение]:s',
    handler(player, args) {
      const target = playerById(Number(args[0]));
      if (!target) return notifyError(player, 'Игрок не найден', 'Ошибка');
      const text = args.slice(1).join(' ');
      tellAdmins(`!{#f29f53}[A] ${nameOf(player)}[${player.id}] > ${nameOf(target)}[${target.id}]: ${text}`);
      mint.emitClient(target, 'crp:chat', `!{#f29f53}Ответ от ${nameOf(player)}[${player.id}]: ${text}`);
    },
  },
  '/msg': {
    access: 4,
    description: 'Сообщение в общий чат',
    args: '[сообщение]',
    handler(player, args) {
      tellPlayers(`!{#ebc71b}${nameOf(player)}[${player.id}]: ${args.join(' ')}`);
    },
  },
  '/goto': {
    access: 2,
    description: 'Телепорт к игроку',
    args: '[ID игрока]',
    handler(player, args) {
      const target = playerById(Number(args[0]));
      if (!target) {
        mint.emitClient(player, 'crp:chat', '!{#ffffff} Игрок не найден');
        return;
      }
      saveBack(player, back);
      move(player, target.pos.x + 2, target.pos.y, target.pos.z, target.dimension);
      tellAdmins(`!{#edffc2}[A] ${nameOf(player)} телепортировался к ${nameOf(target)}`);
      mint.emitClient(player, 'crp:chat', '!{#ebd13d}Используйте /goback, чтобы вернуться на исходную позицию');
    },
  },
  '/goback': {
    access: 2,
    description: 'Вернуться на исходную позицию (после /goto)',
    args: '',
    handler(player) {
      const spot = back.get(player);
      if (!spot) return notifyError(player, 'У вас нет исходной позиции');
      move(player, spot.x, spot.y, spot.z, spot.dimension);
      notifyInfo(player, 'Вы вернулись на исходную позицию');
    },
  },
  '/gethere': {
    access: 3,
    description: 'Телепорт игрока к себе',
    args: '[ID игрока]',
    handler(player, args) {
      const target = playerById(Number(args[0]));
      if (!target) {
        mint.emitClient(player, 'crp:chat', '!{#ffffff} Игрок не найден');
        return;
      }
      saveBack(target, returned);
      move(target, player.pos.x + 2, player.pos.y, player.pos.z, player.dimension);
      tellAdmins(`!{#edffc2}[A] ${nameOf(player)} телепортировал к себе ${nameOf(target)}`);
      mint.emitClient(player, 'crp:chat', '!{#ebd13d}Используйте /return, чтобы вернуть игрока обратно');
      mint.emitClient(target, 'crp:chat', `!{#ffffff}${nameOf(player)} телепортировал вас к себе`);
    },
  },
  '/return': {
    access: 2,
    description: 'Вернуть игрока на исходную позицию',
    args: '[ID]:n',
    handler(player, args, out) {
      const target = playerById(Number(args[0]));
      const spot = target ? returned.get(target) : null;
      if (!target) return out.error('Игрок не найден', player);
      if (!spot) return out.error('У игрока нет исходной позиции', player);
      move(target, spot.x, spot.y, spot.z, spot.dimension);
      returned.delete(target);
      notifyInfo(player, 'Вы вернули игрока на исходную позицию');
      notifyInfo(target, `${nameOf(player)} вернул вас на исходную позицию`);
    },
  },
  '/returnall': {
    access: 2,
    description: 'Вернуть игроков в радиусе на исходную позицию',
    args: '[радиус]:n',
    handler(player, args) {
      let count = 0;
      for (const target of near(player, Number(args[0]))) {
        const spot = returned.get(target);
        if (!spot || target.getSyncedMeta('crp:knocked') != null) continue;
        move(target, spot.x, spot.y, spot.z, spot.dimension);
        returned.delete(target);
        notifyInfo(target, `${nameOf(player)} вернул вас на исходную позицию`);
        count += 1;
      }
      tellAdmins(`!{#edffc2}[A] ${nameOf(player)} вернул ${count} чел. на исходную позицию (Радиус: ${args[0]})`);
      notifyInfo(player, `Вы вернули ${count} чел. на исходную позицию`);
    },
  },
  '/veh': {
    access: 4,
    description: 'Заспавнить транспорт',
    args: '[название т/c]:s',
    handler(player, args) {
      const model = String(args[0] ?? '');
      const color1 = Number(args[1]);
      const color2 = Number(args[2]);
      const vehicle = spawnAdminVehicle(player, model, Number.isFinite(color1) ? color1 : 0, Number.isFinite(color2) ? color2 : 0);
      if (!vehicle) return notifyError(player, 'Не удалось создать транспорт', 'Транспорт');
      allowMove(player);
      player.setIntoVehicle(vehicle, 1);
      tellAdmins(`!{#e0bc43}[A] ${nameOf(player)} создал транспорт ${model}`);
    },
  },
  '/weather': {
    access: 6,
    description: 'Панель погоды',
    args: '',
    handler(player) {
      openWeatherPanel(player);
    },
  },
  '/gettemp': {
    access: 6,
    description: 'Узнать текущую температуру',
    args: '',
    handler(player) {
      notifyInfo(player, `Температура: ${weatherHere(player).temperature}`, 'Погода');
    },
  },
  '/settemp': {
    access: 6,
    description: 'Установить температуру',
    args: '[градусы]:n',
    handler(player, args) {
      setCustomTemperature(Number(args[0]));
      tellAdmins(`!{#e0bc43}[A] ${nameOf(player)} установил температуру ${args[0]}°`);
    },
  },
  '/resettemp': {
    access: 6,
    description: 'Вернуть температуру зон',
    args: '',
    handler(player) {
      resetCustomTemperature();
      tellAdmins(`!{#e0bc43}[A] ${nameOf(player)} вернул температуру зон`);
    },
  },
  '/setweather': {
    access: 6,
    description: 'Погода на весь штат, пусто — снова зоны',
    args: '',
    handler(player, args) {
      const id = String(args[0] ?? '');
      if (!setGlobalWeather(id ? id : null)) return notifyError(player, 'Нет такой погоды', 'Погода');
      tellAdmins(`!{#e0bc43}[A] ${nameOf(player)} поставил погоду ${id || 'зоны'}`);
    },
  },
  '/tp': {
    access: 0,
    description: 'Массовый телепорт',
    args: '',
    handler(player) {
      if (!useMassTeleport(player)) return notifyError(player, 'Массовый телепорт отключен');
      notifyInfo(player, 'Вы были телепортированы');
    },
  },
  '/hp': {
    access: 2,
    description: 'Выдать здоровье игроку',
    args: '[ID игрока]',
    handler(player, args) {
      const target = playerById(Number(args[0]));
      if (!target || args[1] == null) {
        mint.emitClient(player, 'crp:chat', '!{#ffffff} Игрок не найден');
        return;
      }
      allowHeal(target);
      target.health = Math.max(0, Math.min(100, Number(args[1]) || 0));
      tellAdmins(`!{#edffc2}[A] ${nameOf(player)} изменил здоровье игроку ${nameOf(target)}`);
    },
  },
  '/sethp': {
    access: 3,
    description: 'Изменить здоровье игроку',
    args: '[ид_игрока]:n [здоровье]:n',
    handler(player, args, out) {
      const target = playerById(Number(args[0]));
      if (!target) return out.error(`Игрок #${args[0]} не найден`, player);
      const health = Math.max(0, Math.min(100, Number(args[1]) || 0));
      allowHeal(target);
      target.health = health;
      if (target.getSyncedMeta('crp:knocked') != null) target.deleteSyncedMeta('crp:knocked');
      out.info(`Игроку ${nameOf(target)} установлено ${health} ед. здоровья`, player);
      notifyInfo(target, `${nameOf(player)} установил вам ${health} ед. здоровья`);
    },
  },
  '/kill': {
    access: 4,
    description: 'Убить игрока',
    args: '[ид_игрока]:n',
    handler(player, args, out) {
      const target = playerById(Number(args[0]));
      if (!target) return out.error(`Игрок #${args[0]} не найден`, player);
      allowHeal(target);
      target.health = 0;
    },
  },
  '/kick': {
    access: 2,
    description: 'Кик игрока',
    args: '[ID] [причина]',
    handler(player, args) {
      const target = playerById(Number(args[0]));
      if (!target) return notifyWarning(player, 'Игрок не найден');
      tellPlayers(`!{#db5e4a}Администратор ${nameOf(player)}[${player.id}] кикнул игрока ${nameOf(target)}[${target.id}]: ${args.slice(1).join(' ')}`);
      target.kick('kicked');
    },
  },
  '/skick': {
    access: 4,
    description: 'Тихий кик игрока',
    args: '[ID]',
    handler(player, args) {
      const target = playerById(Number(args[0]));
      if (!target) return notifyWarning(player, 'Игрок не найден');
      tellAdmins(`!{#9e9e9e}[A] Администратор ${nameOf(player)}[${player.id}] кикнул игрока ${nameOf(target)}[${target.id}] без лишнего шума`);
      target.kick('kicked');
    },
  },
  '/ban': {
    access: 4,
    description: 'Забанить игрока',
    args: '[ид_игрока]:n [дни]:n [причина]',
    handler(player, args, out) {
      const target = playerById(Number(args[0]));
      const account = target ? getSession(target).account : null;
      if (!target || !account) return out.error(`Игрок #${args[0]} не найден`, player);
      const days = Math.max(1, Math.min(30, Number(args[1]) || 1));
      tellPlayers(`!{#db5e4a}Администратор ${nameOf(player)}[${player.id}] забанил игрока ${nameOf(target)}[${target.id}]: ${args.slice(2).join(' ')}`);
      account.clearBanDate = new Date(Date.now() + days * 86400000);
      void account.save();
      target.kick();
    },
  },
  '/offban': {
    access: 4,
    description: 'Забанить игрока оффлайн',
    args: '[имя] [фамилия] [дни]:n [причина]',
    async handler(player, args, out) {
      const character = await characterByName(`${args[0]} ${args[1]}`);
      const account = character ? await accountOf(character) : null;
      if (!character || !account) return out.error(`Персонаж ${args[0]} ${args[1]} не найден`, player);
      const days = Math.max(1, Math.min(30, Number(args[2]) || 1));
      account.clearBanDate = new Date(Date.now() + days * 86400000);
      await account.save();
      const online = mint.Player.all.find((entry) => getSession(entry).character?.id === character.id);
      if (online) online.kick();
      out.info(`${nameOf(player)} забанил ${character.name} оффлайн на ${days} дней: ${args.slice(3).join(' ')}`);
    },
  },
  '/permban': {
    access: 5,
    description: 'Перманентный бан',
    args: '[ид_игрока]:n [причина]',
    async handler(player, args, out) {
      const target = playerById(Number(args[0]));
      const account = target ? getSession(target).account : null;
      if (!target || !account) return out.error(`Игрок #${args[0]} не найден`, player);
      const reason = args.slice(1).join(' ');
      tellPlayers(`!{#db5e4a}Администратор ${nameOf(player)}[${player.id}] забанил игрока ${nameOf(target)}[${target.id}]: ${reason} (PERMANENT)`);
      await table('Ban').create({ ip: target.ip, socialClub: target.socialID, serial: target.hwidHash, reason });
      account.clearBanDate = new Date(Date.now() + 30 * 365 * 86400000);
      await account.save();
      target.kick();
    },
  },
  '/offpermban': {
    access: 5,
    description: 'Перманентный бан оффлайн',
    args: '[имя]:s [фамилия]:s [причина]',
    async handler(player, args, out) {
      const full = `${args[0]} ${args[1]}`;
      if (mint.Player.all.some((entry) => getSession(entry).character?.name === full)) return out.error('Игрок в сети, используйте /permban', player);
      const character = await characterByName(full);
      const account = character ? await accountOf(character) : null;
      if (!character || !account) return out.error(`Персонаж ${full} не найден`, player);
      const reason = args.slice(2).join(' ');
      await table('Ban').create({ ip: account.lastIp, socialClub: account.socialClub, reason });
      account.clearBanDate = new Date(Date.now() + 30 * 365 * 86400000);
      await account.save();
      out.info(`${nameOf(player)} выдал пермбан в офлайне игроку ${character.name}: ${reason}`);
    },
  },
  '/unban': {
    access: 5,
    description: 'Разбанить игрока',
    args: '[имя] [фамилия]',
    async handler(player, args, out) {
      const full = args.join(' ');
      const character = await characterByName(full);
      const account = character ? await accountOf(character) : null;
      if (!character || !account) return out.error(`Персонаж ${full} не найден`, player);
      if (!account.clearBanDate) return out.error(`Персонаж ${full} не имеет бан`, player);
      account.clearBanDate = null;
      await account.save();
      const op = db.Op as { or: symbol };
      const rows = (await table('Ban').findAll({
        where: { [op.or]: [{ ip: account.lastIp }, { socialClub: account.socialClub }] },
      })) as DbRow[];
      for (const row of rows) if (typeof row.destroy === 'function') await row.destroy();
      out.info(`${nameOf(player)} разбанил ${full}`);
    },
  },
  '/warn': {
    access: 3,
    description: 'Выдать варн игроку',
    args: '[ид_игрока]:n [причина]',
    handler(player, args, out) {
      const target = playerById(Number(args[0]));
      const character = target ? getSession(target).character : null;
      const account = target ? getSession(target).account : null;
      if (!target || !character || !account) return out.error(`Игрок #${args[0]} не найден`, player);
      const reason = args.slice(1).join(' ');
      character.factionId = null;
      character.warnNumber = (Number(character.warnNumber) || 0) + 1;
      character.warnDate = new Date();
      if (character.warnNumber >= 3) {
        character.warnNumber = 0;
        character.warnDate = null;
        account.clearBanDate = new Date(Date.now() + 30 * 86400000);
        void account.save();
        tellPlayers(`!{#db5e4a}Администратор ${nameOf(player)}[${player.id}] забанил игрока ${nameOf(target)}[${target.id}]: ${reason} (3 варнов)`);
      } else {
        tellPlayers(`!{#db5e4a}Администратор ${nameOf(player)}[${player.id}] выдал warn игроку ${nameOf(target)}[${target.id}]: ${reason}`);
      }
      void character.save();
      target.kick();
    },
  },
  '/offwarn': {
    access: 4,
    description: 'Выдать офлайн варн',
    args: '[имя]:s [фамилия]:s [причина]',
    async handler(player, args, out) {
      const full = `${args[0]} ${args[1]}`;
      if (mint.Player.all.some((entry) => getSession(entry).character?.name === full)) return out.error('Игрок в сети, используйте /warn', player);
      const character = await characterByName(full);
      const account = character ? await accountOf(character) : null;
      if (!character || !account) return out.error(`Персонаж ${full} не найден`, player);
      character.factionId = null;
      character.warnNumber = (Number(character.warnNumber) || 0) + 1;
      character.warnDate = new Date();
      const reason = args.slice(2).join(' ');
      if (character.warnNumber >= 3) {
        character.warnNumber = 0;
        character.warnDate = null;
        account.clearBanDate = new Date(Date.now() + 30 * 86400000);
        await account.save();
        tellPlayers(`!{#db5e4a}Администратор ${nameOf(player)}[${player.id}] забанил игрока ${character.name}: ${reason} (3 варнов)`);
      } else {
        tellPlayers(`!{#db5e4a}Администратор ${nameOf(player)}[${player.id}] выдал warn игроку ${character.name}: ${reason}`);
      }
      await character.save();
    },
  },
  '/unwarn': {
    access: 4,
    description: 'Снять все варны',
    args: '[id]:n',
    handler(player, args, out) {
      const target = playerById(Number(args[0]));
      const character = target ? getSession(target).character : null;
      if (!target || !character) return out.error(`Игрок #${args[0]} не найден`, player);
      character.warnNumber = 0;
      character.warnDate = null;
      void character.save();
      pushWarns(target);
      notifyInfo(target, `${nameOf(player)} снял вам все варны`);
      out.info(`${nameOf(player)} снял все варны ${nameOf(target)}`);
    },
  },
  '/mute': {
    access: 2,
    description: 'Запретить текстовый и голосовой чат',
    args: '[ид_игрока]:n [минуты]:n [причина]',
    handler(player, args, out) {
      const target = playerById(Number(args[0]));
      const character = target ? getSession(target).character : null;
      if (!target || !character) return out.error(`Игрок #${args[0]} не найден`, player);
      const mins = Number(args[1]) || 0;
      character.muteTime = mins * 60 * 1000;
      void character.save();
      silence(target, Date.now() + mins * 60 * 1000);
      tellPlayers(`!{#db5e4a}Администратор ${nameOf(player)}[${player.id}] выдал мут игроку ${nameOf(target)}[${target.id}] (${mins} мин): ${args.slice(2).join(' ')}`);
    },
  },
  '/clothes': {
    access: 3,
    description: 'Выдача тестовой одежды',
    args: '[тип] [вариация] [текстура]',
    handler(player, args) {
      player.setClothes(Number(args[0]) || 0, Number(args[1]) || 0, Number(args[2]) || 0, 0);
    },
  },
  '/prop': {
    access: 3,
    description: 'Выдача тестового пропа',
    args: '[тип] [текстура] [вариация]',
    handler(player, args) {
      player.setProp(Number(args[0]) || 0, Number(args[1]) || 0, Number(args[2]) || 0);
    },
  },
  '/tpos': {
    access: 3,
    description: 'Телепорт по координате',
    args: '[x] [y] [z]',
    handler(player, args) {
      move(player, Number(args[0]), Number(args[1]), Number(args[2]), player.dimension);
    },
  },
  '/setd': {
    access: 4,
    description: 'Смена измерения',
    args: '[номер]',
    handler(player, args) {
      const dimension = Number(args[0]);
      if (!Number.isFinite(dimension)) return;
      allowMove(player);
      player.dimension = dimension;
      notifyInfo(player, `Установлено измерение: ${dimension}`);
    },
  },
  '/getpos': {
    access: 6,
    description: 'Координаты в чат',
    args: '',
    handler(player) {
      const pos = player.pos;
      mint.emitClient(player, 'crp:chat', `!{#ffffff}${pos.x.toFixed(2)} ${pos.y.toFixed(2)} ${pos.z.toFixed(2)} h ${(player.rot.z * 180 / Math.PI).toFixed(2)}`);
    },
  },
  '/setadmin': {
    access: 5,
    description: 'Назначить администратора',
    args: '[ID] [Уровень администрирования]',
    handler(player, args, out) {
      const level = Number(args[1]);
      const target = playerById(Number(args[0]));
      const mine = Number(getSession(player).character?.admin) || 0;
      const character = target ? getSession(target).character : null;
      if (!target || !character || level < 1) return notifyError(player, 'Игрок не найден', 'Ошибка');
      if (level >= mine) return notifyError(player, 'Недостаточно прав', 'Ошибка');
      character.admin = level;
      void character.save();
      target.emit('crp:admin:level', level);
      out.info(`${nameOf(player)} назначил ${nameOf(target)} администратором ${level} уровня`);
      mint.emitClient(target, 'crp:chat', `!{#ffcf0d} ${nameOf(player)} назначил вас администратором ${level} уровня`);
    },
  },
  '/deladmin': {
    access: 5,
    description: 'Снять админку',
    args: '[ID]',
    handler(player, args, out) {
      const target = playerById(Number(args[0]));
      const character = target ? getSession(target).character : null;
      const mine = Number(getSession(player).character?.admin) || 0;
      if (!target || !character) return notifyError(player, 'Игрок не найден', 'Ошибка');
      if (mine < (Number(character.admin) || 0)) return notifyError(player, 'Недостаточно прав', 'Ошибка');
      character.admin = 0;
      void character.save();
      target.emit('crp:admin:level', 0);
      mint.emitClient(target, 'crp:chat', `!{#ff8819} ${nameOf(player)} забрал у вас права администратора`);
      out.info(`${nameOf(player)} забрал у ${nameOf(target)} права администратора`);
    },
  },
  '/admins': {
    access: 1,
    description: 'Список администраторов',
    args: '',
    handler(player) {
      mint.emitClient(player, 'crp:chat', '!{#ecffbf}Список администраторов в сети:');
      for (const current of mint.Player.all) {
        const level = Number(getSession(current).character?.admin) || 0;
        if (level > 0) mint.emitClient(player, 'crp:chat', `!{#ecffbf}${nameOf(current)} (${level} уровень)`);
      }
    },
  },
  '/licensegive': {
    access: 6,
    description: 'Выдать водительскую лицензию',
    args: '[ид_игрока]:n [категория]:s',
    handler(player, args, out) {
      const target = playerById(Number(args[0]));
      const character = target ? getSession(target).character : null;
      const license = LICENSES[String(args[1])];
      if (!target || !character) return out.error(`Игрок #${args[0]} не найден`, player);
      if (!license) return out.error('Категория: car, passenger, bike, truck, air или boat', player);
      if (character[license[0]]) return out.error(`${nameOf(target)} уже имеет лицензию (${license[1]})`, player);
      character[license[0]] = true;
      void character.save();
      notifyInfo(target, `${nameOf(player)} выдал вам лицензию (${license[1]})`, 'Админ');
      out.info(`${nameOf(player)} выдал ${nameOf(target)} лицензию (${license[1]})`);
    },
  },
  '/licenseremove': {
    access: 6,
    description: 'Забрать водительскую лицензию',
    args: '[ид_игрока]:n [категория]:s',
    handler(player, args, out) {
      const target = playerById(Number(args[0]));
      const character = target ? getSession(target).character : null;
      const license = LICENSES[String(args[1])];
      if (!target || !character) return out.error(`Игрок #${args[0]} не найден`, player);
      if (!license) return out.error('Категория: car, passenger, bike, truck, air или boat', player);
      character[license[0]] = false;
      void character.save();
      out.info(`${nameOf(player)} забрал у ${nameOf(target)} лицензию (${license[1]})`);
    },
  },
  '/godmode': {
    access: 2,
    description: 'Бессмертие',
    args: '',
    handler(player, _args, out) {
      const on = !godmodeOn(player);
      setGodmode(player, on);
      out.info(on ? 'Бессмертие включено' : 'Бессмертие выключено', player);
    },
  },
  '/slap': {
    access: 2,
    description: 'Дать пинка игроку',
    args: '[ид_игрока]:n',
    handler(player, args, out) {
      const target = playerById(Number(args[0]));
      if (!target) return out.error(`Игрок #${args[0]} не найден`, player);
      allowMove(target, 3000);
      target.emit('crp:admin:slap');
      notifyWarning(target, 'Администратор пнул вас');
    },
  },
  '/vanish': {
    access: 2,
    description: 'Невидимость',
    args: '',
    handler(player, _args, out) {
      const on = !player.getStreamSyncedMeta('crp:vanished');
      player.setStreamSyncedMeta('crp:vanished', on);
      setVanished(player, on);
      out.info(on ? 'Режим невидимки включен' : 'Режим невидимки отключен', player);
    },
  },
  '/stats': {
    access: 5,
    description: 'Статистика персонажа',
    args: '[ID]:n',
    async handler(player, args, out) {
      const target = playerById(Number(args[0]));
      const character = target ? getSession(target).character : null;
      if (!target || !character) return out.error('Игрок не найден', player);
      const phone = (await table('Phone').findOne({ where: { characterId: character.id } })) as DbRow | null;
      player.emit('crp:admin:stats', JSON.stringify({ ...character.dataValues, name: character.name, phone: phone?.number ?? null }));
    },
  },
  '/setnick': {
    access: 5,
    description: 'Сменить ник',
    args: '[id]:n [имя]:s [фамилия]:s',
    handler(player, args, out) {
      const target = playerById(Number(args[0]));
      const character = target ? getSession(target).character : null;
      if (!target || !character) return out.error('Игрок не найден', player);
      const nick = `${args[1]} ${args[2]}`;
      out.info(`${nameOf(player)} сменил ник игроку ${character.name} на ${nick}`);
      character.name = nick;
      void character.save();
      mint.emitClient(target, 'crp:chat', `!{#ffbe4f}Администратор ${nameOf(player)} сменил ваш ник на ${nick}`);
      target.kick('kicked');
    },
  },
  '/masstp': {
    access: 4,
    description: 'Массовый телепорт',
    args: '',
    handler(player, _args, out) {
      if (mass) {
        mass = null;
        out.info(`${nameOf(player)} отключил массовый телепорт`);
      } else {
        mass = { x: player.pos.x, y: player.pos.y, z: player.pos.z, dimension: player.dimension };
        out.info(`${nameOf(player)} включил массовый телепорт`);
      }
    },
  },
  '/hpall': {
    access: 2,
    description: 'Пополнить здоровье в радиусе',
    args: '[радиус]:n',
    handler(player, args) {
      for (const current of near(player, Number(args[0]))) {
        allowHeal(current);
        current.health = 100;
        notifyInfo(current, 'Ваше здоровье восстановлено администратором');
      }
      tellAdmins(`!{#edffc2}[A] ${nameOf(player)} пополнил HP игрокам в радиусе ${args[0]}`);
    },
  },
  '/red': {
    access: 2,
    description: 'Красный ник',
    args: '',
    handler(player, _args, out) {
      const on = !player.getSyncedMeta('crp:redNick');
      if (on) player.setSyncedMeta('crp:redNick', true);
      else player.deleteSyncedMeta('crp:redNick');
      out.info(on ? 'Красный ник включен' : 'Красный ник отключен', player);
    },
  },
  '/anim': {
    access: 1,
    description: 'Проиграть анимацию.',
    args: '[dict] [name] [speed]:n [flag]:n',
    handler(player, args, out) {
      const dict = String(args[0] ?? '');
      const name = String(args[1] ?? '');
      if (!hasAnim(dict, name)) return out.error('Анимация не найдена', player);
      playAnimation(player, dict, name, Number(args[3]) || 1, Number(args[2]) || 1);
    },
  },
  '/stopanim': {
    access: 1,
    description: 'Остановить анимацию.',
    args: '',
    handler(player) {
      stopAnimation(player);
    },
  },
  '/animid': {
    access: 1,
    description: 'Проиграть анимацию по ID анимации.',
    args: '[id]:n',
    handler(player, args) {
      playCatalog(player, Number(args[0]));
    },
  },
  '/animator': {
    access: 1,
    description: 'Вкл/выкл режим воспроизведения анимаций.',
    args: '',
    handler(player) {
      mint.emitClient(player, 'crp:animator');
    },
  },
  '/wlist': {
    access: 6,
    description: 'Просмотреть вайтлист',
    args: '',
    async handler(player, _args, out) {
      const list = (await table('WhiteList').findAll()) as DbRow[];
      let result = 'WHITELIST: <br/>';
      for (const record of list) result += `${record.id}) ${record.socialClub}<br/>`;
      out.info(result, player);
    },
  },
  '/wlistadd': {
    access: 6,
    description: 'Добавить игрока в вайтлист',
    args: '[socialClub]:s',
    async handler(player, args, out) {
      const socialClub = String(args[0] ?? '');
      const exists = await table('WhiteList').findOne({ where: { socialClub } });
      if (exists) return out.error('Игрок уже в вайтлисте', player);
      await table('WhiteList').create({ socialClub });
      out.info(`Игрок ${socialClub} добавлен в вайтлист`, player);
    },
  },
  '/wlistremove': {
    access: 6,
    description: 'Удалить игрока из вайтлиста',
    args: '[socialClub]:s',
    async handler(player, args, out) {
      const socialClub = String(args[0] ?? '');
      const record = (await table('WhiteList').findOne({ where: { socialClub } })) as DbRow | null;
      if (!record) return out.error('Игрока нет в вайтлисте', player);
      await record.destroy();
      out.info(`Игрок ${socialClub} удален из вайтлиста`, player);
    },
  },
  '/attach': {
    access: 6,
    description: 'Добавить аттач предмета к игроку.',
    args: '[ид_игрока]:n [ид_аттача]',
    handler(player, args, out) {
      const rec = playerById(Number(args[0]));
      if (!rec) return out.error(`Игрок #${args[0]} не найден`, player);
      addAttachment(rec, args.slice(1).map((part) => String(part)).join(' ').trim());
    },
  },
  '/remattach': {
    access: 6,
    description: 'Удалить аттач предмета у игрока.',
    args: '[ид_игрока]:n [ид_аттача]',
    handler(player, args, out) {
      const rec = playerById(Number(args[0]));
      if (!rec) return out.error(`Игрок #${args[0]} не найден`, player);
      addAttachment(rec, args.slice(1).map((part) => String(part)).join(' ').trim(), true);
    },
  },
  '/testattach': {
    access: 6,
    description: 'Тестовый аттач (используется для настройки аттачей).',
    args: '[model] [bone]:n [x]:n [y]:n [z]:n [rX]:n [rY]:n [rZ]:n',
    handler(player, args) {
      mint.emitClient(
        player,
        'attaches.test',
        String(args[0] ?? ''),
        Number(args[1]) || 0,
        Number(args[2]) || 0,
        Number(args[3]) || 0,
        Number(args[4]) || 0,
        Number(args[5]) || 0,
        Number(args[6]) || 0,
        Number(args[7]) || 0,
      );
    },
  },
  '/testattachoff': {
    access: 6,
    description: 'Удалить тестовый аттач (используется для настройки аттачей).',
    args: '',
    handler(player) {
      mint.emitClient(player, 'attaches.testoff');
    },
  },
  '/wlistparse': {
    access: 6,
    description: 'Парсинг старых значений вайтлиста',
    args: '',
    async handler(player, _args, out) {
      const oldList = ['login'];
      for (const socialClub of oldList) {
        const exists = await table('WhiteList').findOne({ where: { socialClub } });
        if (exists) continue;
        await table('WhiteList').create({ socialClub });
        out.info(`Игрок ${socialClub} добавлен в вайтлист`, player);
      }
    },
  },
};

function tellAdmins(text: string): void {
  for (const player of mint.Player.all) {
    if ((Number(getSession(player).character?.admin) || 0) > 0) mint.emitClient(player, 'crp:chat', text);
  }
}

function tellPlayers(text: string): void {
  for (const player of mint.Player.all) {
    if (getSession(player).character) mint.emitClient(player, 'crp:chat', text);
  }
}

