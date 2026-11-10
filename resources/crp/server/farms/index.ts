import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess, notifyWarning } from '../ui/notify.js';
import { addCash, removeCash } from '../world/money.js';
import { signalQuest } from '../quests/index.js';
import { syncJobMenu } from '../jobs/index.js';
import { takePlant } from './crops.js';
import { attachWarehouses, fieldCount, forgetFarm, openFarmOffice, rememberFarm } from './warehouse.js';

const TAX = 50;
const JOBS = ['Работник', 'Фермер', 'Тракторист', 'Пилот'];
const farms: DbRow[] = [];
const PAYS = ['pay', 'farmerPay', 'tractorPay', 'pilotPay'] as const;
const here = new WeakMap<mint.Player, DbRow>();
const work = new WeakMap<mint.Player, { farm: DbRow; type: number; pay: number }>();

function characterId(player: mint.Player): number {
  return Number(getSession(player).character?.id) || 0;
}

export async function loadFarms(): Promise<number> {
  const rows = (await table('Farm').findAll()) as DbRow[];
  farms.splice(0, farms.length, ...rows);
  for (const farm of rows) {
    const shape = new mint.ColshapeSphere(Number(farm.x), Number(farm.y), Number(farm.z), 3, 0, true);
    setColshapeHandlers(shape, {
      onEnter: (player) => {
        here.set(player, farm);
        rememberFarm(player, farm);
        if (!player.vehicle) openFarmOffice(player, farm, fieldCount(Number(farm.id)));
        notifyInfo(player, farm.playerId ? `Ферма #${farm.id}` : `Ферма #${farm.id} продаётся`, 'Ферма');
      },
      onExit: (player) => {
        if (here.get(player)?.id === farm.id) {
          here.delete(player);
          forgetFarm(player, farm);
        }
      },
    });
    const blip = new mint.PointBlip(514, Number(farm.x), Number(farm.y), Number(farm.z), 2, 0.8, true, 0, `Ферма #${farm.id}`);
    void blip;
  }
  await attachWarehouses(rows, (player) => work.get(player));
  return rows.length;
}


export async function taxFarms(): Promise<void> {
  for (const farm of farms) {
    if (!farm.playerId) continue;
    farm.taxBalance = (Number(farm.taxBalance) || 0) - TAX;
    const owner = mint.Player.all.find((entry) => entry.valid && Number(getSession(entry).character?.id) === Number(farm.playerId));
    if ((Number(farm.taxBalance) || 0) <= 0) {
      farm.playerId = null;
      farm.owner = null;
      farm.balance = 0;
      if (owner) notifyWarning(owner, `Ферма #${farm.id} продана в штат за неуплату налогов`);
    } else if (Number(farm.taxBalance) < TAX * 24 && owner) {
      notifyWarning(owner, `Ферма #${farm.id} будет продана в штат менее, чем через сутки. Пополните баланс.`, 'Налог на ферму');
    }
    await farm.save();
  }
}

export function installFarms(): void {
  mint.onClient('crp:farm:buy', async (player) => {
    const header = 'Покупка фермы';
    const farm = here.get(player);
    const character = getSession(player).character;
    if (!farm || !character) return notifyError(player, 'Вы не у фермы', header);
    if (farm.playerId) return notifyError(player, 'Ферма уже имеет хозяина', header);
    const price = Number(farm.price) || 0;
    if (!(await removeCash(player, price))) return notifyError(player, `Необходимо $${price}`, header);
    farm.playerId = character.id;
    farm.balance = 0;
    farm.taxBalance = TAX * 24;
    await farm.save();
    notifySuccess(player, `Ферма #${farm.id} куплена`, header);
    notifyWarning(player, 'Пополните балансы фермы', header);
    cef(player, 'selectMenu.show = false;');
  });

  mint.onClient('crp:farm:sell', async (player) => {
    const header = 'Продажа фермы';
    const farm = here.get(player);
    const character = getSession(player).character;
    if (!farm || !character) return notifyError(player, 'Вы не у фермы', header);
    if (Number(farm.playerId) !== Number(character.id)) return notifyError(player, 'Вы не хозяин фермы', header);
    const price = Math.trunc(Number(farm.price) * 0.8 + (Number(farm.balance) || 0) + (Number(farm.taxBalance) || 0));
    farm.playerId = null;
    farm.balance = 0;
    farm.taxBalance = 0;
    await farm.save();
    await addCash(player, price);
    notifySuccess(player, 'Ферма продана в штат', header);
    cef(player, 'selectMenu.show = false;');
  });

  const farmOffers = new WeakMap<mint.Player, { sellerId: number; farmId: number; price: number }>();
  mint.onClient('crp:farm:player', (player, raw) => {
    const header = 'Продажа фермы';
    const farm = here.get(player);
    const character = getSession(player).character;
    let data: { playerId?: number; sum?: number };
    try {
      data = JSON.parse(String(raw ?? '{}')) as { playerId?: number; sum?: number };
    } catch {
      return notifyError(player, 'Некорректная сумма', header);
    }
    const buyer = mint.Player.getByID(Number(data.playerId));
    const sum = Math.trunc(Number(data.sum));
    if (!farm || !character) return notifyError(player, 'Вы не у фермы', header);
    if (Number(farm.playerId) !== Number(character.id)) return notifyError(player, 'Вы не хозяин фермы', header);
    if (!buyer?.valid || !getSession(buyer).character) return notifyError(player, `Игрок #${data.playerId} не найден`, header);
    if (buyer.id === player.id) return notifyError(player, 'Нельзя продать самому себе', header);
    if (player.pos.distanceTo(buyer.pos) > 10) return notifyError(player, 'Игрок далеко', header);
    if (!Number.isInteger(sum) || sum < 1 || sum > 1000000000) return notifyError(player, 'Некорректная сумма', header);
    farmOffers.set(buyer, { sellerId: player.id, farmId: Number(farm.id), price: sum });
    cef(buyer, `offerDialog.show('farm_sell', ${JSON.stringify({ name: character.name, farmId: farm.id, price: sum })});`);
    notifySuccess(player, `Предложение ${getSession(buyer).character?.name ?? buyer.name} отправлено`, header);
  });
  mint.onClient('crp:farm:player:accept', async (player) => {
    const header = 'Покупка фермы';
    const offer = farmOffers.get(player);
    farmOffers.delete(player);
    if (!offer) return notifyError(player, 'Предложение не найдено', header);
    const owner = mint.Player.getByID(offer.sellerId);
    const farm = owner?.valid ? here.get(owner) : undefined;
    if (!owner?.valid || !getSession(owner).character) return notifyError(player, 'Хозяин не найден', header);
    if (player.pos.distanceTo(owner.pos) > 10) return notifyError(player, `${getSession(owner).character?.name ?? owner.name} далеко`, header);
    if (!farm || Number(farm.id) !== offer.farmId) return notifyError(player, `${getSession(owner).character?.name ?? owner.name} не у фермы`, header);
    if (Number(farm.playerId) !== Number(getSession(owner).character?.id)) return notifyError(player, `${getSession(owner).character?.name ?? owner.name} не хозяин`, header);
    if (!(await removeCash(player, offer.price))) return notifyError(player, `Необходимо $${offer.price}`, header);
    if (!(await addCash(owner, offer.price))) {
      await addCash(player, offer.price);
      return notifyError(owner, 'Ошибка начисления наличных', header);
    }
    farm.playerId = getSession(player).character?.id;
    await farm.save();
    notifySuccess(owner, `Ферма #${farm.id} продана игроку ${getSession(player).character?.name ?? player.name}`, 'Продажа фермы');
    notifySuccess(player, `Ферма #${farm.id} куплена у игрока ${getSession(owner).character?.name ?? owner.name}`, header);
  });
  mint.onClient('crp:farm:player:cancel', (player) => {
    const offer = farmOffers.get(player);
    farmOffers.delete(player);
    if (!offer) return;
    const owner = mint.Player.getByID(offer.sellerId);
    notifyInfo(player, 'Предложение отклонено', 'Покупка фермы');
    if (owner?.valid) notifyInfo(owner, `${getSession(player).character?.name ?? player.name} отклонил предложение`, 'Продажа фермы');
  });

  mint.onClient('crp:farm:job', (player, raw) => {
    const header = 'Работа на ферме';
    const farm = here.get(player);
    const character = getSession(player).character;
    const index = Math.max(0, Math.min(3, Math.trunc(Number(raw) || 0)));
    if (!farm || !character) return notifyError(player, 'Вы не у фермы', header);
    if (work.has(player)) return notifyError(player, 'Увольтесь, чтобы сменить должность', header);
    if (character.factionId) return notifyError(player, 'Вы состоите в организации', header);
    if ((index === 1 || index === 2) && !character.carLicense) return notifyError(player, 'Необходимо водительское удостоверение', header);
    if (index === 3 && !character.airLicense) return notifyError(player, 'Необходима лицензия на воздушный транспорт', header);
    character.job = 5;
    void character.save();
    work.set(player, { farm, type: index, pay: 0 });
    notifySuccess(player, `Вы начали работу (${JOBS[index]})`, header);
    syncJobMenu(player);
    void signalQuest(player, 'job.changed');
  });

  mint.onClient('crp:farm:job:stop', async (player) => {
    const header = 'Завершение работы';
    const job = work.get(player);
    const character = getSession(player).character;
    if (!job || !character || Number(character.job) !== 5) return notifyError(player, 'Вы не работаете на ферме', header);
    work.delete(player);
    character.job = null;
    await character.save();
    if (job.pay > 0) {
      if (job.farm.playerId && (Number(job.farm.balance) || 0) < job.pay) notifyWarning(player, 'Баланс фермы не позволяет выплатить зарплату', header);
      else {
        if (job.farm.playerId) {
          job.farm.balance = (Number(job.farm.balance) || 0) - job.pay;
          await job.farm.save();
        }
        await addCash(player, job.pay);
      }
    }
    notifySuccess(player, 'Удачного дня!', header);
    syncJobMenu(player);
    void signalQuest(player, 'job.changed');
  });

  mint.onClient('crp:farm:price', async (player, raw) => {
    const farm = here.get(player);
    if (!farm || Number(farm.playerId) !== characterId(player)) return notifyError(player, 'Вы не хозяин фермы', 'Ферма');
    const price = Math.trunc(Number(raw));
    if (!Number.isInteger(price) || price < 0 || price > 100) return notifyError(player, 'Не более $100', 'Цена на зерно');
    farm.grainPrice = price;
    await farm.save();
    notifySuccess(player, `Цена $${price} установлена`, 'Цена на зерно');
  });

  mint.onClient('crp:farm:soil:price', async (player, raw) => {
    const farm = here.get(player);
    if (!farm || Number(farm.playerId) !== characterId(player)) return notifyError(player, 'Вы не хозяин фермы', 'Ферма');
    const price = Math.trunc(Number(raw));
    if (!Number.isInteger(price) || price < 0 || price > 100) return notifyError(player, 'Не более $100', 'Цена на удобрение');
    farm.soilPrice = price;
    await farm.save();
    notifySuccess(player, `Цена $${price} установлена`, 'Цена на удобрение');
  });

  mint.onClient('crp:job:use', (player) => {
    takePlant(player, true);
  });

  mint.onClient('crp:farm:crop', (player) => {
    takePlant(player, false);
  });


  mint.setInterval(() => {
    for (const player of mint.Player.all) {
      const job = work.get(player);
      const farm = here.get(player);
      if (!player.valid || !job || !farm || farm.id !== job.farm.id) continue;
      const wage = Number(farm[PAYS[job.type]]) || Number(farm.pay) || 0;
      job.pay += wage;
    }
  }, 60 * 1000);
}
