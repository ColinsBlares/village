import * as mint from 'mint-server';
import { setColshapeHandlers } from '../core/colshapes.js';
import { assignJob, clearJob } from '../jobs/index.js';
import { getSession } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifySuccess } from '../ui/notify.js';
import { vehicleState } from '../vehicles/index.js';
import { removeCash } from '../world/money.js';

const RENT = 50;
const rented = new Map<number, number>();

export function installBus(): void {
  new mint.PointBlip(513, 435.45, -646.33, 28.74, 4, 0.8, true, 0, 'Автобусная станция');
  const shape = new mint.ColshapeSphere(435.91, -646.0, 28.55, 1.2, 0, true);
  setColshapeHandlers(shape, {
    onEnter: (player) => {
      const hired = Number(getSession(player).character?.job) === 3;
      const text = hired ? 'Уволиться с работы' : 'Устроиться на работу';
      cef(player, `selectMenu.menu = selectMenu.menus["busJobMenu"]; selectMenu.menu.items[0].text = ${JSON.stringify(text)}; selectMenu.show = true;`);
    },
    onExit: (player) => cef(player, 'selectMenu.show = false;'),
  });

  mint.onClient('crp:bus:job', (player) => {
    const character = getSession(player).character;
    if (!character) return;
    if (Number(character.job) === 3) {
      clearJob(player, 'Автобусная станция');
      return;
    }
    if (!character.passengerLicense) {
      notifyError(player, 'У вас нет прав на пассажирский транспорт', 'Автобусная станция');
      return;
    }
    assignJob(player, 3, 'Автобусная станция');
  });

  mint.on('playerEnteredVehicle', (player, vehicle) => {
    const state = vehicleState(vehicle);
    if (!state || state.key !== 'job' || state.owner !== 3) return;
    if (player.seat !== 1 && player.seat !== 0) return;
    const holder = rented.get(vehicle.id);
    if (holder === player.id) return;
    if (holder) {
      notifyError(player, 'Транспорт уже арендован', 'Автобус');
      return;
    }
    cef(player, `acceptWindow.header = 'Вы хотите арендовать автобус за $${RENT}?'; acceptWindow.name = 'bus_rent'; acceptWindow.show = true;`);
  });

  mint.onClient('crp:bus:rent', async (player, accept) => {
    const vehicle = player.vehicle;
    const state = vehicle ? vehicleState(vehicle) : undefined;
    cef(player, 'acceptWindow.show = false;');
    if (!accept || !vehicle || !state || state.key !== 'job' || state.owner !== 3) return;
    if ((Number(getSession(player).character?.cash) || 0) < RENT) {
      notifyError(player, 'Недостаточно наличных', 'Автобус');
      return;
    }
    const paid = await removeCash(player, RENT);
    if (!paid) return;
    rented.set(vehicle.id, player.id);
    notifySuccess(player, 'Автобус арендован', 'Автобус');
  });
}
