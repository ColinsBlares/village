import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { giveItem } from '../inventory/index.js';
import { factionInfo } from './index.js';
import { spendStock } from './warehouse.js';
import { takeFactionClothes } from './clothes/index.js';
import { getSession, type DbRow } from '../player/session.js';
import { notifyError, notifyInfo, notifySuccess } from '../ui/notify.js';

const ITEM_COST = 100;
const GUN_COST = 100;
const AMMO_COST = 1;
const ARMOUR_COST = 100;
const AMMO_ITEMS = [37, 38, 40, 39];
const POCKETS = '[3,3,3,3,3,3,3,3,10,5,3,5,10,3,3,3]';

const MENUS: Record<number, string> = {
  1: 'governmentStorage',
  2: 'lspdStorage',
  3: 'lssdStorage',
  4: 'fibStorage',
  5: 'hospitalStorage',
  6: 'armyStorage',
  7: 'newsStorage',
};

interface Gear {
  items: number[];
  itemStock: ('medicines' | 'ammo' | null)[];
  guns: number[];
  weapons: string[];
  armour: boolean;
}

const GEAR: Record<string, Gear> = {
  government: {
    items: [24, 28],
    itemStock: ['medicines', 'ammo'],
    guns: [19, 80, 87, 100, 93],
    weapons: ['weapon_stungun', 'weapon_heavypistol', 'weapon_assaultsmg', 'weapon_advancedrifle', 'weapon_bullpupshotgun'],
    armour: false,
  },
  police: {
    items: [28, 24],
    itemStock: ['ammo', 'medicines'],
    guns: [18, 17, 19, 20, 48, 21, 22],
    weapons: ['weapon_flashlight', 'weapon_nightstick', 'weapon_stungun', 'weapon_combatpistol', 'weapon_smg', 'weapon_pumpshotgun', 'weapon_carbinerifle'],
    armour: true,
  },
  fib: {
    items: [28, 24, 4],
    itemStock: ['ammo', 'medicines', 'ammo'],
    guns: [107, 99, 88, 46, 19, 91],
    weapons: ['weapon_heavysniper', 'weapon_carbinerifle_mk2', 'weapon_combatpdw', 'weapon_pistol50', 'weapon_stungun', 'weapon_pumpshotgun_mk2'],
    armour: true,
  },
  army: {
    items: [24, 28, 132],
    itemStock: ['medicines', 'ammo', null],
    guns: [17, 80, 48, 21, 22, 107],
    weapons: ['weapon_nightstick', 'weapon_heavypistol', 'weapon_smg', 'weapon_pumpshotgun', 'weapon_carbinerifle', 'weapon_heavysniper'],
    armour: true,
  },
  hospital: {
    items: [24, 27, 25, 26],
    itemStock: ['medicines', 'medicines', 'medicines', 'medicines'],
    guns: [],
    weapons: [],
    armour: false,
  },
  bands: {
    items: [],
    itemStock: [],
    guns: [41, 21, 44, 20, 47, 89, 52],
    weapons: ['weapon_bat', 'weapon_pumpshotgun', 'weapon_pistol', 'weapon_combatpistol', 'weapon_microsmg', 'weapon_machinepistol', 'weapon_compactrifle'],
    armour: false,
  },
  mafia: {
    items: [],
    itemStock: [],
    guns: [44, 46, 90, 48, 49, 96, 50, 22],
    weapons: ['weapon_pistol', 'weapon_pistol50', 'weapon_minismg', 'weapon_smg', 'weapon_sawnoffshotgun', 'weapon_dbshotgun', 'weapon_assaultrifle', 'weapon_carbinerifle'],
    armour: false,
  },
};

const here = new WeakMap<mint.Player, number>();
const gates = new Map<number, { itemId: number; rank: number }[]>();
const opened = new Map<number, boolean>();

function kindOf(id: number): string | null {
  if (id === 1) return 'government';
  if (id === 2 || id === 3) return 'police';
  if (id === 4) return 'fib';
  if (id === 5) return 'hospital';
  if (id === 6) return 'army';
  if (id === 7) return 'news';
  if (id >= 8 && id <= 11) return 'bands';
  if (id >= 12 && id <= 14) return 'mafia';
  return null;
}

function menuOf(id: number): string | null {
  if (id >= 8 && id <= 11) return 'bandStorage';
  if (id >= 12 && id <= 14) return 'mafiaStorage';
  return MENUS[id] ?? null;
}

function clamp(index: number, length: number): number {
  if (length < 1) return 0;
  return Math.max(0, Math.min(length - 1, Math.trunc(index) || 0));
}

function playerFaction(player: mint.Player): number {
  return Number(getSession(player).character?.factionId) || 0;
}

function rankNumber(factionId: number, rankId: number): number {
  return factionInfo(factionId)?.ranks.find((rank) => rank.id === rankId)?.rank ?? 0;
}

function rankTitle(factionId: number, rank: number): string {
  return factionInfo(factionId)?.ranks[rank - 1]?.name ?? String(rank);
}

function canToggle(player: mint.Player): boolean {
  const ranks = factionInfo(playerFaction(player))?.ranks ?? [];
  const top = ranks[ranks.length - 1];
  const mine = Number(getSession(player).character?.factionRank) || 0;
  return top != null && (mine === top.id || mine === top.id - 1);
}

async function itemName(itemId: number): Promise<string> {
  const row = (await table('InventoryItem').findOne({ where: { id: itemId } })) as DbRow | null;
  return String(row?.name ?? 'предмет');
}

async function owns(player: mint.Player, itemId: number): Promise<boolean> {
  const character = getSession(player).character;
  if (!character) return false;
  const row = await table('CharacterInventory').findOne({ where: { playerId: character.id, itemId } });
  return row != null;
}

function denied(player: mint.Player, kind: string): string | null {
  const factionId = playerFaction(player);
  const header = `Склад ${factionInfo(factionId)?.name ?? ''}`.trim();
  if (here.get(player) !== factionId) return 'Вы далеко';
  if (kindOf(factionId) !== kind) return 'Нет доступа';
  if ((kind === 'bands' || kind === 'mafia') && opened.get(factionId) !== true) return kind === 'bands' ? 'Склад банды закрыт' : 'Склад мафии закрыт';
  return header ? null : 'Нет доступа';
}

function gate(player: mint.Player, itemId: number): string | null {
  const factionId = playerFaction(player);
  const need = gates.get(factionId)?.find((row) => row.itemId === itemId);
  const mine = rankNumber(factionId, Number(getSession(player).character?.factionRank) || 0);
  if (need && need.rank > mine) return `Доступно с ранга ${rankTitle(factionId, need.rank)}`;
  return null;
}

async function giveGear(player: mint.Player, itemId: number, params: Record<string, unknown>, stock: 'ammo' | 'medicines' | null, cost: number, success: string): Promise<void> {
  const factionId = playerFaction(player);
  const header = `Склад ${factionInfo(factionId)?.name ?? ''}`;
  const blocked = gate(player, itemId);
  if (blocked) return notifyError(player, blocked, header);
  if (stock && cost > 0 && !(await spendStock(factionId, stock, cost))) {
    return notifyError(player, stock === 'medicines' ? 'Недостаточно медикаментов' : 'Недостаточно боеприпасов', header);
  }
  const given = await giveItem(player, itemId, params);
  if (!given) {
    if (stock && cost > 0) await spendStock(factionId, stock, -cost);
    return notifyError(player, 'Нет места', header);
  }
  notifySuccess(player, success, header);
}

export function installStorage(): void {
  mint.onClient('crp:faction:storage', async (player, eventName, raw) => {
    const event = String(eventName ?? '');
    const [group, , action, sub] = event.split('.');
    const kind = group === 'hospital' ? 'hospital' : group;
    const gear = GEAR[kind];
    if (!gear) return;
    const reason = denied(player, kind);
    const factionId = playerFaction(player);
    const header = `Склад ${factionInfo(factionId)?.name ?? ''}`;
    if (reason) return notifyError(player, reason, header);
    if (action === 'state') {
      if (kind !== 'bands' && kind !== 'mafia') return;
      if (!canToggle(player)) return notifyError(player, 'Нет доступа', header);
      const open = raw === true || raw === 1 || raw === 'true';
      if (opened.get(factionId) === open) return notifyError(player, open ? 'Склад уже открыт' : 'Склад уже закрыт', header);
      opened.set(factionId, open);
      const text = `${getSession(player).character?.name ?? player.name} ${open ? 'открыл' : 'закрыл'} склад ${kind === 'bands' ? 'банды' : 'мафии'}`;
      for (const rec of mint.Player.all) {
        if (playerFaction(rec) === factionId) notifyInfo(rec, text, header);
      }
      return;
    }
    if (action === 'clothes' && sub === 'take') {
      await takeFactionClothes(player, kind, clamp(Number(raw), 32));
      return;
    }
    if (action === 'armour' && sub === 'take') {
      if (!gear.armour) return;
      const gender = Number(getSession(player).character?.gender) ? 0 : 1;
      await giveGear(player, 3, { variation: 12, texture: 1, health: 100, pockets: POCKETS, sex: gender }, 'ammo', ARMOUR_COST, 'Выдан бронежилет');
      return;
    }
    if (action === 'items' && sub === 'take') {
      const index = clamp(Number(raw), gear.items.length);
      const itemId = gear.items[index];
      const stock = gear.itemStock[index] ?? null;
      if (!itemId) return;
      const params: Record<string, unknown> = {};
      if (itemId === 24) params.count = 2;
      if (itemId === 27 || itemId === 25) params.count = 5;
      if (itemId === 26) params.count = 3;
      if (kind === 'army' && index === 2) {
        params.satiety = 100;
        params.thirst = 100;
      }
      const cost = kind === 'hospital' ? ITEM_COST : ITEM_COST;
      await giveGear(player, itemId, params, stock, stock ? cost : 0, `Вам выданы ${await itemName(itemId)}`);
      return;
    }
    if (action === 'guns' && sub === 'take') {
      const index = clamp(Number(raw), gear.guns.length);
      const itemId = gear.guns[index];
      const weapon = gear.weapons[index];
      if (!itemId || !weapon) return;
      if (await owns(player, itemId)) return notifyError(player, `Вы уже имеете ${await itemName(itemId)}`, header);
      const params: Record<string, unknown> = { weaponHash: mint.hash(weapon) };
      if (!(kind === 'police' && index === 2)) params.ammo = 0;
      await giveGear(player, itemId, params, 'ammo', GUN_COST, `Вам выдано оружие ${await itemName(itemId)}`);
      return;
    }
    if (action === 'ammo' && sub === 'take') {
      let index = 0;
      let count = 0;
      try {
        const parsed = JSON.parse(String(raw ?? '[]')) as unknown[];
        index = clamp(Number(parsed[0]), AMMO_ITEMS.length);
        count = Math.trunc(Number(parsed[1])) || 0;
      } catch {
        return;
      }
      if (count < 1) return;
      const itemId = AMMO_ITEMS[index];
      await giveGear(player, itemId, { count }, 'ammo', AMMO_COST * count, `Вам выданы ${await itemName(itemId)} (${count} ед.)`);
    }
  });
}

export async function loadStorage(): Promise<number> {
  const ranks = (await table('FactionItemRank').findAll()) as DbRow[];
  gates.clear();
  for (const row of ranks) {
    const factionId = Number(row.factionId);
    const list = gates.get(factionId) ?? [];
    list.push({ itemId: Number(row.itemId), rank: Number(row.rank) || 0 });
    gates.set(factionId, list);
  }
  const rows = (await table('Faction').findAll()) as DbRow[];
  let count = 0;
  for (const row of rows) {
    const id = Number(row.id);
    if (!menuOf(id) || !(Number(row.sX) || Number(row.sY))) continue;
    const x = Number(row.sX);
    const y = Number(row.sY);
    const z = Number(row.sZ) - 1;
    const dimension = Number(row.sD) || 0;
    new mint.Marker(mint.MarkerType.MarkerCylinder, x, y, z, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 70, 0, 187, 255, dimension);
    const shape = new mint.ColshapeSphere(x, y, z, 1.5, dimension, true);
    setColshapeHandlers(shape, {
      onEnter: (player) => {
        if (player.vehicle) return;
        const mine = playerFaction(player);
        if (mine !== id) return notifyError(player, 'Отказано в доступе', String(row.name ?? ''));
        here.set(player, id);
        const menu = menuOf(id);
        if (menu) player.emit('crp:faction:menu', menu);
      },
      onExit: (player) => {
        if (here.get(player) === id) here.delete(player);
        player.emit('crp:faction:menu', '');
      },
    });
    count += 1;
  }
  mint.log(`crp: склады выдачи ${count}`);
  return count;
}
