import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { pushSpouse } from '../player/menu.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess, notifyWarning } from '../ui/notify.js';
import { removeCash } from '../world/money.js';

const PRICE = 500;
const CHURCH = { x: -1680.3, y: -291.55, z: 50.88 };
const here = new WeakSet<mint.Player>();
const offers = new WeakMap<mint.Player, number>();

function nameOf(player: mint.Player): string {
  return String(getSession(player).character?.name ?? player.name);
}

function male(player: mint.Player): boolean {
  return Number(getSession(player).character?.gender) === 0;
}

async function spouseOf(characterId: number): Promise<DbRow | null> {
  const first = (await table('Spouse').findOne({ where: { characterA: characterId } })) as DbRow | null;
  if (first) return first;
  return (await table('Spouse').findOne({ where: { characterB: characterId } })) as DbRow | null;
}

function nearest(player: mint.Player): mint.Player | null {
  let best: mint.Player | null = null;
  let dist = 5;
  for (const other of mint.Player.all) {
    if (!other.valid || other.id === player.id) continue;
    const gap = player.pos.distanceTo(other.pos);
    if (gap < dist) {
      dist = gap;
      best = other;
    }
  }
  return best;
}

export async function syncSpouse(player: mint.Player): Promise<void> {
  const id = Number(getSession(player).character?.id) || 0;
  const row = id ? await spouseOf(id) : null;
  if (!row) {
    pushSpouse(player, null);
    return;
  }
  const otherId = Number(row.characterA) === id ? Number(row.characterB) : Number(row.characterA);
  const other = (await table('Character').findOne({ where: { id: otherId } })) as DbRow | null;
  pushSpouse(player, other ? { name: String(other.name ?? ''), gender: Number(other.gender) || 0 } : null);
}

export function installWedding(): void {
  const shape = new mint.ColshapeSphere(CHURCH.x, CHURCH.y, CHURCH.z, 1.5, 0, true);
  setColshapeHandlers(shape, {
    onEnter: (player) => {
      if (player.vehicle) return;
      here.add(player);
      cef(player, `selectMenu.showByName('wedding');`);
    },
    onExit: (player) => {
      here.delete(player);
      cef(player, 'selectMenu.show = false;');
    },
  });
  const blip = new mint.PointBlip(489, CHURCH.x, CHURCH.y, CHURCH.z, 49, 0.9, true, 0, 'Церковь');
  void blip;

  mint.onClient('crp:wedding:offer', async (player) => {
    const header = 'Свадьба';
    if (!here.has(player)) return notifyError(player, 'Вы не у церкви', header);
    if (await spouseOf(Number(getSession(player).character?.id))) return notifyError(player, 'Вы уже состоите в браке', header);
    const target = nearest(player);
    if (!target) return notifyError(player, 'Рядом никого нет', header);
    if (!male(player)) return notifyError(player, 'Предложение должен сделать мужчина', header);
    if (male(target)) return notifyError(player, `${nameOf(target)} не женщина`, header);
    if (await spouseOf(Number(getSession(target).character?.id))) return notifyError(player, `${nameOf(target)} уже состоит в браке`, header);
    if ((Number(getSession(player).character?.cash) || 0) < PRICE) return notifyError(player, `Необходимо $${PRICE}`, header);
    cef(player, `offerDialog.show('wedding_male', ${JSON.stringify({ name: nameOf(target), recId: target.id })});`);
  });

  mint.onClient('crp:wedding:add', async (player, rawId) => {
    const header = 'Свадьба';
    const target = mint.Player.getByID(Number(rawId));
    if (!here.has(player) || !target?.valid) return notifyError(player, 'Игрок не найден', header);
    if (player.pos.distanceTo(target.pos) > 5) return notifyError(player, `${nameOf(target)} далеко`, header);
    if (!male(player) || male(target)) return notifyError(player, 'Брак заключается между мужчиной и женщиной', header);
    if (await spouseOf(Number(getSession(player).character?.id)) || await spouseOf(Number(getSession(target).character?.id))) {
      return notifyError(player, 'Кто-то из вас уже в браке', header);
    }
    offers.set(target, player.id);
    cef(target, `offerDialog.show('wedding_female', ${JSON.stringify({ name: nameOf(player) })});`);
  });

  mint.onClient('crp:wedding:accept', async (player) => {
    const header = 'Свадьба';
    const fromId = offers.get(player);
    offers.delete(player);
    const husband = fromId != null ? mint.Player.getByID(fromId) : null;
    if (!here.has(player) || !husband?.valid) return notifyError(player, 'Предложение не найдено', header);
    if (player.pos.distanceTo(husband.pos) > 5) return notifyError(player, `${nameOf(husband)} далеко`, header);
    if (!(await removeCash(husband, PRICE))) return notifyError(husband, `Необходимо $${PRICE}`, header);
    await table('Spouse').create({
      characterA: getSession(husband).character?.id,
      characterB: getSession(player).character?.id,
    });
    const wife = getSession(player).character;
    const man = getSession(husband).character;
    pushSpouse(player, man ? { name: nameOf(husband), gender: Number(man.gender) || 0 } : null);
    pushSpouse(husband, wife ? { name: nameOf(player), gender: Number(wife.gender) || 0 } : null);
    notifySuccess(player, `${nameOf(husband)} теперь ваш муж`, header);
    notifySuccess(husband, `${nameOf(player)} теперь ваша жена`, header);
  });

  mint.onClient('crp:wedding:cancel', (player) => {
    const fromId = offers.get(player);
    if (fromId == null) return;
    offers.delete(player);
    const husband = mint.Player.getByID(fromId);
    if (husband?.valid) notifyWarning(husband, `${nameOf(player)} отклонила предложение`, 'Свадьба');
  });

  mint.onClient('crp:wedding:remove', async (player) => {
    const header = 'Свадьба';
    if (!here.has(player)) return notifyError(player, 'Вы не у церкви', header);
    const id = Number(getSession(player).character?.id) || 0;
    const row = await spouseOf(id);
    if (!row) return notifyError(player, 'Вы не состоите в браке', header);
    const otherId = Number(row.characterA) === id ? Number(row.characterB) : Number(row.characterA);
    if (typeof row.destroy === 'function') await row.destroy();
    const other = (await table('Character').findOne({ where: { id: otherId } })) as DbRow | null;
    const live = mint.Player.all.find((entry) => entry.valid && Number(getSession(entry).character?.id) === otherId);
    if (live) {
      notifyWarning(live, `${nameOf(player)} развёлся с вами`, header);
      pushSpouse(live, null);
    }
    pushSpouse(player, null);
    notifySuccess(player, `Вы развелись с ${other?.name ?? 'супругом'}`, header);
  });
}
