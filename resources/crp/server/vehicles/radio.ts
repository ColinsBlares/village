import * as mint from 'mint-server';

function driving(player: mint.Player): boolean {
  return player.seat === 1 || player.seat === 0;
}

export function installVehicleRadio(): void {
  mint.onClient('crp:veh:radio', (player, raw) => {
    const vehicle = player.vehicle;
    if (!vehicle?.valid) return;
    const station = Number(raw) | 0;
    if (!Number.isInteger(station) || station < 0 || station > 255) return;
    const current = vehicle.getStreamSyncedMeta('crp:radio');
    if (!driving(player) && current != null) return;
    if (Number(current) === station) return;
    vehicle.setStreamSyncedMeta('crp:radio', station);
  });
}
