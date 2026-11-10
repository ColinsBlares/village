import * as mint from 'mint-server';
import { allowMove } from '../anticheat/index.js';
import { getSession } from '../player/session.js';
import { cef } from '../ui/send.js';
import { removeCash } from '../world/money.js';

const PRICE = [250, 750, 200, 1500, 15000, 3500];
const FIELDS = ['carLicense', 'passengerLicense', 'bikeLicense', 'truckLicense', 'airLicense', 'boatLicense'];

const ENTER = { x: -129.16, y: -648.96, z: 40.69, toX: -140.92, toY: -616.5, toZ: 168.82, toH: 190.41 };
const EXIT = { x: -139.51, y: -613.89, z: 168.82, toX: -128.32, toY: -646.96, toZ: 40.5, toH: 329.23 };
const MENU = { x: -139.29, y: -632.27, z: 168.86 };

function answer(player: mint.Player, code: number): void {
  const text = code === 0 ? 'Лицензия уже есть' : code === 1 ? 'Лицензия куплена' : code === 2 ? 'Недостаточно денег' : 'Операция не прошла';
  const kind = code === 1 ? 'success' : 'error';
  cef(player, `selectMenu.loader = false; notifications.${kind}(${JSON.stringify(text)}, 'Лицензии');`);
}

export function installDmv(): void {
  new mint.PointBlip(545, ENTER.x, ENTER.y, ENTER.z, 36, 0.8, true, 0, 'Департамент лицензирования');
  const enter = new mint.ColshapeSphere(ENTER.x, ENTER.y, ENTER.z, 1.5, 0, true);
  enter.setMeta('dmv', 'enter');
  const exit = new mint.ColshapeSphere(EXIT.x, EXIT.y, EXIT.z, 1.5, 1, true);
  exit.setMeta('dmv', 'exit');
  const menu = new mint.ColshapeSphere(MENU.x, MENU.y, MENU.z, 1.2, 1, true);
  menu.setMeta('dmv', 'menu');
  mint.on('entityEnterColshape', (shape, entity) => {
    const kind = shape.getMeta('dmv');
    if (typeof kind !== 'string' || !(entity instanceof mint.Player) || !getSession(entity).character) return;
    if (kind === 'enter' && !entity.vehicle) {
      allowMove(entity);
      entity.dimension = 1;
      entity.pos = new mint.Vector3(ENTER.toX, ENTER.toY, ENTER.toZ);
      entity.rot = new mint.Vector3(0, 0, (ENTER.toH * Math.PI) / 180);
      return;
    }
    if (kind === 'exit') {
      allowMove(entity);
      entity.dimension = 0;
      entity.pos = new mint.Vector3(EXIT.toX, EXIT.toY, EXIT.toZ);
      entity.rot = new mint.Vector3(0, 0, (EXIT.toH * Math.PI) / 180);
      return;
    }
    const lines = PRICE.map((price, index) => `selectMenu.menus["dmvMenu"].items[${index}].values = ${JSON.stringify([`$${price}`])};`);
    cef(entity, [...lines, 'selectMenu.menu = selectMenu.menus["dmvMenu"]; selectMenu.show = true;'].join('\n'));
  });
  mint.on('entityLeaveColshape', (shape, entity) => {
    if (shape.getMeta('dmv') === 'menu' && entity instanceof mint.Player) cef(entity, 'selectMenu.show = false;');
  });
  mint.onClient('crp:dmv:buy', async (player, rawId) => {
    const id = Number(rawId);
    const field = FIELDS[id];
    const character = getSession(player).character;
    const price = PRICE[id];
    if (!character || !field || price == null) return;
    if (character[field]) return answer(player, 0);
    if (!(await removeCash(player, price))) return answer(player, 2);
    character[field] = true;
    await character.save();
    answer(player, 1);
  });
}
