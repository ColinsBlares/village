import * as mint from 'mint-client';
import * as native from 'natives';
import { pushCef } from '../cef/view.js';

function report(hash: number): void {
  const local = mint.Player.local;
  const weapon = hash >>> 0;
  if (!local?.valid || !weapon) return;
  const ammo = native.getAmmoInPedWeapon(local.scriptID, weapon);
  pushCef(`inventory.setAmmo('${weapon.toString()}', ${ammo});`);
  mint.emitServer('crp:weapon:ammo', weapon, ammo);
}

export function installWeaponAmmo(): void {
  mint.on('playerWeaponShoot', (weaponHash) => report(Number(weaponHash)));
  mint.on('playerWeaponChange', (_oldWeapon, next) => report(Number(next)));
}
