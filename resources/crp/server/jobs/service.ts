import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { playAnimation, stopAnimation } from '../animations/index.js';
import { addJobExp, jobExp } from './index.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess, notifyWarning } from '../ui/notify.js';
import { addCash, removeCash } from '../world/money.js';
import { isRepair, markRepair, setVehiclePanel, vehicleById, vehicleState } from '../vehicles/index.js';

const here = new WeakMap<mint.Player, DbRow>();

export function bindService(player: mint.Player, service: DbRow | null): void {
  if (service) here.set(player, service);
  else here.delete(player);
}

const PRODUCTS = { DIAGNOSTICS: 5, BODY: 1, ENGINE: 12, FUEL: 8, STEERING: 11, BRAKE: 9 };
const PRODUCT_PRICE = 10;

interface Bill {
  mechanicId: number;
  vehicleId: number;
  price: number;
  products: number;
  serviceId: number;
  anim: number;
}

interface Offer {
  mechanicId: number;
  vehicleId: number;
  price: number;
  serviceId: number;
}

const offers = new WeakMap<mint.Player, Offer>();
const bills = new WeakMap<mint.Player, Bill>();
const active = new WeakMap<mint.Player, { service: DbRow; vehicleId: number }>();

function priceMultiplier(vehicle: mint.Vehicle): number {
  const price = vehicleState(vehicle)?.props.price ?? 0;
  if (price < 5000) return 1;
  if (price < 15000) return 1.5;
  if (price < 30000) return 3;
  if (price < 60000) return 7;
  if (price < 120000) return 12;
  if (price < 250000) return 25;
  if (price < 500000) return 60;
  if (price < 1000000) return 120;
  return 250;
}

async function bizOf(service: DbRow): Promise<DbRow | null> {
  return (await table('Biz').findOne({ where: { id: Number(service.bizId) || 0 } })) as DbRow | null;
}

function finish(mechanic: mint.Player | null, target: mint.Player | null, vehicle: mint.Vehicle | null): void {
  if (target) bills.delete(target);
  if (mechanic?.valid) {
    stopAnimation(mechanic);
    mint.emitClient(mechanic, 'crp:service:done');
  }
  if (vehicle?.valid) {
    markRepair(vehicle, false);
    setVehiclePanel(vehicle, 'hood', false);
  }
}

export function installServiceBill(): void {
  mint.onClient('crp:service:offer', async (player, rawId) => {
    const service = here.get(player);
    if (!service || Number(getSession(player).character?.job) !== 1) return notifyError(player, 'Вы не механик', 'Автомастерская');
    const vehicle = vehicleById(rawId);
    const driver = vehicle?.driver ?? null;
    if (!vehicle || !driver?.valid || driver.id === player.id) return notifyError(player, 'В т/с нет водителя', 'Автомастерская');
    if (isRepair(vehicle)) return notifyError(player, 'Транспорт уже ремонтируется', 'Ошибка');
    const biz = await bizOf(service);
    if (!biz || (Number(biz.productsCount) || 0) < PRODUCTS.DIAGNOSTICS) return notifyError(player, 'В мастерской недостаточно ресурсов', 'Ошибка');
    const price = Math.trunc(PRODUCTS.DIAGNOSTICS * PRODUCT_PRICE * (Number(service.priceMultiplier) || 1));
    offers.set(driver, { mechanicId: player.id, vehicleId: vehicle.id, price, serviceId: Number(service.id) });
    cef(driver, `offerDialog.show('carservice_diagnostics', ${JSON.stringify({ name: getSession(player).character?.name, price })});`);
    notifySuccess(player, 'Вы предложили диагностику', 'Автомастерская');
  });

  mint.onClient('crp:service:accept', async (player, accept) => {
    const offer = offers.get(player);
    offers.delete(player);
    const mechanic = offer ? mint.Player.getByID(offer.mechanicId) : null;
    if (!offer || Number(accept) !== 1) {
      if (mechanic?.valid) notifyInfo(mechanic, 'Диагностику отклонили', 'Автомастерская');
      return;
    }
    const vehicle = player.vehicle;
    const service = here.get(mechanic ?? player) ?? (await table('CarService').findOne({ where: { id: offer.serviceId } })) as DbRow | null;
    if (!vehicle || vehicle.id !== offer.vehicleId || !mechanic?.valid || !service) return;
    const biz = await bizOf(service);
    if (!biz || (Number(biz.productsCount) || 0) < PRODUCTS.DIAGNOSTICS) {
      notifyError(player, 'В мастерской недостаточно ресурсов', 'Ошибка');
      notifyError(mechanic, 'В мастерской недостаточно ресурсов', 'Ошибка');
      return;
    }
    if (!(await removeCash(player, offer.price))) {
      notifyError(player, 'Недостаточно денег', 'Автомастерская');
      notifyError(mechanic, 'У клиента нет денег', 'Автомастерская');
      return;
    }
    const salary = Math.trunc(offer.price * (Number(service.salaryMultiplier) || 0.1));
    biz.productsCount = (Number(biz.productsCount) || 0) - PRODUCTS.DIAGNOSTICS;
    biz.cashBox = (Number(biz.cashBox) || 0) + (offer.price - salary);
    await biz.save();
    await addCash(mechanic, salary);
    notifySuccess(mechanic, `К зарплате добавлено $${salary}`, 'Автомастерская');
    vehicle.engineOn = false;
    markRepair(vehicle, true);
    active.set(mechanic, { service, vehicleId: vehicle.id });
    mint.emitClient(mechanic, 'crp:service:go', vehicle.id);
  });

  mint.onClient('crp:service:begin', (player, animType) => {
    const job = active.get(player);
    const vehicle = job ? vehicleById(job.vehicleId) : null;
    const target = vehicle?.driver ?? null;
    if (!player.valid || Number(getSession(player).character?.job) !== 1 || !vehicle || !target) return;
    const anim = Math.max(0, Math.min(3, Math.trunc(Number(animType) || 0)));
    setVehiclePanel(vehicle, 'hood', true);
    notifySuccess(player, 'Вы начали диагностику', 'Автомастерская');
    const clips = [
      ['mini@repair', 'fixing_a_ped'],
      ['anim@amb@clubhouse@tutorial@bkr_tut_ig3@', 'machinic_loop_mechandplayer'],
      ['misscarsteal2fixer', 'confused_a'],
      ['mini@repair', 'fixing_a_player'],
    ];
    playAnimation(player, clips[anim][0], clips[anim][1], anim === 2 ? 1 : 49);
    const mechanicId = player.id;
    setTimeout(() => {
      const mechanic = mint.Player.getByID(mechanicId);
      if (!mechanic?.valid || !vehicle.valid || !target.valid) return finish(mechanic, target, vehicle);
      void showBill(mechanic, target, vehicle, anim);
    }, 12000);
  });

  mint.onClient('crp:service:bill', async (player, accept) => {
    const bill = bills.get(player);
    const mechanic = bill ? mint.Player.getByID(bill.mechanicId) : null;
    const vehicle = bill ? vehicleById(bill.vehicleId) : null;
    if (!bill || !mechanic?.valid || !vehicle?.valid) return finish(mechanic, player, vehicle);
    if (Number(accept) !== 1) {
      notifyWarning(mechanic, 'Клиент отказался от ремонта', 'Автомастерская');
      notifyWarning(player, 'Вы отказались от ремонта', 'Автомастерская');
      return finish(mechanic, player, vehicle);
    }
    const service = (await table('CarService').findOne({ where: { id: bill.serviceId } })) as DbRow | null;
    const biz = service ? await bizOf(service) : null;
    if (!service || !biz || (Number(biz.productsCount) || 0) < bill.products) {
      notifyError(player, 'В мастерской недостаточно ресурсов', 'Ошибка');
      notifyError(mechanic, 'В мастерской недостаточно ресурсов', 'Ошибка');
      return finish(mechanic, player, vehicle);
    }
    if (!(await removeCash(player, bill.price))) {
      notifyError(player, 'Недостаточно денег', 'Автомастерская');
      notifyError(mechanic, 'Клиент отказался', 'Автомастерская');
      return finish(mechanic, player, vehicle);
    }
    const salary = Math.trunc(bill.price * (Number(service.salaryMultiplier) || 0.1));
    const bonus = Number((jobExp(mechanic, 1) / 500).toFixed(2));
    biz.productsCount = (Number(biz.productsCount) || 0) - bill.products;
    biz.cashBox = (Number(biz.cashBox) || 0) + (bill.price - salary);
    await biz.save();
    const state = vehicleState(vehicle);
    if (state?.row) {
      state.row.engineState = 0;
      state.row.fuelState = 0;
      state.row.steeringState = 0;
      state.row.brakeState = 0;
      await state.row.save();
    }
    vehicle.repair();
    vehicle.bodyHealth = 1000;
    notifySuccess(player, `Вы заплатили $${bill.price}`, 'Автомастерская');
    notifySuccess(mechanic, 'Клиент оплатил ремонт', 'Автомастерская');
    await addCash(mechanic, Math.trunc(salary * (1 + bonus)));
    notifySuccess(mechanic, `К зарплате добавлено $${salary}`, 'Автомастерская');
    if (bonus) notifyInfo(mechanic, `Премия за навык механика составила ${bonus * 100}%`, 'Автомастерская');
    void addJobExp(mechanic, 0.05);
    const clips = [
      ['mini@repair', 'fixing_a_ped'],
      ['anim@amb@clubhouse@tutorial@bkr_tut_ig3@', 'machinic_loop_mechandplayer'],
      ['misscarsteal2fixer', 'confused_a'],
      ['mini@repair', 'fixing_a_player'],
    ];
    playAnimation(mechanic, clips[bill.anim][0], clips[bill.anim][1], bill.anim === 2 ? 1 : 49);
    bills.delete(player);
    setTimeout(() => {
      notifySuccess(mechanic, 'Ремонт окончен', 'Автомастерская');
      finish(mechanic, player, vehicle);
    }, 12000);
  });

  mint.on('playerDisconnect', (player) => {
    offers.delete(player);
    bills.delete(player);
  });
}

async function showBill(mechanic: mint.Player, target: mint.Player, vehicle: mint.Vehicle, anim: number): Promise<void> {
  const service = active.get(mechanic)?.service ?? here.get(mechanic);
  const state = vehicleState(vehicle);
  const row = state?.row;
  if (!service || !row) return finish(mechanic, target, vehicle);
  stopAnimation(mechanic);
  const wear = priceMultiplier(vehicle);
  const markup = Number(service.priceMultiplier) || 1;
  const lines: string[] = [];
  let price = 0;
  let products = 0;
  const part = (level: number, key: keyof typeof PRODUCTS, header1: string, header2: string) => {
    if (!level) return;
    const count = Math.trunc(PRODUCTS[key] * level * wear);
    const cost = Math.trunc(count * PRODUCT_PRICE * markup);
    price += cost;
    products += count;
    lines.push(`check.records.push(${JSON.stringify({ header: level === 1 ? header1 : header2, price: cost })});`);
  };
  if (vehicle.bodyHealth < 999) {
    const count = Math.trunc(PRODUCTS.BODY * wear);
    const cost = Math.trunc((1000 - vehicle.bodyHealth) * wear * markup);
    price += cost;
    products += count;
    lines.push(`check.records.push(${JSON.stringify({ header: 'Повреждения кузова', price: cost })});`);
  }
  part(Number(row.engineState) || 0, 'ENGINE', 'Неисправность системы охлаждения', 'Износ поршневых колец');
  part(Number(row.steeringState) || 0, 'STEERING', 'Неисправность рулевой тяги', 'Неисправность рулевой колонки');
  part(Number(row.fuelState) || 0, 'FUEL', 'Неисправность впускного коллектора', 'Неисправность воздушного фильтра');
  part(Number(row.brakeState) || 0, 'BRAKE', 'Неисправность тормозных цилиндров', 'Износ тормозных колодок');
  if (!lines.length) {
    notifySuccess(target, 'Т/с не нуждается в ремонте', 'Диагностика');
    finish(mechanic, target, vehicle);
    return;
  }
  bills.set(target, { mechanicId: mechanic.id, vehicleId: vehicle.id, price, products, serviceId: Number(service.id), anim });
  notifySuccess(mechanic, `Выставлен счет в $${price}`, 'Автомастерская');
  cef(target, `check.records = []; ${lines.join('')} check.show = true;`);
}
