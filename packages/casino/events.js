let casino = require('./index.js');
let wheel = casino.wheel;
let horseracing = casino.horseracing;
let slots = casino.slots;
let money = call('money');
let notify = call('notifications');
let utils = call('utils');
let timer = call('timer');
let inventory;

module.exports = {
	init: () => {
		try {
			casino.init();
		} catch (e) {
			console.log('[CASINO] init error:', e);
		}
		inventory = call('inventory');
		inited(__dirname);
	},
	'casino.dice.offer.send': (player, data) => {
		if (typeof data == 'string') data = JSON.parse(data);
		if (!data || !player.character) return;

		let target = mp.players.at(data.targetId);
		if (!target || !target.character)
			return notify.error(player, `Игрок не найден`);
		if (player == target)
			return notify.error(player, `Нельзя играть в кости с самим собой`); //comment for tests
		if (!casino.isPlayerInCasinoArea(player))
			return notify.error(player, `Вы не в казино`);
		if (!casino.isPlayerInCasinoArea(target))
			return notify.error(player, `Игрок не в казино`);
		if (player.dist(target.position) > 5)
			return notify.error(player, `Игрок далеко`);
		if (data.amount < casino.minDiceCash)
			return notify.warning(
				player,
				`Минимальная сумма: $${casino.minDiceCash}`,
			);
		if (data.amount > casino.maxDiceCash)
			return notify.warning(
				player,
				`Максимальная сумма: $${casino.maxDiceCash}`,
			);
		if (data.amount > player.character.cash)
			return notify.error(player, `У вас недостаточно денег`);
		if (data.amount > target.character.cash)
			return notify.error(player, `У игрока недостаточно денег`);
		if (player.hasActiveDiceOffer)
			return notify.error(player, `Вы уже отправили предложение`);
		if (target.hasActiveDiceOffer)
			return notify.error(player, `Игрок отправил предложение`);
		if (player.diceOffer)
			return notify.error(player, `Вам отправлено предложение`);
		if (target.diceOffer)
			return notify.error(player, `Игроку уже отправлено предложение`);

		notify.info(player, `Вы предложили игру в кости`);
		player.hasActiveDiceOffer = true;
		player.diceOfferTimeout = timer.add(() => {
			hasActiveDiceOffer = false;
		}, 10000);

		target.diceOffer = {
			senderId: player.id,
			senderCharacterId: player.character.id,
			amount: data.amount,
		};
		target.call(`offerDialog.show`, [
			`dice`,
			{
				id: player.id,
				amount: data.amount,
			},
		]);
	},
	'casino.wheel.debug': player => {
		if (!player || !player.character) return;
		player.call('casino.wheel.debug.player');
	},
	'casino.wheel.spin.debugCar': player => {
		if (!player || !player.character) return;
		if (!player.character.admin || player.character.admin < 3) {
			return notify.error(player, `Нет доступа`, `DEBUG`);
		}
		if (!casino.isPlayerInCasinoArea(player)) {
			return notify.error(player, `Вы не в казино`, `DEBUG`);
		}
		if (!casino.isPlayerNearWheel(player)) {
			return notify.error(player, `Подойдите к колесу удачи`, `DEBUG`);
		}
		if (player.wheelSpinPending) {
			return notify.warning(player, `Колесо уже крутится`, `DEBUG`);
		}
		if (casino.isWheelSpinning()) {
			return notify.warning(player, `Колесо уже крутится`, `DEBUG`);
		}

		const prize = wheel.getVehiclePrize();
		if (!prize) return notify.error(player, `Приз-машина не настроен`, `DEBUG`);

		const wheelSlot = wheel.pickWheelSlot(prize);
		const winAngle = wheel.getWinAngle(wheelSlot);

		player.wheelSpinPending = {
			prize,
			winAngle,
			paid: false,
			debug: true,
			createdAt: Date.now(),
		};

		player.call('casino.wheel.spin.start', [
			{
				wheelSlot,
				winAngle,
				prize: wheel.serializePrize(prize),
				paid: false,
				animLeadMs: wheel.SPIN_ANIM_LEAD_MS,
			},
		]);
		notify.info(player, `Тест: спин с призом «${prize.text}», слот ${wheelSlot}`, `DEBUG`);
	},
	'casino.dice.offer.accept': (player, accept) => {
		let target = player;
		if (!target.diceOffer || !target.character) return;
		let offer = player.diceOffer;
		let sender = mp.players.at(offer.senderId);
		if (
			!sender ||
			!sender.character ||
			sender.character.id != offer.senderCharacterId
		)
			return notify.error(player, `Игрок отключился`);

		timer.remove(sender.diceOfferTimeout);

		if (accept) {
			let winner, loser, isDraw;
			let targetCount = utils.randomInteger(1, 6);
			let senderCount = utils.randomInteger(1, 6);
			//console.log(`sender ${senderCount} : target ${targetCount}`);

			if (senderCount > targetCount) {
				winner = sender;
				loser = target;
			} else if (targetCount > senderCount) {
				winner = target;
				loser = sender;
			} else {
				notify.info(target, `Вы сыграли в ничью`);
				notify.info(sender, `Вы сыграли в ничью`);
				isDraw = true;
			}

			if (!isDraw) {
				money.moveCash(
					loser,
					winner,
					offer.amount,
					function (result) {
						if (result) {
							notify.success(winner, `Поздравляем, вы выиграли!`);
							notify.warning(loser, `К сожалению, вы проиграли!`);
						} else {
							notify.error(winner, `Финансовая ошибка`);
							notify.error(loser, `Финансовая ошибка`);
						}
					},
					`Проигрыш в кости ID ${winner.character.id}`,
					`Победа в кости ${loser.character.id}`,
				);
			}

			let data = {
				senderName: sender.name,
				senderId: sender.id,
				senderCount: senderCount,
				targetName: target.name,
				targetId: target.id,
				targetCount: targetCount,
			};

			mp.players.forEachInRange(target.position, 5, current => {
				//console.log('push txt')
				current.call(`casino.dice.text.show`, [JSON.stringify(data)]);
			});
		} else {
			notify.warning(sender, 'Игрок отказался от игры в кости');
			notify.warning(target, 'Вы отказались от игры в кости');
		}
		sender.hasActiveDiceOffer = false;
		delete target.diceOffer;
	},
	/// Открытие ITB-автомата: показываем меню выбора лошади с коэффициентами.
	'casino.horse.open': player => {
		if (!player.character) return;
		if (!casino.isPlayerInCasinoArea(player))
			return notify.error(player, `Вы не в казино`);
		if (!casino.isPlayerNearITB(player))
			return notify.error(player, `Подойдите к автомату ставок`);
		if (player.horseRace) return notify.warning(player, `Забег уже идёт`);

		player.call('casino.horse.menu.show', [
			JSON.stringify(horseracing.serializeHorses()),
		]);
	},

	/// Приём ставки: валидация, списание, генерация забега, старт на экране.
	'casino.horse.bet': (player, data) => {
		if (typeof data === 'string') data = JSON.parse(data);
		if (!data || !player.character) return;

		const fail = (msg, level = 'error') => {
			notify[level](player, msg, `СКАЧКИ`);
			player.call('casino.horse.bet.fail');
		};

		if (!casino.isPlayerInCasinoArea(player)) return fail(`Вы не в казино`);
		if (!casino.isPlayerNearITB(player)) return fail(`Подойдите к автомату ставок`);
		if (player.horseRace) return fail(`Забег уже идёт`, 'warning');

		const horse = horseracing.getHorse(parseInt(data.horse));
		if (!horse) return fail(`Лошадь не выбрана`);

		const amount = parseInt(data.amount);
		if (isNaN(amount) || amount < horseracing.MIN_BET)
			return fail(`Минимальная ставка: $${horseracing.MIN_BET}`, 'warning');
		if (amount > horseracing.MAX_BET)
			return fail(`Максимальная ставка: $${horseracing.MAX_BET}`, 'warning');
		if (amount > player.character.cash)
			return fail(`Недостаточно наличных`);

		money.removeCash(
			player,
			amount,
			success => {
				if (!success) return fail(`Не удалось списать ставку`);

				const race = horseracing.generateRace();
				player.horseRace = {
					horse: horse.num,
					amount,
					order: race.order,
					createdAt: Date.now(),
				};

				player.call('casino.horse.race.start', [
					JSON.stringify({
						horses: horseracing.serializeHorses(),
						order: race.order,
						seed: race.seed,
						durationSec: race.durationSec,
						betHorse: horse.num,
						betAmount: amount,
					}),
				]);
			},
			`Ставка на скачках (лошадь #${horse.num})`,
		);
	},

	/// Клиент доиграл анимацию забега — выдаём выигрыш по сохранённому порядку.
	'casino.horse.race.done': player => {
		if (!player.character || !player.horseRace) return;

		const { horse, amount, order } = player.horseRace;
		delete player.horseRace;

		const winner = order[0];
		const won = winner === horse;
		const winnerHorse = horseracing.getHorse(winner);

		if (won) {
			const payout = horseracing.getPayout(horse, amount);
			money.addCash(
				player,
				payout,
				success => {
					if (!success) return notify.error(player, `Ошибка зачисления выигрыша`, `СКАЧКИ`);
					notify.success(
						player,
						`Победила «${winnerHorse.name}». Выигрыш: $${payout}`,
						`СКАЧКИ`,
					);
				},
				`Выигрыш на скачках (лошадь #${winner})`,
			);
		} else {
			notify.warning(
				player,
				`Победила «${winnerHorse.name}». Ваша ставка не сыграла`,
				`СКАЧКИ`,
			);
		}
	},

	/// Спин слот-машины: валидация, списание ставки, расчёт исхода, выплата.
	/// Барабаны на клиенте лишь анимируются к присланному результату.
	'casino.slots.spin': (player, bet) => {
		if (!player.character) return;

		const fail = (msg, level = 'error') => {
			notify[level](player, msg, `СЛОТЫ`);
			player.call('casino.slots.spin.fail');
		};

		if (!casino.isPlayerInCasinoArea(player)) return fail(`Вы не в казино`);
		if (player.slotBusy) return fail(`Барабаны ещё крутятся`, 'warning');

		bet = parseInt(bet);
		if (!slots.isValidBet(bet)) return fail(`Некорректная ставка`);
		if (bet > player.character.cash) return fail(`Недостаточно наличных`);

		player.slotBusy = true;
		// Страховочный сброс блокировки, если клиент не пришлёт done.
		player.slotBusyTimer = timer.add(() => {
			player.slotBusy = false;
		}, 8000);

		money.removeCash(
			player,
			bet,
			success => {
				if (!success) {
					player.slotBusy = false;
					timer.remove(player.slotBusyTimer);
					return fail(`Не удалось списать ставку`);
				}

				const result = slots.generateSpin(bet);

				player.call('casino.slots.result', [
					JSON.stringify({
						reels: result.reels,
						win: result.win,
						payout: result.payout,
						multiplier: result.multiplier,
						bet,
					}),
				]);

				if (result.win) {
					money.addCash(
						player,
						result.payout,
						ok => {
							if (!ok)
								return notify.error(player, `Ошибка зачисления выигрыша`, `СЛОТЫ`);
							notify.success(
								player,
								`Выигрыш x${result.multiplier}: $${result.payout}`,
								`СЛОТЫ`,
							);
						},
						`Выигрыш в слот-машине (x${result.multiplier})`,
					);
				}
			},
			`Ставка в слот-машине`,
		);
	},

	/// Клиент доиграл анимацию барабанов — снимаем блокировку для нового спина.
	'casino.slots.spin.done': player => {
		if (!player) return;
		player.slotBusy = false;
		timer.remove(player.slotBusyTimer);
	},

	playerQuit: player => {
		if (player.horseRace) delete player.horseRace;
		if (player.slotBusy) {
			player.slotBusy = false;
			timer.remove(player.slotBusyTimer);
		}
		timer.remove(player.diceOfferTimeout);
		// Если игрок вышел до клика "Забрать" — на следующем заходе при необходимости можно
		// довыдать приз через админский /restorewheel, но автоматически НЕ выдаём, чтобы
		// не злоупотребляли (alt+f4 → перезаход → повторный спин). Просто очищаем pending.
		if (player.wheelSpinPending) delete player.wheelSpinPending;
	},

	/// Попытка прокрутки колеса удачи.
	/// Проверяет позицию, кулдаун. Если беспл. прокрутка ещё на КД — списывает $500.
	/// Возвращает на клиент данные о призе и угле остановки, чтобы клиент проиграл анимацию.
	'casino.wheel.spin.try': player => {
		// Унифицированный отказ — снимает busy на клиенте и шлёт уведомление
		const fail = (msg, level = 'error') => {
			notify[level](player, msg);
			player.call('casino.wheel.spin.fail');
		};

		if (!player.character) return player.call('casino.wheel.spin.fail');
		if (!casino.isPlayerInCasinoArea(player)) return fail(`Вы не в казино`);
		if (!casino.isPlayerNearWheel(player))
			return fail(`Подойдите к колесу удачи`);
		if (player.wheelSpinPending) return fail(`Колесо уже крутится`, 'warning');

		const freeAvailable = wheel.isFreeSpinAvailable(
			player.character.lastWheelSpin,
		);
		const usePaid = !freeAvailable;

		if (usePaid) {
			if (player.character.cash < wheel.SPIN_PRICE) {
				const leftMs = wheel.getCooldownLeft(player.character.lastWheelSpin);
				const leftHours = Math.ceil(leftMs / (60 * 60 * 1000));
				return fail(
					`Бесплатная прокрутка через ${leftHours} ч., либо нужно $${wheel.SPIN_PRICE} наличными`,
				);
			}
		}

		const prize = wheel.pickPrize();
		const wheelSlot = wheel.pickWheelSlot(prize);
		const winAngle = wheel.getWinAngle(wheelSlot);

		const startSpin = () => {
			if (freeAvailable) {
				player.character.lastWheelSpin = new Date();
				player.character.save();
			}

			player.wheelSpinPending = {
				prize,
				winAngle,
				paid: usePaid,
				createdAt: Date.now(),
			};

			if (casino.isWheelSpinning()) {
				delete player.wheelSpinPending;
				return fail(`Колесо уже крутится`, 'warning');
			}

			// Только анимация — вращение после casino.wheel.spin.anim.ready
			player.call('casino.wheel.spin.start', [
				{
					wheelSlot,
					winAngle,
					prize: wheel.serializePrize(prize),
					paid: usePaid,
					animLeadMs: wheel.SPIN_ANIM_LEAD_MS,
				},
			]);
		};

		if (usePaid) {
			money.removeCash(
				player,
				wheel.SPIN_PRICE,
				success => {
					if (!success) {
						notify.error(player, `Не удалось списать $${wheel.SPIN_PRICE}`);
						return player.call('casino.wheel.spin.fail');
					}
					startSpin();
				},
				`Платная прокрутка колеса удачи`,
			);
		} else {
			startSpin();
		}
	},

	/// Клиент завершил enter-анимацию — запускаем вращение колеса на сервере
	'casino.wheel.spin.anim.ready': player => {
		if (!player || !player.character) return;
		if (!player.wheelSpinPending) return player.call('casino.wheel.spin.fail');
		if (casino.isWheelSpinning()) return;

		const { prize, winAngle } = player.wheelSpinPending;

		casino.spinWheel(winAngle, () => {
			player.call('casino.wheel.spin.done', [
				wheel.serializePrize(prize),
			]);
		});
	},

	/// Завершение прокрутки на клиенте — сервер выдаёт приз, который сам же выбрал в try.
	/// Клиентский payload игнорируется (используется только как триггер).
	'casino.wheel.spin.finish': player => {
		if (!player.character) return;
		if (!player.wheelSpinPending) return;

		const { prize } = player.wheelSpinPending;
		delete player.wheelSpinPending;

		switch (prize.type) {
			case 'cash': {
				money.addCash(
					player,
					prize.amount,
					success => {
						if (!success)
							return notify.error(player, `Ошибка зачисления выигрыша`);
						notify.success(player, `Выигрыш: ${prize.text}`, `КАЗИНО`);
					},
					`Выигрыш в колесе удачи`,
				);
				break;
			}
			case 'item': {
				if (!inventory) inventory = call('inventory');
				const itemParams = Object.assign({}, prize.params || {});
				// Если предмет gender-зависимый, выставляем sex под пол персонажа
				if (prize.needGender) itemParams.sex = player.character.gender ? 0 : 1;
				inventory.addItem(player, prize.itemId, itemParams, err => {
					if (err) {
						// Если рюкзак переполнен — компенсируем деньгами
						money.addCash(
							player,
							1000,
							() => {},
							`Колесо удачи: компенсация (нет места)`,
						);
						return notify.warning(
							player,
							`Приз "${prize.text}" не помещается. Получите $1 000 компенсации`,
							`КАЗИНО`,
						);
					}
					notify.success(player, `Выигрыш: ${prize.text}`, `КАЗИНО`);
				});
				break;
			}
			case 'vehicle': {
				casino.giveWheelPrizeVehicle(player, prize).then(result => {
					if (result.ok) {
						return notify.success(
							player,
							`Выигрыш: ${result.name} (${result.plate}). Ключи в инвентаре`,
							`КАЗИНО`,
						);
					}
					if (result.reason === 'no_slot') {
						money.addCash(
							player,
							25000,
							() => {},
							`Колесо удачи: компенсация (нет места для авто)`,
						);
						return notify.warning(
							player,
							`Нет места для авто. Компенсация $25 000`,
							`КАЗИНО`,
						);
					}
					money.addCash(
						player,
						25000,
						() => {},
						`Колесо удачи: компенсация (инвентарь)`,
					);
					notify.warning(
						player,
						`Не удалось выдать авто. Компенсация $25 000`,
						`КАЗИНО`,
					);
				}).catch(err => {
					console.log('[CASINO] wheel vehicle prize error', err);
					notify.error(player, `Ошибка выдачи автомобиля`, `КАЗИНО`);
				});
				break;
			}
			case 'empty':
			default:
				notify.info(
					player,
					`На этот раз не повезло. Попробуйте ещё раз!`,
					`КАЗИНО`,
				);
				break;
		}
	},
};
