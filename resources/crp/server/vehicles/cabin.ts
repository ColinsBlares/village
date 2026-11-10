import * as mint from 'mint-server';
import { getSession } from '../player/session.js';
import { notifyError, notifySuccess, notifyWarning } from '../ui/notify.js';

function driver(player: mint.Player): boolean {
  return !!player.vehicle && (player.seat === 1 || player.seat === 0);
}

export function installVehicleCabin(): void {
  mint.onClient('crp:veh:eject:list', (player) => {
    const vehicle = player.vehicle;
    if (!driver(player) || !vehicle) return;
    const list: { id: number; name: string }[] = [];
    for (const [seat, occupant] of Object.entries(vehicle.passengers)) {
      if (!occupant?.valid || occupant.id === player.id || Number(seat) === 1) continue;
      list.push({ id: occupant.id, name: String(getSession(occupant).character?.name ?? occupant.name) });
    }
    if (!list.length) return notifyError(player, 'В т/с нет пассажиров', 'Транспорт');
    mint.emitClient(player, 'crp:eject:list', JSON.stringify(list));
  });

  mint.onClient('crp:veh:eject', (player, raw) => {
    const vehicle = player.vehicle;
    if (!driver(player) || !vehicle) return;
    const data = JSON.parse(String(raw ?? '{}')) as { id?: number; name?: string };
    const target = mint.Player.getByID(Number(data.id));
    if (!target?.valid || target.vehicle !== vehicle) return;
    if (String(getSession(target).character?.name ?? target.name) !== String(data.name ?? '')) return;
    target.pos = new mint.Vector3(vehicle.pos.x + 2, vehicle.pos.y, vehicle.pos.z);
    mint.emitClient(target, 'crp:veh:leave');
    notifyWarning(target, 'Вас вытолкнули из т/с', 'Транспорт');
    notifySuccess(player, 'Вы вытолкнули пассажира', 'Транспорт');
  });

  mint.onClient('crp:veh:siren', (player, rawId) => {
    const vehicle = player.vehicle;
    if (!vehicle || vehicle.id !== Number(rawId)) return;
    vehicle.setStreamSyncedMeta('sirenSound', vehicle.getStreamSyncedMeta('sirenSound') !== true);
  });
}
