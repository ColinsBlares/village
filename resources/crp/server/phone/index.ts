import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { writeCrash } from '../core/log.js';
import { pushNumber } from '../player/menu.js';
import type { DbRow } from '../player/session.js';
import { getSession } from '../player/session.js';
import { cef } from '../ui/send.js';
import { houseApp, houseForCharacter } from '../houses/index.js';
import { bizApp } from '../bizes/index.js';
import { factionInfo, rankNumber } from '../factions/index.js';
import { notifyInfo } from '../ui/notify.js';
import { linkCall, unlinkCall } from '../voice/index.js';
import { addAttachment, hasAttachment } from '../attaches/index.js';
import { playAnimation, stopAnimation } from '../animations/index.js';

interface Line {
  otherId: number;
  timer: ReturnType<typeof setTimeout> | null;
}

const numbers = new Map<number, { id: number; number: string }>();
const lines = new Map<number, Line>();

export function phoneOf(player: mint.Player): { id: number; number: string } | null {
  return numbers.get(player.id) ?? null;
}

function byNumber(number: string): mint.Player | null {
  for (const player of mint.Player.all) {
    if (numbers.get(player.id)?.number === number) return player;
  }
  return null;
}

function callAns(player: mint.Player, code: number): void {
  cef(player, `mp.event.call('phone.call.ans', ${code});`);
}

function hang(player: mint.Player): void {
  const line = lines.get(player.id);
  if (!line) return;
  if (line.timer) clearTimeout(line.timer);
  const other = mint.Player.getByID(line.otherId);
  lines.delete(player.id);
  if (other) lines.delete(other.id);
  unlinkCall(player);
  if (hasAttachment(player, 'callPhone') || hasAttachment(player, 'takePhone')) phoneProp(player, 'take');
  if (other?.valid) {
    unlinkCall(other);
    if (hasAttachment(other, 'callPhone') || hasAttachment(other, 'takePhone')) phoneProp(other, 'take');
    cef(other, `mp.event.call('phone.call.end');`);
  }
}

function listOf(row: DbRow, key: string): unknown[] {
  const value = row[key];
  return Array.isArray(value) ? value : [];
}

export async function sendPhone(player: mint.Player): Promise<void> {
  const character = getSession(player).character;
  if (!character || !player.valid) return;
  let phone: DbRow | null = null;
  try {
    phone = (await table('Phone').findOne({
      where: { characterId: character.id },
      include: [table('PhoneContact'), table('PhoneDialog')],
    })) as DbRow | null;
  } catch (err) {
    writeCrash('phone.load', err);
    phone = (await table('Phone').findOne({ where: { characterId: character.id } })) as DbRow | null;
  }
  const json = phone && typeof phone.toJSON === 'function' ? (phone.toJSON() as DbRow) : phone;
  const house = houseForCharacter(Number(character.id));
  const biz = (await table('Biz').findOne({ where: { characterId: character.id } })) as DbRow | null;
  const info = {
    isHave: phone != null,
    number: phone ? phone.number : null,
    money: phone ? Number(phone.money) || 0 : 0,
    houses: house ? [houseApp(house)] : [],
    biz: biz ? [bizApp(biz)] : [],
    contacts: json ? listOf(json, 'PhoneContacts') : [],
  };
  const dialogs = json ? listOf(json, 'PhoneDialogs') : [];
  const apps = Number(character.job) === 2 ? ['taxi'] : [];
  if (phone) numbers.set(player.id, { id: Number(phone.id), number: String(phone.number) });
  else numbers.delete(player.id);
  const faction = factionInfo(Number(character.factionId) || 0);
  const top = faction?.ranks.length ? Math.max(...faction.ranks.map((rank) => rank.rank)) : 0;
  const club = faction && rankNumber(player) >= top
    ? (await table('Biz').findOne({ where: { factionId: faction.id, type: 10 } })) as DbRow | null
    : null;
  const extra = club ? `phone.app.add('factionBiz', ${JSON.stringify(bizApp(club))});` : '';
  cef(player, `mp.event.call('phone.load', ${JSON.stringify(info)}, ${JSON.stringify(dialogs)}, ${JSON.stringify(apps)}); ${extra}`);
  pushNumber(player, phone ? phone.number : null);
}

async function dialogWith(phoneId: number, number: string): Promise<DbRow> {
  const found = (await table('PhoneDialog').findOne({ where: { phoneId, number } })) as DbRow | null;
  if (found) return found;
  return (await table('PhoneDialog').create({ phoneId, number })) as DbRow;
}

function phoneProp(player: mint.Player, kind: 'take' | 'call' | 'off'): void {
  addAttachment(player, 'takePhone', true);
  addAttachment(player, 'callPhone', true);
  if (kind === 'take') addAttachment(player, 'takePhone');
  if (kind === 'call') addAttachment(player, 'callPhone');
}

function holdPhone(player: mint.Player, on: boolean): void {
  if (!player.valid) return;
  if (!on || player.vehicle) {
    phoneProp(player, 'off');
    if (!player.vehicle) stopAnimation(player);
    return;
  }
  playAnimation(player, 'amb@code_human_wander_texting@male@base', 'static', 49);
  phoneProp(player, 'take');
}

export function installPhone(): void {
  mint.onClient('crp:phone:hold', (player, on) => {
    if (!player?.valid) return;
    try {
      holdPhone(player, on === true || on === 1);
    } catch (err) {
      writeCrash('phone.hold', err);
    }
  });
  mint.on('playerDisconnect', (player) => {
    if (player.valid) phoneProp(player, 'off');
  });
  mint.onClient('crp:phone:call', (player, raw) => {
    const mine = phoneOf(player);
    const number = String(raw ?? '');
    if (!mine) return;
    if (lines.has(player.id) || mine.number === number) {
      callAns(player, 2);
      return;
    }
    const other = byNumber(number);
    if (!other) {
      callAns(player, 4);
      return;
    }
    if (lines.has(other.id)) {
      callAns(player, 2);
      return;
    }
    const timer = setTimeout(() => {
      callAns(player, 4);
      hang(player);
    }, 20000);
    lines.set(player.id, { otherId: other.id, timer });
    lines.set(other.id, { otherId: player.id, timer: null });
    cef(other, `mp.event.call('phone.call.in', ${JSON.stringify(mine.number)});`);
  });

  mint.onClient('crp:phone:answer', (player, ans) => {
    const line = lines.get(player.id);
    const other = line ? mint.Player.getByID(line.otherId) : null;
    const caller = other ? lines.get(other.id) : null;
    if (!line || !other?.valid || !caller) return;
    if (caller.timer) clearTimeout(caller.timer);
    caller.timer = null;
    if (Number(ans) === 1) {
      linkCall(player, other);
      phoneProp(player, 'call');
      phoneProp(other, 'call');
      callAns(other, 0);
      return;
    }
    callAns(other, 3);
    lines.delete(player.id);
    lines.delete(other.id);
  });

  mint.onClient('crp:phone:end', (player) => {
    hang(player);
  });

  mint.onClient('crp:phone:message', async (player, text, rawNumber) => {
    const mine = phoneOf(player);
    const message = String(text ?? '').slice(0, 100);
    const number = String(rawNumber ?? '');
    if (!mine || !message) return;
    const targetPhone = (await table('Phone').findOne({ where: { number } })) as DbRow | null;
    if (!targetPhone) {
      cef(player, `mp.event.call('phone.error', 1);`);
      return;
    }
    const ownDialog = await dialogWith(mine.id, number);
    await table('PhoneMessage').create({
      phoneDialogId: ownDialog.id,
      isMine: 1,
      text: message,
      isRead: 1,
      date: new Date(),
    });
    if (mine.number === number) return;
    const other = byNumber(number);
    if (!other) {
      cef(player, `mp.event.call('phone.error', 2);`);
      return;
    }
    const their = phoneOf(other);
    if (!their) return;
    const incoming = await dialogWith(their.id, mine.number);
    await table('PhoneMessage').create({
      phoneDialogId: incoming.id,
      isMine: 0,
      text: message,
      isRead: 0,
      date: new Date(),
    });
    notifyInfo(other, 'Новое сообщение', 'Телефон');
    cef(other, `mp.event.call('phone.message.set', ${JSON.stringify(message)}, ${JSON.stringify(mine.number)});`);
  });

  mint.onClient('crp:phone:read', async (player, rawNumber) => {
    const mine = phoneOf(player);
    if (!mine) return;
    const dialog = (await table('PhoneDialog').findOne({
      where: { phoneId: mine.id, number: String(rawNumber ?? '') },
    })) as DbRow | null;
    if (!dialog) return;
    const rows = (await table('PhoneMessage').findAll({ where: { phoneDialogId: dialog.id, isRead: 0 } })) as DbRow[];
    for (const row of rows) {
      row.isRead = 1;
      await row.save();
    }
  });

  mint.onClient('crp:phone:contact', async (player, name, rawNumber) => {
    const mine = phoneOf(player);
    const contactName = String(name ?? '').slice(0, 50);
    const number = String(rawNumber ?? '').slice(0, 16);
    if (!mine || !contactName || !number) return;
    const same = (await table('PhoneContact').findOne({ where: { phoneId: mine.id, name: contactName } })) as DbRow | null;
    if (same) {
      cef(player, `mp.event.call('phone.error', 3);`);
      return;
    }
    await table('PhoneContact').create({ phoneId: mine.id, name: contactName, number });
    await sendPhone(player);
  });

  mint.onClient('crp:phone:rename', async (player, rawNumber, rawName) => {
    const mine = phoneOf(player);
    const number = String(rawNumber ?? '');
    const contactName = String(rawName ?? '').slice(0, 50);
    if (!mine || !number || !contactName) return;
    const same = (await table('PhoneContact').findOne({ where: { phoneId: mine.id, name: contactName } })) as DbRow | null;
    if (same) {
      cef(player, `mp.event.call('phone.error', 3);`);
      return;
    }
    const contact = (await table('PhoneContact').findOne({ where: { phoneId: mine.id, number } })) as DbRow | null;
    if (!contact) {
      cef(player, `mp.event.call('phone.error', 4);`);
      return;
    }
    contact.name = contactName;
    await contact.save();
    await sendPhone(player);
  });

  mint.on('playerDisconnect', (player) => {
    hang(player);
    numbers.delete(player.id);
  });
}
