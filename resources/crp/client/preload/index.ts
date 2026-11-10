import * as native from 'natives';

/** Тот же текст, что Rage рисует, пока мод ещё не пустил игрока. */
export function drawLoading(): void {
  native.setTextFont(4);
  native.setTextScale(0.55, 0.55);
  native.setTextColour(255, 255, 255, 230);
  native.setTextCentre(true);
  native.setTextOutline();
  native.beginTextCommandDisplayText('STRING');
  native.addTextComponentSubstringPlayerName('Идёт загрузка мода');
  native.endTextCommandDisplayText(0.5, 0.45, 0);
}
