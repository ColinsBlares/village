import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { seizeGarage } from '../carmarket/index.js';
import { ownedHouses, releaseHouse, syncOwnedHouse, type HouseRecord } from '../houses/index.js';
import { releaseBiz } from '../bizes/index.js';
import { pushBiz } from '../player/menu.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyInfo, notifyWarning } from '../ui/notify.js';
import { creditBank } from '../world/money.js';

function calendarDays(date: unknown): number {
  const value = date ? new Date(String(date)) : null;
  if (!value || Number.isNaN(value.getTime())) return 0;
  const now = new Date();
  const left = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const right = Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  return Math.ceil(Math.abs(right - left) / 86400000);
}

function expired(date: unknown): boolean {
  if (date == null) return true;
  const time = new Date(String(date)).getTime();
  return !Number.isFinite(time) || time - Date.now() <= 10000;
}

function ownerOf(characterId: number): mint.Player | null {
  return mint.Player.all.find((entry) => entry.valid && Number(getSession(entry).character?.id) === characterId) ?? null;
}

async function dropHouse(house: HouseRecord): Promise<void> {
  const characterId = await releaseHouse(house);
  if (!characterId) return;
  const price = Math.trunc(Number(house.info.price) * 0.6);
  await seizeGarage(characterId);
  await creditBank(characterId, price);
  const player = ownerOf(characterId);
  if (!player) return;
  cef(player, `phone.app.remove('house', ${Number(house.info.id)});`);
  notifyWarning(player, 'Ваш дом отобрали за неуплату налогов', 'Внимание');
  syncOwnedHouse(player);
}

async function dropBiz(row: DbRow): Promise<void> {
  const price = Math.trunc(Number(row.price) * 0.6);
  const id = Number(row.id);
  const characterId = await releaseBiz(row);
  if (!characterId) return;
  await creditBank(characterId, price);
  const player = ownerOf(characterId);
  if (!player) return;
  cef(player, `phone.app.remove('biz', ${id});`);
  notifyWarning(player, 'Ваш бизнес отобрали за неуплату налогов', 'Внимание');
  void pushBiz(player);
}

export async function sweepTax(): Promise<void> {
  for (const house of ownedHouses()) {
    if (expired(house.info.date)) await dropHouse(house);
  }
  const rows = (await table('Biz').findAll()) as DbRow[];
  for (const row of rows) {
    if (row.characterId == null || !expired(row.date)) continue;
    await dropBiz(row);
  }
}

export function warnTaxes(player: mint.Player): void {
  const characterId = Number(getSession(player).character?.id);
  const house = ownedHouses().find((entry) => Number(entry.info.characterId) === characterId);
  if (house) {
    const days = calendarDays(house.info.date);
    if (days === 1) notifyInfo(player, 'Ваш дом будет продан государству на следующий день за неуплату налогов', 'Внимание');
    else if (days === 0) notifyInfo(player, 'Ваш дом будет продан государству сегодня за неуплату налогов', 'Внимание');
  }
  void table('Biz').findOne({ where: { characterId } }).then((row) => {
    const biz = row as DbRow | null;
    if (!biz?.date || !player.valid) return;
    const days = calendarDays(biz.date);
    if (days === 1) notifyInfo(player, 'Ваш бизнес будет продан государству на следующий день за неуплату налогов', 'Внимание');
    else if (days === 0) notifyInfo(player, 'Ваш бизнес будет продан государству сегодня за неуплату налогов', 'Внимание');
  }).catch(() => undefined);
}

export function installTax(): void {
  mint.setInterval(() => {
    void sweepTax().catch((err: unknown) => mint.logError(String(err)));
  }, 10000);
}
