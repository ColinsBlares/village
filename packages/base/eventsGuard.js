'use strict';

/// События, которые клиент не должен вызывать через callRemote.
/// Серверный mp.events.call подставляет токен; обработчик без токена молча выходит.
const INTERNAL_EVENTS = new Set([
	'init',
	'auth.done',
	'characterInit.start',
	'characterInit.done',
	'characterInit.create.init',
	'economy.done',
	'economy.updated',
	'inventory.done',
	'inventory.add',
	'money.add',
	'money.remove',
	'player.house.changed',
	'player.biz.changed',
	'player.faction.changed',
	'player.factionRank.changed',
	'player.family.changed',
	'player.familyRank.changed',
	'player.admin.changed',
	'player.law.changed',
	'player.fines.changed',
	'player.narcotism.changed',
	'player.nicotine.changed',
	'player.phone.number.changed',
	'player.name.changed',
	'player.donate.changed',
	'player.slots.changed',
	'player.warns.changed',
	'player.password.changed',
	'player.email.changed',
	'faction.holder.items.init',
	'faction.holder.items.request',
	'faction.holder.items.destroy',
	'faction.holder.items.clear',
	'faction.holder.items.remove',
	'house.holder.items.request',
	'house.holder.items.clear',
	'mapCase.gover.init',
	'mapCase.pd.init',
	'mapCase.army.init',
	'mapCase.fib.init',
	'mapCase.ems.init',
	'mapCase.news.init',
	'jobs.set',
	'jobs.leave',
	'death.spawn',
	'time.main.tick',
	'bizes.done',
	'vehicles.private.load',
	'vehicles.loaded',
	'vehicles.breakdowns.init',
	'vehicle.ready',
	'vehicle.respawned',
	'vehicles.respawn.full',
	'parkings.vehicle.add',
	'admin.command.handle',
	'admin.command.help',
	'terminal.command.handle',
	'chat.command.handle',
]);

const TOKEN = Object.create(null);

/// RAGE передаёт в обработчик не больше аргументов, чем function.length.
/// Rest-параметр даёт length 0, токен init не доходит, и модуль молча не стартует.
function wrapHandler(name, handler, writeCrashLog) {
	if (typeof handler !== 'function') return handler;
	if (handler.__rageInternal) return handler;
	const internal = INTERNAL_EVENTS.has(name);
	const wrapped = function (a, b, c, d, e, f, g, h, i, j, k, l, m, n, o) {
		const args = [a, b, c, d, e, f, g, h, i, j, k, l, m, n, o];
		const count = arguments.length < args.length ? arguments.length : args.length;
		args.length = count;
		try {
			if (internal) {
				if (args[0] !== TOKEN) return;
				return handler.apply(this, args.slice(1));
			}
			return handler.apply(this, args);
		} catch (err) {
			if (writeCrashLog) writeCrashLog(`event ${name}`, err);
			else console.log(`event ${name}`, err && err.stack ? err.stack : err);
		}
	};
	wrapped.__rageInternal = true;
	return wrapped;
}

module.exports = {
	TOKEN,
	INTERNAL_EVENTS,
	isAdmin(player, level) {
		return !!(
			player &&
			player.character &&
			player.character.admin >= (level || 1)
		);
	},
	install(mp, writeCrashLog) {
		const origCall = mp.events.call.bind(mp.events);
		mp.events.call = function (name, ...args) {
			if (INTERNAL_EVENTS.has(name)) {
				return origCall(name, TOKEN, ...args);
			}
			return origCall(name, ...args);
		};

		const origAdd = mp.events.add.bind(mp.events);
		mp.events.add = function (nameOrObj, handler) {
			if (
				typeof nameOrObj === 'object' &&
				nameOrObj !== null &&
				typeof handler !== 'function'
			) {
				for (const key of Object.keys(nameOrObj)) {
					origAdd(key, wrapHandler(key, nameOrObj[key], writeCrashLog));
				}
				return;
			}
			return origAdd(
				nameOrObj,
				wrapHandler(nameOrObj, handler, writeCrashLog),
			);
		};
	},
};
