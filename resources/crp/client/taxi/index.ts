import * as mint from 'mint-client';
import * as native from 'natives';
import { showChatLine } from '../chat/index.js';
import { pushCef } from '../cef/view.js';
import { busyAdd, busyRemove } from '../ui/busy.js';

const PRICE = 100;
const CALL_GAP = 60000;
const WAIT = 5.5;

let lastCall = 0;
let noDriver: number | null = null;
let waiting: { x: number; y: number; z: number; marker: mint.Marker } | null = null;
let inTaxi = false;
let waypointOn = false;
let destination: { x: number; y: number; z: number } | null = null;
let toClient: { x: number; y: number; z: number; blip: mint.PointBlip; marker: mint.Marker } | null = null;
let toDest: { x: number; y: number; blip: mint.PointBlip } | null = null;
let sentArrive = false;
let sentReach = false;

function note(kind: 'success' | 'error' | 'info' | 'warning', text: string): void {
  pushCef(`notifications.${kind}(${JSON.stringify(text)}, 'Такси');`);
}

function place(x: number, y: number, z: number): { area: string; street: string } {
  const [, hash] = native.getStreetNameAtCoord(x, y, z);
  const street = native.getStreetNameFromHashKey(hash) || '';
  const zone = native.getNameOfZone(x, y, z);
  return { area: native.getFilenameForAudioConversation(zone) || zone || '', street };
}

function clearNoDriver(): void {
  if (noDriver !== null) mint.clearTimeout(noDriver);
  noDriver = null;
}

function clearWait(): void {
  waiting?.marker.destroy();
  waiting = null;
}

function clearClientRoute(): void {
  if (!toClient) return;
  toClient.blip.destroy();
  toClient.marker.destroy();
  toClient = null;
  sentArrive = false;
}

function clearDest(): void {
  toDest?.blip.destroy();
  toDest = null;
  sentReach = false;
}

function searchOrder(): void {
  const local = mint.Player.local;
  if (!local) return;
  if (local.vehicle) {
    note('error', 'Нельзя заказать такси из транспорта');
    pushCef(`mp.event.call('taxi.client.order.cancel', ${JSON.stringify('Нельзя заказать такси из транспорта')});`);
    return;
  }
  const left = CALL_GAP - (Date.now() - lastCall);
  if (lastCall && left > 0) {
    const text = `Ожидайте ${Math.trunc(left / 1000)} секунд`;
    note('error', text);
    pushCef(`mp.event.call('taxi.client.order.cancel', ${JSON.stringify(text)});`);
    return;
  }
  lastCall = Date.now();
  mint.emitServer('crp:taxi:order');
}

function confirmOrder(): void {
  inTaxi = false;
  mint.emitServer('crp:taxi:confirm', JSON.stringify(destination ?? {}));
}

function readWaypoint(): { x: number; y: number; z: number } | null {
  if (!native.isWaypointActive()) return null;
  const sprite = native.getWaypointBlipEnumId();
  let blip = native.getFirstBlipInfoId(sprite);
  for (let guard = 0; guard < 32 && native.doesBlipExist(blip); guard += 1) {
    if (native.getBlipInfoIdType(blip) === 4) {
      const coord = native.getBlipInfoIdCoord(blip);
      return { x: coord.x, y: coord.y, z: coord.z };
    }
    blip = native.getNextBlipInfoId(sprite);
  }
  return null;
}

export function handleTaxi(name: string, args: unknown[]): boolean {
  if (name === 'taxi.client.app.open') {
    const local = mint.Player.local;
    if (!local) return true;
    const here = place(local.pos.x, local.pos.y, local.pos.z);
    pushCef(`mp.event.call('taxi.client.location', ${JSON.stringify(here.area)}, ${JSON.stringify(here.street)});`);
    return true;
  }
  if (name === 'taxi.client.app.search' || (name === 'callRemote' && args[1] === 'taxi.client.order.send')) {
    searchOrder();
    return true;
  }
  if (name === 'taxi.client.app.confirm') {
    confirmOrder();
    return true;
  }
  if (name === 'taxi.client.app.cancel') {
    clearNoDriver();
    clearWait();
    inTaxi = false;
    mint.emitServer('crp:taxi:client:stop');
    return true;
  }
  if (name === 'taxi.driver.app.open') {
    mint.emitServer('crp:taxi:orders');
    return true;
  }
  if (name === 'taxi.driver.app.order.take' || (name === 'callRemote' && args[1] === 'taxi.driver.orders.take')) {
    const id = name === 'callRemote' ? Number(args[2]) : Number(args[1]);
    mint.emitServer('crp:taxi:take', id || 0);
    return true;
  }
  if (name === 'taxi.driver.app.order.cancel') {
    clearClientRoute();
    clearDest();
    mint.emitServer('crp:taxi:driver:stop');
    return true;
  }
  if (name === 'taxi.rent.close') {
    busyRemove('taxi_rent');
    return true;
  }
  if (name === 'taxi.jobmenu.close') {
    pushCef('selectMenu.show = false;');
    return true;
  }
  if (name === 'taxi.jobmenu.employment') {
    pushCef('selectMenu.show = false;');
    mint.emitServer('crp:taxi:job');
    return true;
  }
  if (name === 'callRemote' && args[1] === 'taxi.employment') {
    mint.emitServer('crp:taxi:job');
    return true;
  }
  if (name === 'callRemote' && args[1] === 'taxi.rent.accept') {
    mint.emitServer('crp:taxi:rent', args[2] === true || args[2] === 1 || args[2] === '1');
    return true;
  }
  return false;
}

export function installTaxi(): void {
  mint.onServer('crp:taxi:rent', (price) => {
    busyAdd('taxi_rent', true);
    pushCef(`acceptWindow.header = ${JSON.stringify(`Вы хотите арендовать такси за $${Number(price) || 50}?`)}; acceptWindow.name = 'taxi_rent'; acceptWindow.show = true;`);
  });

  mint.onServer('crp:taxi:client:code', (code) => {
    const value = Number(code);
    if (value === 0) {
      note('error', 'Нельзя заказать такси из транспорта');
      pushCef(`mp.event.call('taxi.client.order.cancel', ${JSON.stringify('Нельзя заказать такси из транспорта')});`);
      return;
    }
    if (value === 1) {
      note('error', 'Вы не на улице');
      pushCef(`mp.event.call('taxi.client.order.cancel', ${JSON.stringify('Вы не на улице')});`);
      return;
    }
    if (value === 2) {
      note('error', 'У вас недостаточно наличности');
      pushCef(`mp.event.call('taxi.client.order.cancel', ${JSON.stringify('У вас недостаточно наличности')});`);
      return;
    }
    if (value === 3) {
      note('error', 'Вы уже сделали заказ');
      pushCef(`mp.event.call('taxi.client.order.cancel', ${JSON.stringify('Вы уже сделали заказ')});`);
      return;
    }
    const local = mint.Player.local;
    if (!local) return;
    note('success', 'Заказ отправлен');
    note('warning', 'Не покидайте зону, выделенную зеленым');
    clearWait();
    const marker = new mint.Marker(
      mint.MarkerType.MarkerCylinder,
      new mint.Vector3(local.pos.x, local.pos.y, local.pos.z - 9.5),
      { r: 131, g: 255, b: 92, a: 180 },
    );
    marker.scale = new mint.Vector3(10, 10, 10);
    waiting = { x: local.pos.x, y: local.pos.y, z: local.pos.z, marker };
    clearNoDriver();
    noDriver = mint.setTimeout(() => {
      noDriver = null;
      note('error', 'К сожалению сейчас по данному тарифу нет таксистов');
      clearWait();
      pushCef(`mp.event.call('taxi.client.order.cancel', ${JSON.stringify('К сожалению сейчас по данному тарифу нет таксистов')});`);
      mint.emitServer('crp:taxi:client:stop', 'timeout');
    }, CALL_GAP);
  });

  mint.onServer('crp:taxi:client:taken', (raw) => {
    clearNoDriver();
    const info = JSON.parse(String(raw ?? '{}')) as { name?: string; model?: string; number?: string };
    pushCef(`mp.event.call('taxi.client.order.ans', ${JSON.stringify(info)});`);
    note('success', 'Ваш заказ принят');
  });

  mint.onServer('crp:taxi:client:ready', () => {
    clearWait();
    pushCef(`mp.event.call('taxi.client.order.ready');`);
    note('success', 'Машина на месте, садитесь в такси');
  });

  mint.onServer('crp:taxi:client:in', () => {
    inTaxi = true;
    waypointOn = native.isWaypointActive();
    pushCef(`mp.event.call('taxi.client.order.inTaxi');`);
    note('info', 'Поставьте метку на карте и подтвердите выбор в приложении');
    showChatLine('!{#f3c800}Чтобы начать поездку, откройте карту и поставьте метку на пункте назначения');
    showChatLine('!{#80c102}После этого нажмите !{#009eec}"Подтвердить" !{#80c102}в приложении на телефоне');
  });

  mint.onServer('crp:taxi:client:confirm', (code) => {
    if (Number(code) === 0) note('success', 'Данные переданы таксисту');
    else {
      pushCef(`mp.event.call('taxi.client.order.error', ${JSON.stringify('Недостаточно денег, выберите другое место')});`);
      note('error', 'Недостаточно денег, выберите другое место');
      inTaxi = true;
    }
  });

  mint.onServer('crp:taxi:client:done', () => {
    clearNoDriver();
    inTaxi = false;
    pushCef(`mp.event.call('taxi.client.order.cancel', ${JSON.stringify('Поездка завершена')});`);
  });

  mint.onServer('crp:taxi:client:leave', () => {
    clearNoDriver();
    clearWait();
    inTaxi = false;
    note('warning', 'Вы покинули такси, заказ отменен');
    pushCef(`mp.event.call('taxi.client.order.cancel', ${JSON.stringify('Вы покинули такси, заказ отменен')});`);
  });

  mint.onServer('crp:taxi:client:cancel', (reason) => {
    clearNoDriver();
    clearWait();
    inTaxi = false;
    const text = String(reason ?? '');
    if (text) note(text.includes('отменили') ? 'warning' : 'error', text);
    if (text) pushCef(`mp.event.call('taxi.client.order.cancel', ${JSON.stringify(text)});`);
  });

  mint.onServer('crp:taxi:driver:load', (raw) => {
    const rows = JSON.parse(String(raw ?? '[]')) as Array<{ orderId: number; position: { x: number; y: number; z: number } }>;
    const local = mint.Player.local;
    const list = rows.map((row) => ({
      id: row.orderId,
      distance: local ? (Math.hypot(local.pos.x - row.position.x, local.pos.y - row.position.y, local.pos.z - row.position.z) / 1000).toFixed(1) : '0.0',
    }));
    pushCef(`mp.event.call('taxi.driver.load', ${JSON.stringify({ name: local?.name ?? '', orders: list })});`);
  });

  mint.onServer('crp:taxi:driver:add', (raw) => {
    const order = JSON.parse(String(raw ?? '{}')) as { orderId: number; position: { x: number; y: number; z: number } };
    const local = mint.Player.local;
    if (!local || !order.position) return;
    note('info', 'Получен новый заказ');
    const distance = (Math.hypot(local.pos.x - order.position.x, local.pos.y - order.position.y, local.pos.z - order.position.z) / 1000).toFixed(1);
    pushCef(`mp.event.call('taxi.driver.order.add', ${JSON.stringify({ id: order.orderId, distance })});`);
  });

  mint.onServer('crp:taxi:driver:del', (orderId) => {
    pushCef(`mp.event.call('taxi.driver.order.delete', ${Number(orderId) || 0});`);
  });

  mint.onServer('crp:taxi:driver:ans', (code, raw) => {
    const value = Number(code);
    if (value === 0) {
      const order = JSON.parse(String(raw ?? '{}')) as { position?: { x: number; y: number; z: number } };
      const pos = order.position;
      if (!pos) return;
      note('success', 'Заказ принят, следуйте по маршруту');
      clearClientRoute();
      const blip = new mint.PointBlip(pos.x, pos.y, pos.z);
      blip.sprite = 1 as typeof blip.sprite;
      blip.color = 71;
      blip.name = 'Клиент';
      blip.route = true;
      const marker = new mint.Marker(mint.MarkerType.MarkerCylinder, new mint.Vector3(pos.x, pos.y, pos.z - 9), { r: 255, g: 234, b: 0, a: 180 });
      marker.scale = new mint.Vector3(10, 10, 10);
      toClient = { x: pos.x, y: pos.y, z: pos.z, blip, marker };
      native.setNewWaypoint(pos.x, pos.y);
      return;
    }
    const text = value === 1 ? 'Заказ уже взят'
      : value === 2 ? 'Вы не в рабочем т/с'
        : value === 3 ? 'Вы не таксист'
          : value === 4 ? 'У вас нет прав на легковой транспорт'
            : value === 5 ? 'Вы уже взяли заказ'
              : 'На этом транспорте работать нельзя';
    note('error', text);
    pushCef(`mp.event.call('taxi.driver.order.error');`);
  });

  mint.onServer('crp:taxi:driver:wait', () => {
    note('info', 'Ожидайте, пока клиент не поставит метку на карте');
  });

  mint.onServer('crp:taxi:driver:dest', (x, y, z, price) => {
    const px = Number(x);
    const py = Number(y);
    const pz = Number(z);
    clearDest();
    const blip = new mint.PointBlip(px, py, pz);
    blip.sprite = 1 as typeof blip.sprite;
    blip.color = 71;
    blip.name = 'Точка назначения';
    blip.route = true;
    toDest = { x: px, y: py, blip };
    native.setNewWaypoint(px, py);
    const here = place(px, py, pz);
    note('success', 'Клиент поставил метку, следуйте по маршруту');
    pushCef(`mp.event.call('taxi.driver.order.way', ${JSON.stringify(here.area)}, ${JSON.stringify(here.street)}, ${Number(price) || 0});`);
  });

  mint.onServer('crp:taxi:driver:done', () => {
    clearDest();
    pushCef(`mp.event.call('taxi.driver.order.cancel');`);
  });

  mint.onServer('crp:taxi:driver:clear', (reason) => {
    clearClientRoute();
    clearDest();
    pushCef(`mp.event.call('taxi.driver.order.cancel');`);
    if (typeof reason === 'string' && reason) note('warning', reason);
  });

  mint.onServer('crp:taxi:driver:canceled', () => {
    clearClientRoute();
    clearDest();
    note('error', 'Клиент отменил заказ');
    pushCef(`mp.event.call('taxi.driver.order.cancel');`);
  });

  mint.everyTick(() => {
    const local = mint.Player.local;
    if (!local) return;
    if (waiting) {
      const away = Math.hypot(local.pos.x - waiting.x, local.pos.y - waiting.y, local.pos.z - waiting.z);
      if (away > WAIT) {
        clearNoDriver();
        clearWait();
        note('warning', 'Вы покинули зону ожидания, заказ отменен');
        pushCef(`mp.event.call('taxi.client.order.cancel', ${JSON.stringify('Вы покинули зону ожидания, заказ отменен')});`);
        mint.emitServer('crp:taxi:client:stop', 'zone');
      }
    }
    if (inTaxi) {
      const active = native.isWaypointActive();
      if (active !== waypointOn) {
        waypointOn = active;
        const point = active ? readWaypoint() : null;
        if (point) {
          destination = point;
          const here = place(point.x, point.y, point.z);
          const meters = Math.hypot(local.pos.x - point.x, local.pos.y - point.y, local.pos.z - point.z);
          const fare = Math.max(PRICE, Math.round((meters / 1000) * PRICE));
          note('info', 'Метка поставлена, подтвердите заказ в приложении');
          pushCef(`mp.event.call('taxi.client.order.destination', ${JSON.stringify(here.area)}, ${JSON.stringify(here.street)}, ${fare});`);
        }
      }
    }
    if (toClient && !sentArrive) {
      const away = Math.hypot(local.pos.x - toClient.x, local.pos.y - toClient.y, local.pos.z - toClient.z);
      if (away <= 6) {
        sentArrive = true;
        clearClientRoute();
        note('success', 'Ожидайте клиента');
        mint.emitServer('crp:taxi:arrive');
      }
    }
    if (toDest && !sentReach) {
      const away = Math.hypot(local.pos.x - toDest.x, local.pos.y - toDest.y);
      if (away <= 50) {
        sentReach = true;
        clearDest();
        note('success', 'Вы доставили клиента');
        pushCef(`mp.event.call('taxi.driver.order.cancel');`);
        mint.emitServer('crp:taxi:reach');
      }
    }
  });
}
