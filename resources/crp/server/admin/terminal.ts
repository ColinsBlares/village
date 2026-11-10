import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { commands, type Out } from './commands.js';

function level(player: mint.Player): number {
  return Number(getSession(player).character?.admin) || 0;
}

export function pushTerminal(player: mint.Player, type: string, text: string): void {
  cef(player, `terminal.push(${JSON.stringify(type)}, ${JSON.stringify(text)});`);
}

export function terminalOut(player: mint.Player): Out {
  return {
    info(text, target) {
      pushTerminal(target ?? player, 'info', text);
    },
    error(text, target) {
      pushTerminal(target ?? player, 'error', text);
    },
  };
}

export function terminalHelp(player: mint.Player, args: string[]): void {
  if (args.length > 0 && Number.isFinite(Number(args[0]))) {
    const asked = Number(args[0]);
    if (asked > level(player)) return pushTerminal(player, 'error', 'Отказано в доступе');
    let text = `${asked} уровень администратора:<br/>`;
    let count = 0;
    for (const [name, cmd] of Object.entries(commands)) {
      if (cmd.access !== asked) continue;
      count += 1;
      text += `<b>${name}</b> <i>${cmd.args}</i> - ${cmd.description}<br/>`;
    }
    text += `<br/>Всего команд: ${count} шт.<br/>Введите "help [name]" или "help [level]" для ознакомления с командой`;
    pushTerminal(player, 'log', text);
    return;
  }
  if (args.length > 0) {
    const cmd = commands[`/${args[0]}`];
    if (!cmd) return pushTerminal(player, 'error', `Команда "${args[0]}" не найдена`);
    pushTerminal(player, 'log', `${args[0]} ${cmd.args} - ${cmd.description}<br/>Мин. уровень: ${cmd.access}`);
    return;
  }
  let text = '';
  for (const [name, cmd] of Object.entries(commands)) {
    if (cmd.access > level(player)) continue;
    text += `<b>${name}</b> ${cmd.args} (${cmd.access} lvl.) - ${cmd.description}<br/>`;
  }
  text += `<br/>Всего команд: ${Object.keys(commands).length} шт.<br/>Введите "help [name]" или "help [level]" для ознакомления с командой`;
  pushTerminal(player, 'log', text);
}

export async function loadTerminalCommands(): Promise<number> {
  const rows = (await table('Command').findAll()) as DbRow[];
  for (const row of rows) {
    const key = String(row.cmd ?? '');
    const cmd = commands[key];
    if (!cmd) continue;
    const name = String(row.name ?? key);
    if (name !== key) {
      commands[name] = cmd;
      delete commands[key];
    }
    cmd.description = String(row.description ?? cmd.description);
    cmd.access = Number(row.access) || cmd.access;
  }
  mint.log(`[TERMINAL] Команды загружены (${rows.length} / ${Object.keys(commands).length} шт.)`);
  return rows.length;
}
