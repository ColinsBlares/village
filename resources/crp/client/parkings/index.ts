import * as mint from 'mint-client';
import { pushCef } from '../cef/view.js';

export function handleParking(name: string): boolean {
  if (name === 'parkings.vehicle.get') {
    mint.emitServer('crp:parking:get');
    return true;
  }
  if (name === 'parkings.menu.close') {
    pushCef('selectMenu.show = false;');
    return true;
  }
  return false;
}
