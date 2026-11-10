import * as mint from 'mint-client';
import * as native from 'natives';
import { focusUi, pushCef } from '../cef/view.js';

function paint(player: mint.Player, hidden: boolean): void {
  native.setEntityAlpha(player.scriptID, hidden ? 0 : 255, false);
}

export function installAdmin(): void {
  mint.onServer('crp:admin:slap', () => {
    const local = mint.Player.local;
    const id = local.vehicle?.scriptID ?? local.scriptID;
    native.setEntityVelocity(id, 0, 0, 10);
  });
  mint.onServer('crp:admin:stats', (raw) => {
    if (typeof raw !== 'string') return;
    const data = JSON.parse(raw) as Record<string, unknown>;
    const stats: Record<string, Record<string, string>> = {
      Основное: {
        Пол: data.gender ? 'женский' : 'мужской',
        Наличные: `$${data.cash ?? 0}`,
        'Банк. счет': `$${data.bank ?? 0}`,
        'Отыграно минут': `${data.minutes ?? 0}`,
        'Номер телефона': `${data.phone ?? 'нет'}`,
        Сытость: `${data.satiety ?? 0}`,
        Жажда: `${data.thirst ?? 0}`,
        Законопослушность: `${data.law ?? 0}`,
        Преступлений: `${data.crimes ?? 0}`,
        Розыск: `${data.wanted ?? 0}`,
      },
      Лицензии: {
        'Легковые т/с': data.carLicense ? 'есть' : 'нет',
        'Пассажирские т/с': data.passengerLicense ? 'есть' : 'нет',
        Мотоциклы: data.bikeLicense ? 'есть' : 'нет',
        'Грузовые т/с': data.truckLicense ? 'есть' : 'нет',
        'Воздушные т/с': data.airLicense ? 'есть' : 'нет',
        'Водные т/с': data.boatLicense ? 'есть' : 'нет',
        Оружие: data.gunLicenseDate ? `до ${data.gunLicenseDate}` : 'нет',
      },
      Наказания: {
        'Количество варнов': `${data.warnNumber ?? 0}`,
        'Дата окончания варна': data.warnDate ? String(data.warnDate) : 'нет',
        'Время ареста': `${data.arrestTime ?? 0}`,
        'Тип ареста': `${data.arrestType ?? 0}`,
      },
    };
    let content = '';
    for (const category of Object.keys(stats)) {
      content += `<h3>${category}</h3>`;
      for (const key of Object.keys(stats[category])) content += `${key}: <b>${stats[category][key]}</b><br>`;
    }
    pushCef([
      `modal.modals["admin_stats"].header = ${JSON.stringify(String(data.name ?? ''))};`,
      `modal.modals["admin_stats"].content = ${JSON.stringify(content)};`,
      `modal.showByName("admin_stats");`,
    ].join('\n'));
    focusUi(true);
  });
  mint.on('streamSyncedMetaChange', (target, key, value) => {
    if (key !== 'crp:vanished') return;
    const player = mint.Player.getByScriptID((target as { scriptID?: number }).scriptID ?? -1);
    if (player) paint(player, !!value);
  });
  mint.on('worldObjectStreamIn', (object) => {
    const player = mint.Player.getByScriptID(object.scriptID);
    if (player?.getStreamSyncedMeta('crp:vanished')) paint(player, true);
  });
  mint.everyTick(() => {
    if (!mint.Player.local.getStreamSyncedMeta('crp:vanished')) return;
    native.setTextFont(0);
    native.setTextScale(0.37, 0.37);
    native.setTextColour(252, 223, 3, 200);
    native.setTextOutline();
    native.beginTextCommandDisplayText('STRING');
    native.addTextComponentSubstringPlayerName('INVISIBILITY ON');
    native.endTextCommandDisplayText(0.93, 0.12, 0);
  });
}
