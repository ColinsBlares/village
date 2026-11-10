import * as mint from 'mint-client';
import * as native from 'natives';

let active = false;
let animId = 0;

export function animatorOn(): boolean {
  return active;
}

function draw(text: string, y: number): void {
  native.setTextFont(4);
  native.setTextScale(0.6, 0.6);
  native.setTextColour(12, 144, 12, 230);
  native.setTextOutline();
  native.setTextCentre(true);
  native.beginTextCommandDisplayText('STRING');
  native.addTextComponentSubstringPlayerName(text);
  native.endTextCommandDisplayText(0.8, y, 0);
}

function play(id: number): void {
  animId = Math.max(0, id);
  mint.emitServer('crp:anim:id', animId);
}

export function installAnimator(): void {
  mint.onServer('crp:animator', () => {
    active = !active;
    if (active) play(animId);
    else mint.emitServer('crp:anim:stop');
  });
  mint.on('keyup', (key) => {
    if (!active) return;
    if (key === 37) play(animId - 1);
    if (key === 39) play(animId + 1);
    if (key === 38) play(animId - 100);
    if (key === 40) play(animId + 100);
  });
  mint.everyTick(() => {
    if (!active) return;
    draw('~y~left, right ~w~- листать анимации', 0.36);
    draw('~y~ up, down ~w~- листать на 100 анимаций', 0.4);
    draw(`ID: ~b~ ${animId}`, 0.44);
    draw('~y~ /animator ~w~- выход', 0.48);
  });
}
