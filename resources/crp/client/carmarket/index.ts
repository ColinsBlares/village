import * as mint from 'mint-client';
import * as native from 'natives';
import { focusUi, pushCef } from '../cef/view.js';

let buying = false;
let pending = false;

function hideMenus(): void {
  const id = mint.Player.local.vehicle?.scriptID ?? 0;
  if (id) native.freezeEntityPosition(id, false);
  pushCef('selectMenu.show = false; carSpecifications.show = false; selectMenu.loader = false;');
  focusUi(false);
  buying = false;
  pending = false;
}

export function handleMarket(name: string, args: unknown[]): boolean {
  if (name === 'carmarket.car.sell') {
    mint.emitServer('crp:carmarket:sell');
    hideMenus();
    return true;
  }
  if (name === 'carmarket.sellmenu.close') {
    hideMenus();
    return true;
  }
  if (name === 'carmarket.car.buy') {
    pending = true;
    pushCef(`selectMenu.show = false; mp.event.call('pay.choose', []);`);
    return true;
  }
  if (name === 'carmarket.buymenu.close') {
    hideMenus();
    return true;
  }
  if (name === 'pay.choose.ans' && pending) {
    pending = false;
    const method = Number(args[1]);
    if (method !== 0 && method !== 1) {
      pushCef('loader.show = false;');
      return true;
    }
    mint.emitServer('crp:carmarket:buy', method);
    hideMenus();
    return true;
  }
  return false;
}

export function installCarMarket(): void {
  mint.onServer('crp:carmarket:sell', () => {
    focusUi(true);
    pushCef(`selectMenu.menu = cloneObj(selectMenu.menus["carMarketSellMenu"]); selectMenu.show = true;`);
  });
  mint.onServer('crp:carmarket:buy', (raw) => {
    if (typeof raw !== 'string') return;
    const data = JSON.parse(raw) as { name: string; price: number; mileage: number; owners: number };
    buying = true;
    const id = mint.Player.local.vehicle?.scriptID ?? 0;
    if (id) native.freezeEntityPosition(id, true);
    focusUi(true);
    pushCef([
      `selectMenu.menu = cloneObj(selectMenu.menus["carMarketBuyMenu"]);`,
      `carSpecifications.body = { name: { header: 'Название', value: ${JSON.stringify(data.name)}, unit: '' }, owners: { header: 'Владельцев', value: ${JSON.stringify(String(data.owners))}, unit: '' }, mileage: { header: 'Пробег', value: ${JSON.stringify(String(Math.round(data.mileage)))}, unit: 'км' } };`,
      `carSpecifications.price = ${JSON.stringify(String(data.price))};`,
      'carSpecifications.show = true;',
      'selectMenu.show = true;',
    ].join('\n'));
  });
  mint.onServer('crp:carmarket:buy:close', () => {
    if (buying) hideMenus();
  });
}
