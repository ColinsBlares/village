import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { createCharacter, isCharacterName, type CreatorInput } from './create.js';
import { loadWorn } from './clothes.js';
import { enterWorld } from './spawn.js';
import { placeForSelect } from './select.js';

const SECOND_SLOT_HOURS = 100;
const SLOT_PRICE = [0, 500, 1000];

async function loadCharacters(accountId: number): Promise<DbRow[]> {
  try {
    const rows = (await table('Character').findAll({
      where: { accountId },
      include: [{ model: table('Feature') }, { model: table('Appearance') }],
    })) as DbRow[];
    return rows.sort((a, b) => a.id - b.id);
  } catch {
    const rows = (await table('Character').findAll({ where: { accountId } })) as DbRow[];
    return rows.sort((a, b) => a.id - b.id);
  }
}

function hoursOf(character: DbRow): number {
  return Math.floor((Number(character.minutes) || 0) / 60);
}

async function lineupOf(characters: DbRow[]): Promise<Record<string, unknown>[]> {
  const list: Record<string, unknown>[] = [];
  for (const character of characters) {
    let worn = { clothes: [] as { component: number; drawable: number; texture: number }[], props: [] as { component: number; drawable: number; texture: number }[] };
    try {
      worn = await loadWorn(character.id);
    } catch {
      worn = { clothes: [], props: [] };
    }
    const features = sortedValues(character, 'Features');
    const overlays = sortedRows(character, 'Appearances');
    list.push({
      gender: Number(character.gender) === 1 ? 1 : 0,
      mother: Number(character.mother) || 21,
      father: Number(character.father) || 0,
      similarity: Number(character.similarity) || 0,
      skin: Number(character.skin) || 0,
      hair: Number(character.hair) || 0,
      hairColor: Number(character.hairColor) || 0,
      hairHighlightColor: Number(character.hairHighlightColor) || 0,
      beardColor: Number(character.beardColor) || 0,
      eyebrowColor: Number(character.eyebrowColor) || 0,
      blushColor: Number(character.blushColor) || 0,
      lipstickColor: Number(character.lipstickColor) || 0,
      chestHairColor: Number(character.chestHairColor) || 0,
      features: Array.from({ length: 20 }, (_, index) => Number(features[index]?.value) || 0),
      overlays: Array.from({ length: 11 }, (_, index) => ({
        value: Number(overlays[index]?.value) || 255,
        opacity: Number(overlays[index]?.opacity) || 0,
      })),
      clothes: worn.clothes,
      props: worn.props,
    });
  }
  return list;
}

function sortedRows(character: DbRow, key: string): DbRow[] {
  const rows = Array.isArray(character[key]) ? (character[key] as DbRow[]) : [];
  return rows.slice().sort((a, b) => Number(a.order) - Number(b.order));
}

function sortedValues(character: DbRow, key: string): DbRow[] {
  return sortedRows(character, key);
}

async function slotCount(account: DbRow, characters: DbRow[]): Promise<number> {
  let slots = Number(account.slots) || 1;
  if (slots === 1 && characters[0] && hoursOf(characters[0]) >= SECOND_SLOT_HOURS) {
    account.slots = 2;
    slots = 2;
    await account.save();
  }
  return Math.max(1, Math.min(3, slots));
}

export async function openCharacters(player: mint.Player, message?: string): Promise<void> {
  const session = getSession(player);
  const account = session.account;
  if (!account) return;
  session.characters = await loadCharacters(account.id);
  const slots = await slotCount(account, session.characters);
  const lines = ['characterInfo.characters = [];'];
  for (const character of session.characters) {
    lines.push(`characterInfo.addCharacter(${JSON.stringify({
      name: String(character.name ?? ''),
      cash: Number(character.cash) || 0,
      bank: Number(character.bank) || 0,
      status: Number(character.admin) > 0 ? 'Администратор' : 'Обычный',
      hours: hoursOf(character),
      faction: 'Нет',
      job: 'Нет',
      house: 'Нет',
      biz: 'Нет',
      warns: Number(character.warnNumber) || 0,
    })});`);
  }
  lines.push(
    `characterInfo.slots = ${slots};`,
    `characterInfo.coins = ${Number(account.donate) || 0};`,
    'characterInfo.limitSlots = 3;',
    'characterInfo.i = 0;',
    'characterInfo.show = true;',
    'auth.show = false;',
    'selectMenu.show = false;',
    'loader.show = false;',
  );
  if (message) lines.push(`notifications.push('error', ${JSON.stringify(message)});`);
  cef(player, lines.join('\n'));
  mint.emitClient(player, 'crp:chars', slots, session.characters.length);
  mint.emitClient(player, 'crp:lineup', JSON.stringify(await lineupOf(session.characters)));
  try {
    placeForSelect(player);
  } catch {
    // Камера уедет даже если сервер не примет позицию.
  }
}

export async function chooseCharacter(player: mint.Player, index: number): Promise<void> {
  const session = getSession(player);
  if (!session.account || session.character || !Number.isInteger(index) || index < 0 || index > 2) return;
  const slots = Math.max(1, Math.min(3, Number(session.account.slots) || 1));
  const character = session.characters[index];
  if (character) {
    cef(player, 'loader.show = false; characterInfo.show = false; selectMenu.show = false;');
    enterWorld(player, character);
    return;
  }
  if (index >= slots) {
    await openCharacters(player);
    return;
  }
  cef(
    player,
    'loader.show = false; characterInfo.show = false; selectMenu.menu = selectMenu.menus["characterCreateMainMenu"]; selectMenu.menus["characterCreateViewMenu"].items = cloneObj(selectMenu.menus["characterCreateViewMenu"].defaultItemsMale); selectMenu.show = true;',
  );
  mint.emitClient(player, 'crp:creator');
}

export async function buySlot(player: mint.Player): Promise<void> {
  const account = getSession(player).account;
  if (!account || getSession(player).character) return;
  const slots = Number(account.slots) || 1;
  if (slots >= 3) return openCharacters(player);
  const price = SLOT_PRICE[slots] ?? 1000;
  if ((Number(account.donate) || 0) < price) {
    await openCharacters(player, `Не хватает доната: нужно ${price}`);
    return;
  }
  account.donate = Number(account.donate) - price;
  account.slots = slots + 1;
  await account.save();
  await openCharacters(player);
}

function menuError(player: mint.Player, text: string): void {
  cef(player, `selectMenu.loader = false; selectMenu.notification = ${JSON.stringify(text)};`);
}

export async function submitCharacter(player: mint.Player, raw: string): Promise<void> {
  const session = getSession(player);
  const account = session.account;
  if (!account || session.character || session.creating) return;
  let data: Partial<CreatorInput>;
  try {
    data = JSON.parse(raw) as Partial<CreatorInput>;
  } catch {
    return menuError(player, 'Имя: Имя Фамилия, с заглавной');
  }
  const name = String(data.name ?? '').trim();
  if (!isCharacterName(name)) return menuError(player, 'Имя: Имя Фамилия, с заглавной, без цифр');
  const slots = Math.max(1, Math.min(3, Number(account.slots) || 1));
  const owned = await table('Character').findAll({ where: { accountId: account.id } });
  if (owned.length >= slots) return menuError(player, 'Свободных слотов нет');
  const exists = await table('Character').findOne({ where: { name } });
  if (exists) return menuError(player, 'Такое имя персонажа уже занято');

  session.creating = true;
  try {
    const character = await createCharacter(account.id, { ...data, name } as CreatorInput);
    cef(player, 'selectMenu.loader = false; selectMenu.show = false; characterInfo.show = false;');
    enterWorld(player, character);
  } finally {
    session.creating = false;
  }
}
