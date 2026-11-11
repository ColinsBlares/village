import * as mint from 'mint-client';

const ROUTES: Record<string, string> = {
  'army.capture.start': 'crp:war:army',
  'bands.capture.start': 'crp:war:bands',
  'bands.drugsStash.drugs.buy': 'crp:bands:drugs',
  'mafia.bizWar.show': 'crp:war:biz:show',
  'mafia.bizWar.start': 'crp:war:biz:start',
  'family.create': 'crp:family:create',
  'family.leave': 'crp:family:leave',
  'family.disband': 'crp:family:disband',
  'family.control.members.online.show': 'crp:family:members',
  'family.control.members.offline.show': 'crp:family:members',
  'family.control.members.ranks.set': 'crp:family:rank',
  'family.control.members.uval': 'crp:family:uval',
  'family.leadership.transfer': 'crp:family:lead',
  'family.control.ranks.set': 'crp:family:rank',
  'family.control.access.set': 'crp:family:access',
  'family.control.cash.deposit': 'crp:family:cash',
  'family.control.cash.withdraw': 'crp:family:cash',
  'family.control.settings.set': 'crp:family:settings',
  'family.control.vehicles.show': 'crp:family:vehicles',
  'family.control.vehicles.minRank.set': 'crp:family:vehicle:rank',
  'family.control.vehicles.respawn': 'crp:family:respawn',
  'family.garage.buy.show': 'crp:family:garage',
  'family.garage.buy': 'crp:family:garage:buy',
  'family.control.house.bind': 'crp:family:house',
  'family.control.house.unbind': 'crp:family:house',
  'family.contract.take': 'crp:family:contract',
  'family.contract.cancel': 'crp:family:contract',
  'casino.dice.offer.send': 'crp:casino:dice',
  'casino.dice.offer.accept': 'crp:casino:dice:accept',
  'casino.cashier.buy': 'crp:casino:chips:buy',
  'casino.cashier.sell': 'crp:casino:chips:sell',
  'casino.slots.spin': 'crp:casino:slots',
  'casino.horse.bet': 'crp:casino:horse',
  'casino.wheel.spin.try': 'crp:casino:wheel',
  'quests.log.request': 'crp:quest:log',
  'quests.track': 'crp:quest:track',
  'quests.abandon': 'crp:quest:abandon',
  'quests.checkpoint.reach': 'crp:quest:reach',
  'farms.buy': 'crp:farm:buy',
  'farms.sell.state': 'crp:farm:sell',
  'farms.sell.player': 'crp:farm:player',
  'farms.sell.player.accept': 'crp:farm:player:accept',
  'farms.sell.player.cancel': 'crp:farm:player:cancel',
  'farms.job.start': 'crp:farm:job',
  'farms.job.stop': 'crp:farm:job:stop',
  'farms.grains.price.set': 'crp:farm:price',
  'farms.soils.price.set': 'crp:farm:soil:price',
  'farms.warehouse.grains.sell': 'crp:farm:grains:sell',
  'farms.warehouse.products.fill': 'crp:farm:fill',
  'farms.warehouse.products.buy': 'crp:farm:products:buy',
  'farms.warehouse.products.inv.buy': 'crp:farm:products:hand',
  'farms.warehouse.grains.take': 'crp:farm:grains:take',
  'farms.soilsWarehouse.take': 'crp:farm:soils:take',
  'farms.soilsWarehouse.sell': 'crp:farm:soils:sell',
  'farms.crops.price.set': 'crp:farm:crops:price',
  'farms.balance.set': 'crp:farm:balance',
  'farms.pay.set': 'crp:farm:pay',
  'fishing.rod.buy': 'crp:fish:rod',
  'fishing.fish.sell': 'crp:fish:sell',
  'fishing.game.enter': 'crp:fish:enter',
  'fishing.game.start': 'crp:fish:start',
  'fishing.game.end': 'crp:fish:end',
  'fishing.game.exit': 'crp:fish:exit',
  'bins.trash.sell': 'crp:bins:sell',
  'mason.items.buy': 'crp:mason:buy',
  'mason.clothes.buy': 'crp:mason:buy',
  'mason.items.sell': 'crp:mason:sell',
  'woodman.items.buy': 'crp:wood:buy',
  'woodman.clothes.buy': 'crp:wood:buy',
  'woodman.items.sell': 'crp:wood:sell',
  'bar.buy': 'crp:bar:buy',
  'clubs.alcohol.buy': 'crp:club:alcohol',
  'clubs.snacks.buy': 'crp:club:snack',
  'clubs.smoke.buy': 'crp:club:smoke',
  'clubs.control.open': 'crp:club:open',
  'rent.vehicle.rent': 'crp:rent:buy',
  'carservice.jobshape.employment': 'crp:service:job',
  'carservice.diagnostics.accept': 'crp:service:accept',
  'carservice.check.accept': 'crp:service:bill',
  'farms.field.crop.take': 'crp:farm:crop',
  'factions.control.members.online.show': 'crp:faction:members',
  'factions.control.members.offline.show': 'crp:faction:members',
  'factions.control.members.ranks.set': 'crp:faction:members:rank',
  'factions.control.members.uval': 'crp:faction:members:uval',
  'factions.control.members.access.set': 'crp:faction:access',
  'factions.control.ranks.set': 'crp:faction:ranks:name',
  'factions.control.vehicles.show': 'crp:faction:vehicles',
  'factions.control.vehicles.minRank.set': 'crp:faction:vehicles:rank',
  'factions.control.vehicles.respawn': 'crp:faction:vehicles:respawn',
  'factions.control.warehouse.show': 'crp:faction:warehouse',
  'factions.control.clothes.rank.set': 'crp:faction:clothes:rank',
  'factions.control.items.rank.set': 'crp:faction:items:rank',
  'government.service.fines.pay': 'crp:gov:fine',
  'government.service.keys.veh.restore': 'crp:gov:keys',
  'wedding.remove': 'crp:wedding:remove',
  'wedding.add': 'crp:wedding:add',
  'wedding.add.accept': 'crp:wedding:accept',
  'wedding.add.cancel': 'crp:wedding:cancel',
  'chargestations.charge': 'crp:charge',
  'craft.bonfire.addFirewood': 'crp:craft:wood',
  'craft.item.craft': 'crp:craft',
  'craft.queue.take': 'crp:craft:take',
  'craft.queue.update': 'crp:craft:update',
  'npcs.interact': 'crp:npc:talk',
  'carrier.job.start': 'crp:carrier:job',
  'carrier.job.stop': 'crp:carrier:job',
  'carrier.load.products.buy': 'crp:carrier:buy',
  'carrier.load.products.sell': 'crp:carrier:sell',
  'carrier.load.orders.take': 'crp:carrier:order',
  'carrier.cropUnload.sell': 'crp:carrier:crop',
  'carrier.vehicle.buy': 'crp:carrier:rent',
  'promocodes.activate': 'crp:promo',
  'battlePass.request': 'crp:pass:open',
  'battlePass.task.claim': 'crp:pass:task',
  'battlePass.premium.task.claim': 'crp:pass:task',
  'battlePass.reward.claim': 'crp:pass:reward',
  'battlePass.premium.reward.claim': 'crp:pass:reward',
  'battlePass.premium.purchase': 'crp:pass:premium',
  'battlePass.case.open': 'crp:pass:case',
  'donate.convert': 'crp:donate:convert',
  'donate.nickname.set': 'crp:donate:name',
  'donate.warns.clear': 'crp:donate:warn',
  'donate.slots.add': 'crp:donate:slot',
  'donate.case.open': 'crp:donate:case',
  'biz.buy': 'crp:biz:buy',
  'biz.sell.toGov': 'crp:biz:gov',
  'biz.order.add': 'crp:biz:order',
  'biz.order.cancel': 'crp:biz:order:cancel',
  'biz.menu.open': 'crp:biz:open',
  'biz.sell.check': 'crp:biz:check',
  'biz.sell': 'crp:biz:player',
  'biz.sell.ans': 'crp:biz:player:ans',
  'biz.sell.stop': 'crp:biz:stop',
  'house.sell.check': 'crp:house:sell:check',
  'house.sell': 'crp:house:sell',
  'house.sell.ans': 'crp:house:sell:ans',
  'house.sell.stop': 'crp:house:sell:stop',
  'house.sell.toGov': 'crp:house:gov',
  'casino.table.join': 'crp:table:join',
  'casino.table.leave': 'crp:table:leave',
  'casino.table.bet': 'crp:table:bet',
  'casino.table.hit': 'crp:table:hit',
  'casino.table.stand': 'crp:table:stand',
  'casino.table.double': 'crp:table:double',
  'mapCase.pd.searchByPhone': 'crp:pd:phone',
  'mapCase.fib.searchByPhone': 'crp:pd:phone',
  'mapCase.pd.searchByName': 'crp:pd:name',
  'mapCase.fib.searchByName': 'crp:pd:name',
  'mapCase.pd.searchByCar': 'crp:pd:car',
  'mapCase.fib.searchByCar': 'crp:pd:car',
  'mapCase.pd.calls.add': 'crp:pd:call',
  'mapCase.pd.calls.accept': 'crp:pd:call:take',
  'mapCase.pd.getProfile': 'crp:tablet:profile',
  'mapCase.fib.getProfile': 'crp:tablet:profile',
  'mapCase.pd.searchById': 'crp:tablet:identity',
  'mapCase.fib.searchById': 'crp:tablet:identity',
  'mapCase.pd.fines.give': 'crp:tablet:fine',
  'mapCase.fib.fines.give': 'crp:tablet:fine',
  'mapCase.pd.wanted.give': 'crp:tablet:wanted',
  'mapCase.fib.wanted.give': 'crp:tablet:wanted',
  'mapCase.pd.wanted.search': 'crp:tablet:search',
  'mapCase.fib.wanted.search': 'crp:tablet:search',
  'mapCase.pd.emergency.call': 'crp:pd:backup',
  'mapCase.fib.emergency.call': 'crp:fib:backup',
  'vehicles.props.add': 'crp:veh:props',
  'vehicles.music.ended': 'crp:veh:music:ended',
  'bugTracker.bug.create': 'crp:bug:create',
  'terminal.command.handle': 'crp:terminal',
  'factions.cash.offer.cancel': 'crp:faction:cash:cancel',
  'mapCase.ems.calls.add': 'crp:ems:call',
  'mapCase.ems.calls.accept': 'crp:ems:call:take',
  'mapCase.ems.calls.remove': 'crp:ems:call:drop',
  'mapCase.gover.init': 'crp:tablet:open',
  'mapCase.pd.init': 'crp:tablet:open',
  'mapCase.army.init': 'crp:tablet:open',
  'mapCase.fib.init': 'crp:tablet:open',
  'mapCase.ems.init': 'crp:tablet:open',
  'mapCase.news.init': 'crp:tablet:open',
  'mapCase.news.ads.add': 'crp:news:ad',
  'mapCase.news.ads.get': 'crp:news:list',
  'mapCase.news.ads.accept': 'crp:news:accept',
  'mapCase.news.ads.cancel': 'crp:news:cancel',
  'settings.set': 'crp:settings',
  'settings.password.set': 'crp:settings:password',
  'settings.email.set': 'crp:settings:email',
  'settings.email.confirm': 'crp:settings:email:code',
  'settings.email.code.check': 'crp:settings:email:check',
  'house.lock': 'crp:house:lock',
  'phone.contact.rename': 'crp:phone:rename',
  'biz.actions': 'crp:biz:finance',
  'biz.finance.save': 'crp:biz:finance:save',
  'changelist.like': 'crp:changelist:like',
};

const EXTRA: Record<string, boolean> = {
  'family.control.members.offline.show': true,
  'factions.control.members.offline.show': true,
  'carrier.job.stop': true,
  'battlePass.premium.task.claim': true,
  'battlePass.premium.reward.claim': true,
  'family.control.cash.withdraw': true,
  'family.control.house.unbind': true,
  'family.contract.cancel': true,
};

function send(event: string, payload: unknown, extra?: boolean): void {
  const value = payload == null || typeof payload === 'string' || typeof payload === 'number' || typeof payload === 'boolean'
    ? payload
    : JSON.stringify(payload);
  if (extra == null) {
    if (value == null) mint.emitServer(event);
    else mint.emitServer(event, value);
    return;
  }
  if (value == null) mint.emitServer(event, extra);
  else mint.emitServer(event, value, extra);
}

export function handleBatchRemote(name: string, args: unknown[]): boolean {
  if (name === 'wedding.add.offer') {
    mint.emitServer('crp:wedding:offer');
    return true;
  }
  if (name === 'carservice.diagnostics.offer') {
    mint.emitServer('crp:service:offer', Number(args[1]) || 0);
    return true;
  }
  if (name !== 'callRemote' || typeof args[1] !== 'string') return false;
  if (args[1] === 'quests.dialog.choice') {
    mint.emitServer('crp:quest:choice', Number(args[2]) || 0, String(args[3] ?? ''));
    return true;
  }
  const rank = /^mapCase\.(gover|pd|army|fib|ems|news)\.rank\.(raise|lower)$/.exec(args[1]);
  if (rank) {
    mint.emitServer('crp:tablet:rank', JSON.stringify({ board: rank[1], dir: rank[2] === 'raise' ? 1 : -1, id: Number(args[2]) || 0 }));
    return true;
  }
  const fired = /^mapCase\.(gover|pd|army|fib|ems|news)\.members\.uval$/.exec(args[1]);
  if (fired) {
    mint.emitServer('crp:tablet:uval', JSON.stringify({ board: fired[1], id: Number(args[2]) || 0 }));
    return true;
  }
  const event = ROUTES[args[1]];
  if (!event) return false;
  if (args[1] === 'mason.items.buy' || args[1] === 'mason.clothes.buy' || args[1] === 'woodman.items.buy' || args[1] === 'woodman.clothes.buy') {
    mint.emitServer(event, JSON.stringify({ clothes: String(args[1]).includes('clothes'), index: Number(args[2]) || 0 }));
    return true;
  }
  if (event === 'crp:biz:order' && args.length > 4) {
    mint.emitServer(event, JSON.stringify({ id: args[2], count: args[3], price: args[4], faction: args[5] === true || args[5] === 1 || args[5] === '1' }));
    return true;
  }
  if (event === 'crp:biz:player' && args.length > 3) {
    mint.emitServer(event, JSON.stringify({ id: args[2], cost: args[3] }));
    return true;
  }
  if (event === 'crp:house:sell' && args.length > 3) {
    mint.emitServer(event, Number(args[2]) || 0, Number(args[3]) || 0);
    return true;
  }
  if (event === 'crp:table:bet') {
    mint.emitServer('crp:table:bet', String(args[2] ?? 'red'), Number(args[3]) || 0);
    return true;
  }
  if (event === 'crp:house:lock') {
    mint.emitServer('crp:house:lock', Number(args[2]) || 0, args[3] === true || args[3] === 1 || args[3] === '1');
    return true;
  }
  if (event === 'crp:phone:rename') {
    mint.emitServer('crp:phone:rename', String(args[2] ?? ''), String(args[3] ?? ''));
    return true;
  }
  const extra = EXTRA[args[1]];
  send(event, args.length > 2 ? args[2] : null, extra);
  return true;
}
