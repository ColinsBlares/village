import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { factionName, rankName } from '../factions/index.js';
import { houseForCharacter } from '../houses/index.js';
import { jobName } from '../jobs/index.js';
import { getSession, type DbRow } from './session.js';
import { cef } from '../ui/send.js';
import { notifySuccess } from '../ui/notify.js';
import { settingsPayload } from '../settings/index.js';

export function installPlayerMenu(): void {
  mint.onClient('crp:menu:kick', (player) => {
    if (!player?.valid || !getSession(player).character) return;
    notifySuccess(player, 'До скорого! :)');
    player.kick();
  });
}

export async function pushPlayerMenu(player: mint.Player): Promise<void> {
  const session = getSession(player);
  const character = session.character;
  const account = session.account;
  if (!character || !account) return;
  const promo = (await table('Promocode').findOne({ where: { characterId: character.id } })) as DbRow | null;
  const fines = (await table('Fine').findAll({ where: { recId: character.id } })) as DbRow[];
  const house = houseForCharacter(Number(character.id));
  const data: Record<string, unknown> = {
    playerName: character.name,
    admin: Number(character.admin) || 0,
    factionId: Number(character.factionId) || 0,
    factionName: factionName(player),
    factionRank: rankName(player),
    familyId: Number(character.familyId) || 0,
    family: '',
    jobName: jobName(player),
    minutes: Number(character.minutes) || 0,
    gender: character.gender,
    cash: Number(character.cash) || 0,
    wanted: Number(character.wanted) || 0,
    fines: fines.length,
    law: Number(character.law) || 0,
    crimes: Number(character.crimes) || 0,
    narcotism: Number(character.narcotism) || 0,
    nicotine: Number(character.nicotine) || 0,
    donate: Number(account.donate) || 0,
    convertCash: 100,
    nicknamePrice: 100,
    clearWarnPrice: 200,
    slotPrice: 500,
    warns: Number(character.warnNumber) || 0,
    slots: Number(account.slots) || 1,
    slotsMax: 3,
    promocode: promo?.promocode ?? '',
    invited: Number(promo?.invited) || 0,
    completed: Number(promo?.completed) || 0,
    media: Number(promo?.media) || 0,
    settings: settingsPayload(player),
    email: account.email,
    confirmEmail: account.confirmEmail,
    passwordDate: account.passwordDate ? new Date(account.passwordDate).getTime() : 0,
  };
  if (house) {
    data.house = {
      id: house.info.id,
      pos: [house.info.pickupX, house.info.pickupY, house.info.pickupZ],
      class: house.interior.class,
      rooms: house.interior.numRooms,
      carPlaces: house.garage ? Number(house.garage.carPlaces) || 0 : 0,
      price: house.info.price,
    };
  }
  cef(player, `playerMenu.enable = true; mp.event.call('playerMenu.init', ${JSON.stringify([data])});`);
}

function menu(player: mint.Player, code: string): void {
  cef(player, `if (typeof playerMenu !== 'undefined') { ${code} }`);
}

export function pushFaction(player: mint.Player): void {
  const character = getSession(player).character;
  if (!character) return;
  menu(player, `playerMenu.setFaction(${JSON.stringify({
    factionId: Number(character.factionId) || 0,
    factionName: factionName(player),
    factionRank: rankName(player),
  })});`);
}

export function pushFactionRank(player: mint.Player): void {
  menu(player, `playerMenu.setFactionRank(${JSON.stringify({ factionRank: rankName(player) || '-' })});`);
}

export function pushFamily(player: mint.Player, title: string | null): void {
  menu(player, `playerMenu.setFamily(${JSON.stringify({
    familyId: Number(getSession(player).character?.familyId) || 0,
    family: title,
  })});`);
}

export function pushDonate(player: mint.Player): void {
  menu(player, `playerMenu.setDonate(${Number(getSession(player).account?.donate) || 0});`);
}

export function pushWarns(player: mint.Player): void {
  menu(player, `playerMenu.setWarns(${Number(getSession(player).character?.warnNumber) || 0});`);
}

export function pushSlots(player: mint.Player): void {
  menu(player, `playerMenu.setSlots(${Number(getSession(player).account?.slots) || 1});`);
}

export function pushName(player: mint.Player): void {
  menu(player, `playerMenu.setName(${JSON.stringify(String(getSession(player).character?.name ?? player.name))});`);
}

export function pushNarcotism(player: mint.Player): void {
  menu(player, `playerMenu.setNarcotism(${Number(getSession(player).character?.narcotism) || 0});`);
}

export function pushNicotine(player: mint.Player): void {
  menu(player, `playerMenu.setNicotine(${Number(getSession(player).character?.nicotine) || 0});`);
}

export function pushNumber(player: mint.Player, number: string | number | null): void {
  menu(player, `playerMenu.setNumber(${JSON.stringify(number == null || number === '' ? '-' : number)});`);
}

export function pushSpouse(player: mint.Player, spouse: { name: string; gender: number } | null): void {
  menu(player, `playerMenu.setSpouse(${JSON.stringify(spouse)});`);
}

export function pushFines(player: mint.Player, count: number): void {
  menu(player, `playerMenu.setFines(${Math.max(0, count)});`);
}

export async function pushBiz(player: mint.Player): Promise<void> {
  const row = (await table('Biz').findOne({ where: { characterId: getSession(player).character?.id } })) as DbRow | null;
  const data: Record<string, unknown> = {};
  if (row) {
    data.biz = {
      id: row.id,
      pos: [row.x, row.y, row.z],
      type: String(row.type ?? ''),
      name: row.name,
      price: row.price,
    };
  }
  cef(player, `mp.event.call('playerMenu.setBiz', ${JSON.stringify(data)});`);
}

export function pushJob(player: mint.Player): void {
  menu(player, `playerMenu.setJob(${JSON.stringify({ jobName: jobName(player) })});`);
}
