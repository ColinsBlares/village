import * as native from 'natives';

export function fadeOut(ms = 350): void {
  native.doScreenFadeOut(ms);
}

export function fadeIn(ms = 500): void {
  native.doScreenFadeIn(ms);
}
