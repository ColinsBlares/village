import * as mint from 'mint-client';
import * as native from 'natives';
import { noteLogin, clearRemember } from '../auth/remember.js';
import { closeChat, setChatOpacity } from '../chat/index.js';
import { setNametags } from '../nametags/index.js';
import { setOwnAnim } from '../animations/index.js';
import { closeMusicPanel, musicVolume } from '../vehicles/music.js';
import { setZoneVisible } from '../bands/zones.js';
import { touchAfk } from '../afk/index.js';
import { releaseUi } from '../ui/release.js';
import { busyForget, busyHas, busyNote, busyRemove } from '../ui/busy.js';
import { fadeOut } from '../fade/index.js';
import { showSelectCam } from '../camera/index.js';
import { applySetter, currentDraft } from './draft.js';
import { focusUi, pushCef } from './view.js';
import { closeWheel } from '../casino/wheel.js';
import { selectHorse } from '../casino/horses.js';
import { handleVehicleMenu } from '../factions/index.js';
import { handleCarshow } from '../carshow/index.js';
import { handleMarket } from '../carmarket/index.js';
import { handleParking } from '../parkings/index.js';
import { handleShop } from '../places/index.js';
import { pinLocal } from '../attaches/index.js';
import { handleFuel } from '../shops/index.js';
import { handleFishing } from '../activities/index.js';
import { handleServiceJob } from '../jobs/service.js';
import { handleTuning } from '../tuning/index.js';
import { groundPutPos } from '../inventory/ground.js';
import { offerTradeFromMenu } from '../trade/index.js';
import { acceptMoneyGive, closeMoneyGive, showMoneyGive } from '../interaction/money.js';
import {
  chooseCarPass,
  closeDocuments,
  openDocumentsList,
  offerDocument,
  showDocumentTo,
} from '../documents/index.js';
import { handleBatchRemote } from './batch.js';
import { startTabletSearch } from '../mapcase/search.js';
import { handleInteractionBridge } from '../interaction/bridge.js';
import { handleInteractionClick } from '../interaction/menu.js';
import { handleVehicleCabin } from '../vehicles/cabin.js';
import { handleOwnVehicles } from '../vehicles/own.js';
import { handleTaxi } from '../taxi/index.js';

let slot = 0;
let slotMax = 2;
let choosing = false;

export function currentSlot(): number {
  return slot;
}

export function resetSlots(slots: number, count: number): void {
  slot = 0;
  slotMax = Math.min(2, Math.max(slots, count));
}

export function handleMp(raw: string): void {
  let args: unknown[];
  try {
    args = JSON.parse(raw) as unknown[];
  } catch {
    return;
  }
  const name = String(args[0] ?? '');
  if (handleVehicleMenu(name)) return;
  if (handleVehicleCabin(name, args)) return;
  if (handleInteractionBridge(name, args)) return;
  if (handleBatchRemote(name, args)) return;
  if (name === 'biz.faction.order.add') {
    mint.emitServer('crp:biz:order', JSON.stringify({
      id: Number(args[1]) || 0,
      count: Number(args[2]) || 0,
      price: Number(args[3]) || 0,
      faction: true,
    }));
    return;
  }
  if (name === 'biz.faction.order.cancel') {
    mint.emitServer('crp:biz:order:cancel', Number(args[1]) || 0);
    return;
  }
  if (name === 'mapCase.pd.search.start' || name === 'mapCase.fib.search.start') {
    startTabletSearch(Number(args[1]) || 0);
    return;
  }
  if (handleParking(name)) return;
  if (handleOwnVehicles(name, args)) return;
  if (handleCarshow(name, args)) return;
  if (handleTuning(name, args)) return;
  if (handleMarket(name, args)) return;
  if (handleShop(name, args)) return;
  if (handleFuel(name, args)) return;
  if (handleFishing(name)) return;
  if (handleServiceJob(name)) return;
  if (name === 'auth.login' && typeof args[1] === 'string') {
    noteLogin(args[1]);
    mint.emitServer('crp:auth:login', args[1]);
    return;
  }
  if (name === 'auth.remember.clear') {
    clearRemember();
    return;
  }
  if (name === 'auth.register' && typeof args[1] === 'string') {
    mint.emitServer('crp:auth:register', args[1]);
    return;
  }
  if (name === 'callRemote' && args[1] === 'auth.email.confirm') {
    if (args[2] === 0 || args[2] === false) mint.emitServer('crp:auth:continue');
    else mint.emitServer('crp:auth:email');
    return;
  }
  if (name === 'callRemote' && args[1] === 'auth.email.confirm.code') {
    mint.emitServer('crp:auth:email:code', String(args[2] ?? ''));
    return;
  }
  if (name === 'callRemote' && args[1] === 'auth.recovery') {
    mint.emitServer('crp:auth:recovery', String(args[2] ?? ''));
    return;
  }
  if (name === 'callRemote' && args[1] === 'auth.recovery.confirm') {
    mint.emitServer('crp:auth:recovery:code', String(args[2] ?? ''));
    return;
  }
  if (name === 'callRemote' && args[1] === 'auth.recovery.password') {
    mint.emitServer('crp:auth:recovery:password', String(args[2] ?? ''));
    return;
  }
  if (name === 'characterInit.chooseLeft') {
    slot = Math.max(0, slot - 1);
    pushCef(`characterInfo.i = ${slot};`);
    showSelectCam(slot);
    return;
  }
  if (name === 'characterInit.chooseRight') {
    slot = Math.min(slotMax, slot + 1);
    pushCef(`characterInfo.i = ${slot};`);
    showSelectCam(slot);
    return;
  }
  if (name === 'characterInit.choose') {
    if (choosing) return;
    choosing = true;
    fadeOut(350);
    mint.setTimeout(() => {
      choosing = false;
      mint.emitServer('crp:char:choose', slot);
    }, 400);
    return;
  }
  if (name === 'chat.message.get') {
    touchAfk();
    closeChat();
    const tag = typeof args[1] === 'number' ? args[1] : 0;
    const text = typeof args[2] === 'string' ? args[2] : '';
    mint.emitServer('crp:chat:send', tag, text);
    return;
  }
  if (name === 'chat.close') {
    closeChat();
    return;
  }
  if (name === 'ui.escape') {
    releaseUi();
    return;
  }
  if (name === 'busy.add') {
    busyNote(String(args[1] ?? ''), args[2] !== false);
    return;
  }
  if (name === 'busy.remove') {
    busyForget(String(args[1] ?? ''));
    return;
  }
  if (name === 'chat.opacity.set') {
    setChatOpacity(Number(args[1]) || 0);
    return;
  }
  if (name === 'radar.display') {
    native.displayRadar(args[1] !== false);
    if (args[1] === false) focusUi(true);
    else if (!busyHas()) focusUi(false);
    return;
  }
  if (name === 'nametags.show') {
    setNametags(args[1] !== false && args[1] !== 0);
    return;
  }
  if (name === 'bands.bandZones.show' || name === 'mafia.mafiaZones.show') {
    setZoneVisible(args[1] !== false && args[1] !== 0);
    return;
  }
  if (name === 'blur') {
    const time = Number(args[2]) || 300;
    if (args[1]) native.triggerScreenblurFadeIn(time);
    else native.triggerScreenblurFadeOut(time);
    return;
  }
  if (name === 'house.enter' || (name === 'callRemote' && args[1] === 'house.enter')) {
    const place = name === 'house.enter' ? args[1] : args[2];
    mint.emitServer('crp:house:enter', Number(place) || 0);
    return;
  }
  if (name === 'house.buy' || (name === 'callRemote' && args[1] === 'house.buy')) {
    const method = name === 'house.buy' ? args[1] : args[2];
    mint.emitServer('crp:house:buy', Number(method) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'vehicles.own.list.show') {
    mint.emitServer('crp:veh:own:list');
    return;
  }
  if (name === 'vehicles.lock') {
    const vehicle = mint.Player.local.vehicle;
    if (vehicle?.valid) mint.emitServer('crp:veh:lock', vehicle.remoteID);
    return;
  }
  if (name === 'callRemote' && args[1] === 'interaction.money.give') {
    mint.emitServer('crp:interact:money', Number(args[2]) || 0, Number(args[3]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'weather.action') {
    mint.emitServer('crp:weather:action', typeof args[2] === 'string' ? args[2] : JSON.stringify(args[2] ?? {}));
    return;
  }
  if (name === 'weatherPanel.close') {
    busyRemove('weatherPanel');
    mint.emitServer('crp:weather:action', JSON.stringify({ action: 'close' }));
    return;
  }
  if (name === 'callRemote' && args[1] === 'vehicles.engine.toggle') {
    mint.emitServer('crp:veh:engine');
    return;
  }
  if (name === 'callRemote' && args[1] === 'vehicles.lock') {
    mint.emitServer('crp:veh:lock', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'vehicles.hood') {
    mint.emitServer('crp:veh:hood', Number(args[2]) || 0, args[3] === true);
    return;
  }
  if (name === 'callRemote' && args[1] === 'vehicles.trunk') {
    mint.emitServer('crp:veh:trunk', Number(args[2]) || 0, args[3] === true);
    return;
  }
  if (name === 'callRemote' && args[1] === 'vehicles.window.roll') {
    mint.emitServer('crp:veh:window', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'jobs.set') {
    mint.emitServer('crp:job:set', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'jobs.leave') {
    mint.emitServer('crp:job:leave');
    return;
  }
  if (name === 'callRemote' && args[1] === 'supermarket.products.buy') {
    mint.emitServer('crp:market:buy', Number(args[2]) || 0, Number(args[3]) || 0);
    return;
  }
  if (name === 'supermarket.phone.buy' || (name === 'callRemote' && args[1] === 'supermarket.phone.buy')) {
    const method = name === 'callRemote' ? Number(args[2]) || 0 : 0;
    mint.emitServer('crp:market:phone', method);
    return;
  }
  if (name === 'supermarket.number.change' || (name === 'callRemote' && args[1] === 'supermarket.number.change')) {
    const number = name === 'supermarket.number.change' ? args[1] : args[2];
    const method = name === 'callRemote' ? Number(args[3]) || 0 : 0;
    mint.emitServer('crp:market:number', String(number ?? ''), method);
    return;
  }
  if (name === 'callRemote' && args[1] === 'eatery.products.buy') {
    mint.emitServer('crp:eatery:buy', Number(args[2]) || 0, Number(args[3]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'fuelstations.fill.litres') {
    mint.emitServer('crp:fuel:litres', Number(args[2]) || 0, Number(args[3]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'fuelstations.fill.fulltank') {
    mint.emitServer('crp:fuel:litres', -1, Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'police.wanted') {
    mint.emitServer('crp:police:wanted', Number(args[2]) || 0);
    return;
  }
  if (name === 'phone.call.start' || (name === 'callRemote' && (args[1] === 'phone.call.ask' || args[1] === 'phone.call.start'))) {
    const number = name === 'phone.call.start' ? args[1] : args[2];
    mint.emitServer('crp:phone:call', String(number ?? ''));
    return;
  }
  if (name === 'phone.call.end') {
    mint.emitServer('crp:phone:end');
    return;
  }
  if (name === 'phone.call.in.ans') {
    mint.emitServer('crp:phone:answer', Number(args[1]) || 0);
    return;
  }
  if (name === 'phone.message.send') {
    mint.emitServer('crp:phone:message', String(args[1] ?? ''), String(args[2] ?? ''));
    return;
  }
  if (name === 'phone.message.load') {
    mint.emitServer('crp:phone:messages', String(args[1] ?? ''));
    return;
  }
  if (name === 'phone.dialog.read') {
    mint.emitServer('crp:phone:read', String(args[1] ?? ''));
    return;
  }
  if (name === 'mapCase.animation.show.play') {
    const local = mint.Player.local;
    const on = args[1] === true || args[1] === 1 || args[1] === 'true';
    if (on && local?.vehicle) return;
    pinLocal('mapCase', on);
    return;
  }
  if (name === 'phone.contact.add') {
    mint.emitServer('crp:phone:contact', String(args[1] ?? ''), String(args[2] ?? ''));
    return;
  }
  if (name === 'callRemote' && args[1] === 'phone.call.ans') {
    mint.emitServer('crp:phone:answer', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'phone.call.end') {
    mint.emitServer('crp:phone:end');
    return;
  }
  if (name === 'callRemote' && args[1] === 'phone.message.send') {
    mint.emitServer('crp:phone:message', String(args[2] ?? ''), String(args[3] ?? ''));
    return;
  }
  if (name === 'callRemote' && args[1] === 'phone.dialog.read') {
    mint.emitServer('crp:phone:read', String(args[2] ?? ''));
    return;
  }
  if (name === 'callRemote' && args[1] === 'phone.contact.add') {
    mint.emitServer('crp:phone:contact', String(args[2] ?? ''), String(args[3] ?? ''));
    return;
  }
  if (name === 'phone.contact.remove' || (name === 'callRemote' && args[1] === 'phone.contact.remove')) {
    const number = name === 'phone.contact.remove' ? args[1] : args[2];
    mint.emitServer('crp:phone:contact:remove', String(number ?? ''));
    return;
  }
  if (name === 'phone.gallery.add' || (name === 'callRemote' && args[1] === 'phone.gallery.add')) {
    const shift = name === 'callRemote' ? 1 : 0;
    mint.emitServer('crp:phone:gallery:add', String(args[1 + shift] ?? ''), String(args[2 + shift] ?? ''), String(args[3 + shift] ?? ''));
    return;
  }
  if (name === 'phone.gallery.remove' || (name === 'callRemote' && args[1] === 'phone.gallery.remove')) {
    const id = name === 'phone.gallery.remove' ? args[1] : args[2];
    mint.emitServer('crp:phone:gallery:remove', Number(id) || 0);
    return;
  }
  if (name === 'phone.gallery.wall' || (name === 'callRemote' && args[1] === 'phone.gallery.wall')) {
    const id = name === 'phone.gallery.wall' ? args[1] : args[2];
    mint.emitServer('crp:phone:gallery:wall', Number(id) || 0);
    return;
  }
  if (handleTaxi(name, args)) return;
  if (name === 'callRemote' && args[1] === 'busdriver.employment') {
    mint.emitServer('crp:bus:job');
    return;
  }
  if (name === 'callRemote' && args[1] === 'busdriver.rent.accept') {
    mint.emitServer('crp:bus:rent', args[2] === true || args[2] === 1);
    return;
  }
  if (name === 'busdriver.menu.start') {
    mint.emitServer('crp:bus:start', Number(args[1]) || 0, Number(args[2]) || 0);
    return;
  }
  if (name === 'busdriver.menu.close' || name === 'busdriver.jobmenu.close') {
    pushCef('selectMenu.show = false;');
    return;
  }
  if (name === 'callRemote' && args[1] === 'busdriver.menu.closed') {
    mint.emitServer('crp:bus:cancel');
    return;
  }
  if (name === 'callRemote' && args[1] === 'winter.job.start') {
    mint.emitServer('crp:winter:job');
    return;
  }
  if (name === 'callRemote' && args[1] === 'winter.job.stop') {
    mint.emitServer('crp:winter:leave');
    return;
  }
  if (name === 'callRemote' && args[1] === 'winter.vehicle.buy') {
    mint.emitServer('crp:winter:rent');
    return;
  }
  if (name === 'callRemote' && args[1] === 'police.cells.arrest') {
    mint.emitServer('crp:police:cell', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'police.jail.arrest') {
    mint.emitServer('crp:police:jail', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'police.cuffs') {
    const payload = args[2];
    const recId = payload && typeof payload === 'object' && 'recId' in payload ? Number((payload as { recId?: number }).recId) : Number(payload) || 0;
    mint.emitServer('crp:police:cuffs', recId);
    return;
  }
  if (name === 'callRemote' && args[1] === 'death.wait') {
    mint.emitServer('crp:death:wait', Number(args[2]) || 0);
    return;
  }
  if (name === 'audio3d.ui.close') {
    closeMusicPanel();
    return;
  }
  if (name === 'audio3d.ui.add') {
    mint.emitServer('crp:veh:music:add', String(args[1] ?? ''));
    return;
  }
  if (name === 'audio3d.ui.volume') {
    musicVolume(Number(args[1]) || 0);
    return;
  }
  if (name === 'audio3d.ui.stop') {
    mint.emitServer('crp:veh:music:stop');
    return;
  }
  if (name === 'audio3d.ui.next') {
    mint.emitServer('crp:veh:music:next');
    return;
  }
  if (name === 'audio3d.ui.prev') {
    mint.emitServer('crp:veh:music:prev');
    return;
  }
  if (name === 'audio3d.ui.play') {
    mint.emitServer('crp:veh:music:play', Number(args[1]) || 0);
    return;
  }
  if (name === 'audio3d.ui.remove') {
    mint.emitServer('crp:veh:music:remove', Number(args[1]) || 0);
    return;
  }
  if (name === 'audio3d.ui.seek') {
    mint.emitServer('crp:veh:music:seek', Number(args[1]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'animations.playById') {
    const id = Number(args[2]);
    if (Number.isFinite(id)) mint.emitServer('crp:anim:id', Math.trunc(id));
    return;
  }
  if (name === 'animations.setOwnPlayingAnimId') {
    setOwnAnim(Number(args[1]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'admin.report') {
    mint.emitServer('crp:report', String(args[2] ?? ''));
    return;
  }
  if (name === 'callRemote' && args[1] === 'admin.panel.load') {
    mint.emitServer('crp:admin:panel');
    return;
  }
  if (name === 'callRemote' && args[1] === 'admin.panel.execute') {
    mint.emitServer('crp:admin:exec', String(args[2] ?? ''));
    return;
  }
  if (name === 'callRemote' && args[1] === 'admin.panel.report.reply') {
    mint.emitServer('crp:admin:reply', String(args[2] ?? ''));
    return;
  }
  if (name === 'callRemote' && args[1] === 'admin.panel.report.update') {
    mint.emitServer('crp:admin:report', String(args[2] ?? ''));
    return;
  }
  if (name === 'callRemote' && args[1] === 'admin.panel.report.goto') {
    mint.emitServer('crp:admin:goto', String(args[2] ?? ''));
    return;
  }
  if (name === 'callRemote' && args[1] === 'inventory.item.eat.use') {
    mint.emitServer('crp:item:eat', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'inventory.item.drink.use') {
    mint.emitServer('crp:item:drink', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'inventory.item.med.use') {
    mint.emitServer('crp:item:med', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'inventory.item.patch.use') {
    mint.emitServer('crp:item:patch', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'inventory.item.smoke.use') {
    mint.emitServer('crp:item:smoke', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'inventory.item.drugs.use') {
    mint.emitServer('crp:item:drugs', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'inventory.item.adrenalin.use') {
    mint.emitServer('crp:item:adrenalin', typeof args[2] === 'string' ? args[2] : JSON.stringify(args[2] ?? {}));
    return;
  }
  if (name === 'callRemote' && args[1] === 'inventory.item.use') {
    let data: Record<string, unknown> = {};
    try {
      data = typeof args[2] === 'string' ? JSON.parse(args[2]) as Record<string, unknown> : { ...(args[2] as Record<string, unknown>) };
    } catch {
      data = {};
    }
    if (!data.pos) {
      const pos = groundPutPos();
      if (pos) data.pos = JSON.parse(pos) as { x: number; y: number; z: number };
    }
    mint.emitServer('crp:item:use', JSON.stringify(data));
    return;
  }
  if (name === 'callRemote' && args[1] === 'documents.offer') {
    mint.emitServer('crp:doc:offer', String(args[2] ?? ''), Number(args[3]) || 0, typeof args[4] === 'string' ? args[4] : JSON.stringify(args[4] ?? {}));
    return;
  }
  if (name === 'callRemote' && args[1] === 'documents.offer.accept') {
    mint.emitServer('crp:doc:accept', args[2] === true || args[2] === 1);
    return;
  }
  if (name === 'callRemote' && args[1] === 'documents.carPass.list') {
    mint.emitServer('crp:doc:cars');
    return;
  }
  if (name === 'callRemote' && args[1] === 'vehicles.sell.send') {
    mint.emitServer('crp:veh:sell', typeof args[2] === 'string' ? args[2] : JSON.stringify(args[2] ?? {}));
    return;
  }
  if (name === 'callRemote' && args[1] === 'vehicles.sell.seller.accept') {
    mint.emitServer('crp:veh:sell:offer', typeof args[2] === 'string' ? args[2] : JSON.stringify(args[2] ?? {}));
    return;
  }
  if (name === 'callRemote' && args[1] === 'vehicles.sell.offer.accept') {
    mint.emitServer('crp:veh:sell:accept', args[2] === true || args[2] === 1);
    return;
  }
  if (name === 'callRemote' && typeof args[1] === 'string' && args[1].includes('.storage.')) {
    const payload = args[2];
    const value = typeof payload === 'string' || typeof payload === 'number' || typeof payload === 'boolean'
      ? payload
      : payload == null ? '' : JSON.stringify(payload);
    mint.emitServer('crp:faction:storage', args[1], value);
    return;
  }
  if (name === 'callRemote' && args[1] === 'factions.vehicle.unload.start') {
    mint.emitServer('crp:faction:unload', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'factions.invite.show') {
    mint.emitServer('crp:faction:invite', Number(args[2]) || 0);
    return;
  }
  if (name === 'factions.invite.accept' || (name === 'callRemote' && args[1] === 'factions.invite.accept')) {
    mint.emitServer('crp:faction:invite:accept');
    return;
  }
  if (name === 'factions.invite.cancel' || (name === 'callRemote' && args[1] === 'factions.invite.cancel')) {
    mint.emitServer('crp:faction:invite:cancel');
    return;
  }
  if (name === 'callRemote' && args[1] === 'factions.uval') {
    mint.emitServer('crp:faction:uval', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'factions.giverank.set') {
    mint.emitServer('crp:faction:rank', typeof args[2] === 'string' ? args[2] : JSON.stringify(args[2] ?? {}));
    return;
  }
  if (name === 'callRemote' && args[1] === 'factions.cash.offer') {
    mint.emitServer('crp:faction:cash', typeof args[2] === 'string' ? args[2] : JSON.stringify(args[2] ?? {}));
    return;
  }
  if (name === 'factions.cash.offer.accept' || (name === 'callRemote' && args[1] === 'factions.cash.offer.accept')) {
    mint.emitServer('crp:faction:cash:accept');
    return;
  }
  if (name === 'factions.cash.offer.cancel' || (name === 'callRemote' && args[1] === 'factions.cash.offer.cancel')) {
    mint.emitServer('crp:faction:cash:cancel');
    return;
  }
  if (name === 'callRemote' && args[1] === 'inventory.throwableWeapon.delete') {
    let id = Number(args[2]);
    if (!Number.isFinite(id) && typeof args[2] === 'string') {
      try {
        id = Number(JSON.parse(args[2]));
      } catch {
        id = NaN;
      }
    }
    if (Number.isFinite(id)) mint.emitServer('crp:weapon:throw', id);
    return;
  }
  if (name === 'callRemote' && args[1] === 'weapons.ammo.remove') {
    mint.emitServer('crp:weapon:unload', Number(args[2]) || 0, Number(args[3]) || 0);
    return;
  }
  if (name === 'callRemote' && (args[1] === 'weapons.weapon.ammo.fill' || args[1] === 'weapons.ammo.fill')) {
    mint.emitServer('crp:weapon:load', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'dmv.license.buy') {
    mint.emitServer('crp:dmv:buy', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'playerMenu.kick') {
    mint.emitServer('crp:menu:kick');
    return;
  }
  if (name === 'callRemote' && args[1] === 'item.add') {
    const payload = typeof args[2] === 'string' ? args[2] : JSON.stringify(args[2] ?? {});
    mint.emitServer('crp:item:add', payload);
    return;
  }
  if (name === 'callRemote' && args[1] === 'vehicle.boot.items.request') {
    mint.emitServer('crp:boot:request', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'vehicle.boot.items.clear') {
    mint.emitServer('crp:boot:clear', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'faction.holder.items.clear') {
    mint.emitServer('crp:holder:clear');
    return;
  }
  if (name === 'callRemote' && args[1] === 'house.holder.items.clear') {
    mint.emitServer('crp:house:holder:clear', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'house.improvements.buy') {
    mint.emitServer('crp:house:improve', String(args[2] ?? ''));
    return;
  }
  if (name === 'inventory.ground.put') {
    const sqlId = Number(args[1]) || 0;
    const pos = groundPutPos();
    if (!sqlId || !pos) return;
    mint.emitServer('crp:item:ground:put', sqlId, pos);
    return;
  }
  if (name === 'callRemote' && args[1] === 'item.ground.put') {
    const rawPos = args[3];
    const pos =
      typeof rawPos === 'string'
        ? rawPos
        : groundPutPos() ?? JSON.stringify(rawPos ?? {});
    mint.emitServer('crp:item:ground:put', Number(args[2]) || 0, pos);
    return;
  }
  if (name === 'callRemote' && args[1] === 'item.ground.take') {
    mint.emitServer('crp:item:ground:take', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'item.merge') {
    const payload = typeof args[2] === 'string' ? args[2] : JSON.stringify(args[2] ?? {});
    mint.emitServer('crp:item:merge', payload);
    return;
  }
  if (name === 'callRemote' && args[1] === 'trade.offer') {
    mint.emitServer('crp:trade:offer', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'trade.accept') {
    mint.emitServer('crp:trade:accept', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'trade.decline') {
    mint.emitServer('crp:trade:decline', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'trade.item.add') {
    mint.emitServer('crp:trade:item:add', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'trade.item.remove') {
    mint.emitServer('crp:trade:item:remove', Number(args[2]) || 0);
    return;
  }
  if (name === 'callRemote' && args[1] === 'trade.cash') {
    mint.emitServer('crp:trade:cash', String(args[2] ?? '0'));
    return;
  }
  if (name === 'callRemote' && args[1] === 'trade.ready') {
    mint.emitServer('crp:trade:ready', String(args[2] ?? '0'), args[3] === true || args[3] === 1);
    return;
  }
  if (name === 'callRemote' && args[1] === 'trade.confirm') {
    mint.emitServer('crp:trade:confirm', String(args[2] ?? '0'));
    return;
  }
  if (name === 'callRemote' && args[1] === 'trade.cancel') {
    mint.emitServer('crp:trade:cancel');
    return;
  }
  if (name === 'trade.cancel') {
    mint.emitServer('crp:trade:cancel');
    return;
  }
  if (name === 'trade.offer') {
    offerTradeFromMenu();
    return;
  }
  if (name === 'interaction.money.show') {
    showMoneyGive();
    return;
  }
  if (name === 'interaction.money.accept') {
    acceptMoneyGive(args[1]);
    return;
  }
  if (name === 'interaction.money.decline' || name === 'interaction.money.close') {
    closeMoneyGive();
    return;
  }
  if (name === 'documents.list') {
    openDocumentsList();
    return;
  }
  if (name === 'documents.showTo') {
    if (typeof args[1] === 'string') showDocumentTo(args[1]);
    return;
  }
  if (name === 'documents.offer') {
    const type = String(args[1] ?? '');
    const targetId = Number(args[2]) || 0;
    const extra = typeof args[3] === 'string' ? args[3] : JSON.stringify(args[3] ?? {});
    offerDocument(type, targetId, extra);
    return;
  }
  if (name === 'documents.carPass.list.choose' && typeof args[1] === 'string') {
    chooseCarPass(args[1]);
    return;
  }
  if (name === 'documents.close') {
    closeDocuments();
    return;
  }
  if (name === 'casino.wheel.result.close') {
    closeWheel();
    return;
  }
  if (name === 'casino.horse.select') {
    selectHorse(Math.trunc(Number(args[1]) || 0));
    return;
  }
  if (name === 'interactionMenu.onClick' && typeof args[1] === 'string' && typeof args[2] === 'string') {
    if (handleInteractionClick(args[1], args[2])) return;
  }
  if (name === 'biz.finance.save') {
    const payload = typeof args[1] === 'string' ? args[1] : JSON.stringify(args[1] ?? []);
    mint.emitServer('crp:biz:finance:save', payload);
    return;
  }
  if (name === 'callRemote' && args[1] === 'familiar.accept') {
    mint.emitServer('crp:familiar:accept', Number(args[2]) || 0);
    return;
  }
  if (name === 'trade.item.add') {
    mint.emitServer('crp:trade:item:add', Number(args[1]) || 0);
    return;
  }
  if (name === 'trade.item.remove') {
    mint.emitServer('crp:trade:item:remove', Number(args[1]) || 0);
    return;
  }
  if (name === 'trade.cash') {
    mint.emitServer('crp:trade:cash', String(args[1] ?? '0'));
    return;
  }
  if (name === 'trade.ready') {
    mint.emitServer('crp:trade:ready', String(args[1] ?? '0'), args[2] === true || args[2] === 1);
    return;
  }
  if (name === 'trade.confirm') {
    mint.emitServer('crp:trade:confirm', String(args[1] ?? '0'));
    return;
  }
  if (name === 'characterInit.slot.buy') {
    mint.emitServer('crp:char:buy');
    return;
  }
  if (name.startsWith('characterInit.create.set') && typeof args[1] === 'number') {
    applySetter(name.slice('characterInit.create.set'.length), args[1]);
    return;
  }
  if (name === 'characterInit.create.check' && typeof args[1] === 'string' && typeof args[2] === 'string') {
    mint.emitServer('crp:char:create', JSON.stringify({ ...currentDraft(), name: `${args[1]} ${args[2]}` }));
  }
}
