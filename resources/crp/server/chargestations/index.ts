import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { setColshapeHandlers } from '../core/colshapes.js';
import { getSession, type DbRow } from '../player/session.js';
import { notifyError, notifySuccess, notifyWarning } from '../ui/notify.js';
import { removeCash } from '../world/money.js';
import { addFuel, vehicleState } from '../vehicles/index.js';

const here = new WeakMap<mint.Player, DbRow>();

export async function loadChargeStations(): Promise<number> {
  const rows = (await table('ChargeStation').findAll()) as DbRow[];
  for (const station of rows) {
    const shape = new mint.ColshapeSphere(Number(station.x), Number(station.y), Number(station.z), 4, 0, true);
    setColshapeHandlers(shape, {
      onEnter: (player) => {
        here.set(player, station);
        if (!player.vehicle) mint.emitClient(player, 'crp:prompt', 'Чтобы зарядить транспортное средство, вы должны находиться в нем');
      },
      onExit: (player) => {
        if (here.get(player)?.id !== station.id) return;
        here.delete(player);
        mint.emitClient(player, 'crp:prompt', '');
      },
    });
    const blip = new mint.PointBlip(354, Number(station.x), Number(station.y), Number(station.z), 5, 0.8, true, 0, String(station.name ?? 'Зарядка'));
    void blip;
  }
  return rows.length;
}

export function installChargeStations(): void {
  mint.onClient('crp:job:use', async (player) => {
    if (player.vehicle && here.has(player)) await charge(player);
  });

  mint.onClient('crp:charge', async (player) => {
    await charge(player);
  });
}

async function charge(player: mint.Player): Promise<void> {
    const station = here.get(player);
    const vehicle = player.vehicle;
    const state = vehicle ? vehicleState(vehicle) : undefined;
    if (!station) return notifyError(player, 'Вы не у зарядной станции', 'Зарядка');
    if (!vehicle || !state || (player.seat !== 1 && player.seat !== 0)) return notifyError(player, 'Вы не в транспорте', 'Зарядка');
    if (!state.props.isElectric) return notifyWarning(player, 'Можно зарядить только электромобиль', 'Зарядка');
    const need = Math.ceil(state.props.maxFuel - state.fuel);
    if (need <= 0) return notifyWarning(player, 'Автомобиль полностью заряжен', 'Зарядка');
    const total = need * (Number(station.chargePrice) || 3);
    if ((Number(getSession(player).character?.cash) || 0) < total) return notifyError(player, 'Недостаточно средств', 'Зарядка');
    if (!(await removeCash(player, total))) return notifyError(player, 'Ошибка финансовой операции', 'Зарядка');
    addFuel(vehicle, need);
    notifySuccess(player, `Автомобиль заряжен на ${need}% за $${total}`, 'Зарядка');
}
