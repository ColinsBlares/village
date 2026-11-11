import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError } from '../ui/notify.js';
import { allowMove, moveNoclip, setNoclip } from '../anticheat/index.js';
import { commands, rememberBack, type Command, type Out } from './commands.js';
import { installBugs } from './bugs.js';
import { pushTerminal, terminalHelp, terminalOut } from './terminal.js';

const reportsSent = new Map<number, number>();

function level(player: mint.Player): number {
  return Number(getSession(player).character?.admin) || 0;
}

function nameOf(player: mint.Player): string {
  return String(getSession(player).character?.name ?? player.name);
}

function chat(player: mint.Player, text: string): void {
  mint.emitClient(player, 'crp:chat', text);
}

function outFor(actor: mint.Player): Out {
  const send = (color: string, text: string, player?: mint.Player) => {
    const line = `${color} ${text}`;
    if (player) chat(player, line);
    else {
      for (const current of mint.Player.all) {
        if (level(current) > 0) chat(current, `!{#e0b8ff}[A] ${text}`);
      }
    }
  };
  return {
    info: (text, player) => send('!{#59dbff}', text, player),
    error: (text, player) => send('!{#ff0000}', text, player ?? actor),
  };
}

function valid(type: string, arg: string): boolean {
  if (type === 'n') return arg.length > 0 && !Number.isNaN(Number(arg));
  if (type === 's') return arg.length > 0;
  if (type === 'b') return arg === '0' || arg === '1';
  return false;
}

function cast(type: string, arg: string): unknown {
  if (type === 'n') return Number(arg);
  if (type === 'b') return arg === '1';
  return arg;
}

export async function runCommand(player: mint.Player, command: string, raw: string[], custom?: Out): Promise<void> {
  const character = getSession(player).character;
  if (!character) return;
  if (!custom && command === '/apanel') return openPanel(player, true);
  if (!custom && command === '/ahelp') return help(player, raw);
  const cmd = commands[command];
  if (!cmd) {
    if (custom) custom.error(`Команда "${command.replace(/^\//, '')}" не найдена. Введите "help" для просмотра всех команд.`, player);
    return;
  }
  if (cmd.access > 0 && level(player) < cmd.access) {
    if (custom) custom.error('Вам недоступна эта команда. Введите "help [name]" для ознакомления', player);
    return;
  }
  const args = raw.slice();
  const tell = (text: string) => {
    if (custom) custom.error(text, player);
    else chat(player, text);
  };
  if (cmd.args) {
    const required = cmd.args.includes(':') ? cmd.args.split(' ') : cmd.args.split('] ');
    if (args.length < required.length) return tell(`!{#ffffff} Используйте: ${command} ${cmd.args}`);
    for (let i = 0; i < required.length; i += 1) {
      const type = required[i].split(':')[1];
      if (!type) continue;
      if (!valid(type, String(args[i] ?? ''))) return tell(`Неверное значение "${args[i]}" для параметра ${required[i]}`);
      args[i] = cast(type, String(args[i])) as string;
    }
  }
  await cmd.handler(player, args, custom ?? outFor(player));
}

function help(player: mint.Player, args: string[]): void {
  const asked = Number(args[0]);
  if (!Number.isFinite(asked)) return chat(player, '!{#ffffff} Используйте /ahelp [уровень администрирования]');
  if (asked < 1 || asked > level(player)) return chat(player, '!{#ffffff} Нет доступа');
  chat(player, `!{#c1f051}Команды ${asked} уровня администрирования:`);
  for (const [name, cmd] of Object.entries(commands) as [string, Command][]) {
    if (cmd.access === asked) chat(player, `!{#ffffff} ${cmd.description}: ${name} ${cmd.args}`);
  }
}

function messagesOf(report: DbRow): Record<string, unknown>[] {
  let messages: Record<string, unknown>[] = [];
  try {
    const parsed = typeof report.messages === 'string' ? JSON.parse(report.messages) : report.messages;
    if (Array.isArray(parsed)) messages = parsed as Record<string, unknown>[];
  } catch {
    messages = [];
  }
  if (!messages.length && report.message) {
    messages.push({
      id: `report-${report.id}`,
      authorCharacterId: report.playerCharacterId,
      authorName: report.playerName,
      authorAdmin: false,
      message: report.message,
      createdAt: report.createdAt,
    });
  }
  return messages.map((message, index) => ({
    ...message,
    id: message.id || `${report.id}-${index}`,
    reportId: report.id,
    authorAdmin: !!message.authorAdmin,
  }));
}

async function panelData(player: mint.Player): Promise<Record<string, unknown>> {
  const character = getSession(player).character;
  const open = (await table('AdminReport').findAll({ where: { status: 'open' } })) as DbRow[];
  const closed = (await table('AdminReport').findAll({ where: { status: 'closed' } })) as DbRow[];
  const reports = open.concat(closed.slice(0, 50)).map((report) => ({
    ...(report.dataValues ?? report),
    messages: undefined,
  }));
  const reportMessages = open.concat(closed.slice(0, 50)).flatMap((report) => messagesOf(report));
  const players = [];
  const staff = [];
  for (const current of mint.Player.all) {
    const row = getSession(current).character;
    if (!row) continue;
    const entry = {
      id: current.id,
      characterId: row.id,
      name: row.name,
      admin: Number(row.admin) || 0,
      factionId: Number(row.factionId) || 0,
      cash: Number(row.cash) || 0,
      bank: Number(row.bank) || 0,
      warnNumber: Number(row.warnNumber) || 0,
      wanted: Number(row.wanted) || 0,
      arrestTime: Number(row.arrestTime) || 0,
      arrestType: Number(row.arrestType) || 0,
      licenses: {
        car: !!row.carLicense,
        passenger: !!row.passengerLicense,
        bike: !!row.bikeLicense,
        truck: !!row.truckLicense,
        air: !!row.airLicense,
        boat: !!row.boatLicense,
        weapon: !!row.gunLicenseDate,
      },
    };
    players.push(entry);
    if (entry.admin > 0) staff.push({ id: entry.characterId, name: entry.name, admin: entry.admin });
  }
  const staffWithReportCounts = [];
  for (const member of staff) {
    const done = (await table('AdminReport').findAll({
      where: { assignedAdminCharacterId: member.id, status: 'closed' },
    })) as DbRow[];
    staffWithReportCounts.push({ ...member, processedReports: done.length });
  }
  const mine = character
    ? ((await table('AdminReport').findAll({
        where: { assignedAdminCharacterId: character.id, status: 'closed' },
      })) as DbRow[]).length
    : 0;
  const available = Object.entries(commands)
    .filter(([, cmd]) => level(player) >= cmd.access && cmd.access > 0)
    .map(([name, cmd]) => ({ name, description: cmd.description, args: cmd.args, access: cmd.access }));
  return {
    self: { characterId: character?.id, name: nameOf(player), level: level(player), processedReports: mine },
    commands: available,
    players,
    staff: staffWithReportCounts,
    reports,
    reportMessages,
  };
}

async function openPanel(player: mint.Player, open: boolean): Promise<void> {
  if (level(player) < 1) return notifyError(player, 'Нет доступа', 'Ошибка');
  const data = await panelData(player);
  cef(player, `mp.event.call(${JSON.stringify(open ? 'adminPanel.open' : 'adminPanel.setData')}, ${JSON.stringify([data])});`);
}

function pushMessage(report: DbRow, message: Record<string, unknown>): void {
  const messages = messagesOf(report);
  messages.push(message);
  report.messages = JSON.stringify(messages);
}

export async function createReport(player: mint.Player, text: string): Promise<void> {
  const character = getSession(player).character;
  if (!character) return;
  const message = text.trim().replace(/[<>]/g, '').slice(0, 512);
  if (!message) return;
  const last = reportsSent.get(Number(character.id)) ?? 0;
  if (Date.now() - last < 60000) {
    const seconds = Math.ceil((60000 - (Date.now() - last)) / 1000);
    return notifyError(player, `Подождите ${seconds} сек. перед следующим сообщением`, 'Репорт');
  }
  reportsSent.set(Number(character.id), Date.now());
  let report = (await table('AdminReport').findOne({
    where: { playerCharacterId: character.id, status: 'open' },
  })) as DbRow | null;
  if (!report) {
    report = (await table('AdminReport').create({
      playerCharacterId: character.id,
      playerName: character.name,
      status: 'open',
      message: message.slice(0, 120),
      messages: '[]',
    })) as DbRow;
  }
  if (!report.message) report.message = message.slice(0, 120);
  pushMessage(report, {
    id: `${report.id}-${Date.now()}`,
    authorCharacterId: character.id,
    authorName: character.name,
    authorAdmin: false,
    message,
  });
  report.playerName = character.name;
  await report.save();
  chat(player, `!{#87c924}Сообщение отправлено в репорт #${report.id}. Ответ администрации появится в чате.`);
  for (const current of mint.Player.all) {
    if (level(current) < 1) continue;
    chat(current, `!{#87c924}[Репорт #${report.id}] ${character.name}[${player.id}]: ${message}`);
    void openPanel(current, false);
  }
}

export function installAdmin(): void {
  installBugs();
  mint.onClient('crp:terminal', async (player, raw) => {
    if (level(player) < 1) return pushTerminal(player, 'error', 'Доступ запрещен');
    let values: string[] = [];
    try {
      const parsed = JSON.parse(String(raw ?? '[]')) as unknown;
      if (Array.isArray(parsed)) values = parsed.map((item) => String(item));
    } catch {
      return;
    }
    const name = values.shift() ?? '';
    if (name === 'help') return terminalHelp(player, values);
    await runCommand(player, `/${name}`, values, terminalOut(player));
  });
  for (const player of mint.Player.all) {
    const admin = level(player);
    if (player.valid && admin > 0) player.emit('crp:admin:level', admin);
  }
  mint.onClient('crp:admin:fly', (player, on, x, y, z, h) => {
    if (!player?.valid) return;
    try {
      const enabled = on === true || on === 1;
      if (enabled) {
        setNoclip(player, true);
        return;
      }
      const nums = [x, y, z, h].map((value) => Number(value));
      const pos = nums.every((value) => Number.isFinite(value))
        ? { x: nums[0], y: nums[1], z: nums[2], h: nums[3] }
        : undefined;
      setNoclip(player, false, pos);
    } catch (err) {
      mint.log(`crp: полёт ${err instanceof Error ? err.message : String(err)}`);
    }
  });
  mint.onClient('crp:admin:fly:pos', (player, x, y, z) => {
    if (!player?.valid) return;
    try {
      moveNoclip(player, Number(x), Number(y), Number(z));
    } catch (err) {
      mint.log(`crp: полёт ${err instanceof Error ? err.message : String(err)}`);
    }
  });
  mint.onClient('crp:admin:command', (player, raw) => {
    if (!player?.valid || typeof raw !== 'string') return;
    const parts = raw.trim().split(/\s+/);
    const command = parts[0];
    if (!command?.startsWith('/')) return;
    void runCommand(player, command, parts.slice(1)).catch((err: unknown) => {
      mint.log(`crp: команда ${command}: ${err instanceof Error ? err.message : String(err)}`);
    });
  });
  mint.onClient('crp:report', (player, text) => {
    void createReport(player, String(text ?? ''));
  });
  mint.onClient('crp:admin:panel', (player) => {
    if (player?.valid) void openPanel(player, false);
  });
  mint.onClient('crp:admin:exec', (player, raw) => {
    if (!player?.valid || level(player) < 1 || typeof raw !== 'string') return;
    const payload = JSON.parse(raw) as { command?: string; args?: unknown[] };
    if (!payload.command || !Array.isArray(payload.args) || payload.args.some((arg) => typeof arg !== 'string')) {
      return notifyError(player, 'Команда недоступна', 'Ошибка');
    }
    const cmd = commands[payload.command];
    if (!cmd || level(player) < cmd.access) return notifyError(player, 'Команда недоступна', 'Ошибка');
    void runCommand(player, payload.command, payload.args as string[]);
  });
  mint.onClient('crp:admin:reply', async (player, raw) => {
    if (!player?.valid || level(player) < 1 || typeof raw !== 'string') return;
    const payload = JSON.parse(raw) as { reportId?: number; message?: string };
    const reportId = Number(payload.reportId);
    const message = String(payload.message ?? '').trim();
    const character = getSession(player).character;
    if (!character || !message || message.length > 512) return notifyError(player, 'Проверьте текст ответа', 'Ошибка');
    const report = (await table('AdminReport').findOne({ where: { id: reportId } })) as DbRow | null;
    if (!report || report.status !== 'open') return notifyError(player, 'Репорт уже закрыт или не найден', 'Ошибка');
    if (Number(report.assignedAdminCharacterId) !== Number(character.id)) return notifyError(player, 'Сначала примите жалобу в работу', 'Ошибка');
    pushMessage(report, {
      id: `${report.id}-${Date.now()}`,
      authorCharacterId: character.id,
      authorName: nameOf(player),
      authorAdmin: true,
      message,
    });
    await report.save();
    for (const current of mint.Player.all) {
      if (getSession(current).character?.id === report.playerCharacterId) {
        chat(current, `!{#59dbff}[Ответ администрации] ${message}`);
      }
    }
    await openPanel(player, false);
  });
  mint.onClient('crp:admin:report', async (player, raw) => {
    if (!player?.valid || level(player) < 1 || typeof raw !== 'string') return;
    const payload = JSON.parse(raw) as { reportId?: number; action?: string; resolution?: string };
    const report = (await table('AdminReport').findOne({ where: { id: Number(payload.reportId) } })) as DbRow | null;
    const character = getSession(player).character;
    if (!report || !character || report.status !== 'open') return notifyError(player, 'Репорт уже закрыт или не найден', 'Ошибка');
    if (payload.action === 'claim') {
      if (report.assignedAdminCharacterId && Number(report.assignedAdminCharacterId) !== Number(character.id)) {
        return notifyError(player, `Жалобу уже принял ${report.assignedAdminName || 'другой администратор'}`, 'Ошибка');
      }
      report.assignedAdminCharacterId = character.id;
      report.assignedAdminName = nameOf(player);
      await report.save();
      await openPanel(player, false);
      return;
    }
    if (payload.action !== 'close') return notifyError(player, 'Неизвестное действие', 'Ошибка');
    if (Number(report.assignedAdminCharacterId) !== Number(character.id)) return notifyError(player, 'Сначала примите жалобу в работу', 'Ошибка');
    const resolution = String(payload.resolution ?? '').trim();
    if (!resolution || resolution.length > 300) return notifyError(player, 'Укажите результат рассмотрения (до 300 символов)', 'Ошибка');
    report.status = 'closed';
    report.closedAt = new Date();
    report.resolution = resolution;
    await report.save();
    await openPanel(player, false);
  });
  mint.onClient('crp:admin:goto', async (player, raw) => {
    if (!player?.valid || level(player) < 2) return notifyError(player, 'Для телепорта нужен 2 уровень администратора', 'Ошибка');
    const report = (await table('AdminReport').findOne({ where: { id: Number(raw) } })) as DbRow | null;
    if (!report) return notifyError(player, 'Жалоба не найдена', 'Ошибка');
    const target = mint.Player.all.find((entry) => getSession(entry).character?.id === report.playerCharacterId);
    if (!target) return notifyError(player, 'Заявитель сейчас не в сети', 'Ошибка');
    rememberBack(player);
    allowMove(player);
    player.dimension = target.dimension;
    player.pos = new mint.Vector3(target.pos.x + 2, target.pos.y, target.pos.z);
    chat(player, `!{#ebd13d}Вы телепортировались к заявителю ${nameOf(target)}. Используйте /goback для возврата.`);
  });
  mint.on('playerDisconnect', (player) => {
    const id = Number(getSession(player).character?.id) || 0;
    if (id) reportsSent.delete(id);
  });
}

export function adminCommands(): Record<string, Command> {
  return commands;
}

