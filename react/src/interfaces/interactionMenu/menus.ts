export interface InteractionMenuItem {
	text: string;
	icon?: string;
}

export interface InteractionMenuDef {
	name: string;
	items: InteractionMenuItem[];
	handler: (this: InteractionMenuDef, index: number) => void;
}

function bridge() {
	return (window as any).interactionMenu;
}

function closeMenu() {
	mp.trigger('interaction.menu.close');
}

function clickItem(name: string, text: string) {
	mp.trigger('interactionMenu.onClick', name, text);
}

function selectByName(name: string) {
	const selectMenu = (window as any).selectMenu;
	if (selectMenu && selectMenu.showByName) selectMenu.showByName(name);
}

function captureShown() {
	const captureScore = (window as any).captureScore;
	return !!(captureScore && captureScore.show);
}

function notifyError(text: string) {
	const notifications = (window as any).notifications;
	if (notifications && notifications.push) notifications.push('error', text);
}

export function createMenus(): Record<string, InteractionMenuDef> {
	return {
		vehicle: {
			name: 'vehicle',
			items: [
				{ text: 'Двери', icon: 'key.png' },
				{ text: 'Капот', icon: 'hood.png' },
				{ text: 'Багажник', icon: 'trunk.png' },
			],
			handler: function (index) {
				const item = this.items[index];
				if (item.text == 'Двери') {
					mp.trigger('vehicles.lock');
					closeMenu();
				}
				if (item.text == 'Капот') {
					mp.trigger('vehicles.hood');
					closeMenu();
				}
				if (item.text == 'Багажник') {
					mp.trigger('vehicles.trunk');
					closeMenu();
				}
				if (item.text == 'Диагностика') {
					mp.trigger('carservice.diagnostics.offer');
					closeMenu();
				}
				if (item.text == 'FIB') {
					bridge().menu = bridge().menus['fib_vehicle'];
				}
				if (item.text == 'Ограбить') {
					closeMenu();
				}
				clickItem(this.name, item.text);
			},
		},
		vehicle_inside: {
			name: 'vehicle_inside',
			items: [
				{ text: 'Двери', icon: 'key.png' },
				{ text: 'Вытолкнуть', icon: 'eject.png' },
				{ text: 'Автопилот', icon: 'gps.svg' },
			],
			handler: function (index) {
				const item = this.items[index];
				if (item.text == 'Двери') {
					mp.trigger('vehicles.lock');
					closeMenu();
				}
				if (item.text == 'Вытолкнуть') {
					mp.trigger('interaction.ejectlist.get');
				}
				if (item.text == 'Звук сирены') {
					mp.trigger('vehicles.siren.sound');
					closeMenu();
				}
				if (item.text == 'Продать Т/С') {
					closeMenu();
					mp.trigger('vehicles.sell.show');
				}
				if (item.text == 'Автопилот') {
					mp.trigger('vehicles.autopilot');
					closeMenu();
				}
			},
		},
		vehicle_ejectlist: {
			name: 'vehicle_ejectlist',
			items: [],
			handler: function (index) {
				mp.trigger('interaction.eject', index);
				closeMenu();
			},
		},
		player_ownmenu: {
			name: 'player_ownmenu',
			items: [
				{ text: 'Мои документы', icon: 'doc.png' },
				{ text: 'Мой транспорт', icon: 'vehicle.svg' },
				{ text: 'Анимации', icon: 'activity.png' },
			],
			handler: function (index) {
				const item = this.items[index];
				if (item.text == 'Мои документы') {
					mp.trigger('documents.list');
				} else if (item.text == 'Организация') {
					closeMenu();
					selectByName('factionControl');
				} else if (item.text == 'Семья') {
					closeMenu();
					selectByName('familyControl');
				} else if (item.text == 'Учения') {
					closeMenu();
					if (captureShown()) return notifyError('Недоступно');
					mp.trigger('callRemote', 'army.capture.start');
				} else if (item.text == 'Захват') {
					closeMenu();
					if (captureShown()) return notifyError('Недоступно');
					mp.trigger('callRemote', 'bands.capture.start');
				} else if (item.text == 'Захват биз.') {
					closeMenu();
					if (captureShown()) return notifyError('Недоступно');
					mp.trigger('callRemote', 'mafia.bizWar.show');
				} else if (item.text == 'Эфир') {
					closeMenu();
					mp.trigger('callRemote', 'news.stream');
				} else if (item.text == 'Мой транспорт') {
					closeMenu();
					mp.trigger('callRemote', 'vehicles.own.list.show');
				} else if (item.text == 'Анимации') {
					closeMenu();
					selectByName('animations');
				}
			},
		},
		player_interaction: {
			name: 'player_interaction',
			items: [
				{ text: 'Познакомиться', icon: 'hands.png' },
				{ text: 'Документы', icon: 'doc.png' },
				{ text: 'Деньги', icon: 'wallet.png' },
				{ text: 'Обмен', icon: 'hands.png' },
			],
			handler: function (index) {
				const item = this.items[index];
				if (item.text == 'Познакомиться') {
					closeMenu();
					clickItem(this.name, item.text);
				} else if (item.text == 'Документы') {
					mp.trigger('documents.list');
				} else if (item.text == 'Деньги') {
					closeMenu();
					mp.trigger('interaction.money.show');
				} else if (item.text == 'Обмен') {
					closeMenu();
					mp.trigger('trade.offer');
				} else if (item.text == 'Пригласить в семью') {
					closeMenu();
					clickItem(this.name, item.text);
				} else if (item.text == 'Организация') {
					bridge().menu = bridge().menus['faction'];
				} else if (item.text == 'Government') {
					bridge().menu = bridge().menus['government'];
				} else if (item.text == 'Police') {
					bridge().menu = bridge().menus['police'];
				} else if (item.text == 'FIB') {
					bridge().menu = bridge().menus['fib'];
				} else if (item.text == 'Hospital') {
					bridge().menu = bridge().menus['hospital'];
				} else if (item.text == 'Army') {
					bridge().menu = bridge().menus['army'];
				} else if (item.text == 'Weazel News') {
					bridge().menu = bridge().menus['news'];
				} else if (item.text == 'Band') {
					bridge().menu = bridge().menus['band'];
				} else if (item.text == 'Mafia') {
					bridge().menu = bridge().menus['mafia'];
				} else if (item.text == 'Бросить кости') {
					closeMenu();
					mp.trigger('casino.dice.offer.create');
				}
			},
		},
		player_docs: {
			name: 'player_docs',
			items: [
				{ text: 'Паспорт', icon: 'doc.png' },
				{ text: 'Лицензии на т/с', icon: 'doc.png' },
				{ text: 'Паспорт т/с', icon: 'doc.png' },
				{ text: 'Медкарта', icon: 'doc.png' },
				{ text: 'Удостоверение', icon: 'doc.png' },
				{ text: 'Лиц. на оружие', icon: 'gun.svg' },
			],
			handler: function (index) {
				const item = this.items[index];
				if (item.text == 'Паспорт') {
					mp.trigger('documents.showTo', 'characterPass');
					closeMenu();
				}
				if (item.text == 'Лицензии на т/с') {
					mp.trigger('documents.showTo', 'driverLicense');
					closeMenu();
				}
				if (item.text == 'Паспорт т/с') {
					mp.trigger('documents.showTo', 'carPass');
					closeMenu();
				}
				if (item.text == 'Медкарта') {
					mp.trigger('documents.showTo', 'medCard');
					closeMenu();
				}
				if (item.text == 'Лиц. на оружие') {
					mp.trigger('documents.showTo', 'gunLicense');
					closeMenu();
				}
				if (item.text == 'Удостоверение') {
					mp.trigger('documents.showTo', 'governmentBadge');
					closeMenu();
				}
			},
		},
		carPass_list: {
			name: 'carPass_list',
			items: [],
			handler: function (index) {
				const item = this.items[index];
				const plate = item.text.split(' ')[1];
				mp.trigger('documents.carPass.list.choose', plate);
				closeMenu();
			},
		},
		faction: {
			name: 'faction',
			items: [
				{ text: 'Пригласить', icon: 'invite.svg' },
				{ text: 'Уволить', icon: 'uval.svg' },
				{ text: 'Ранг', icon: 'rank.svg' },
			],
			handler: function (index) {
				const item = this.items[index];
				clickItem(this.name, item.text);
				closeMenu();
			},
		},
		government: {
			name: 'government',
			items: [
				{ text: 'Наручники', icon: 'cuffs.svg' },
				{ text: 'Обыск', icon: 'search.svg' },
				{ text: 'Освобождение', icon: 'freedom.svg' },
				{ text: 'Следование', icon: 'follow.svg' },
				{ text: 'В авто', icon: 'vehicle.svg' },
			],
			handler: function (index) {
				const item = this.items[index];
				clickItem(this.name, item.text);
				closeMenu();
			},
		},
		police: {
			name: 'police',
			items: [
				{ text: 'Наручники', icon: 'cuffs.svg' },
				{ text: 'Розыск', icon: 'wanted.svg' },
				{ text: 'Обыск', icon: 'search.svg' },
				{ text: 'Арест', icon: 'arrest.svg' },
				{ text: 'Следование', icon: 'follow.svg' },
				{ text: 'Лиц. на оружие', icon: 'gun.svg' },
				{ text: 'В авто', icon: 'vehicle.svg' },
			],
			handler: function (index) {
				const item = this.items[index];
				if (item.text == 'Лиц. на оружие') return bridge().showByName('police_gunlicense');
				clickItem(this.name, item.text);
				closeMenu();
			},
		},
		police_gunlicense: {
			name: 'police_gunlicense',
			items: [{ text: 'Выдать' }, { text: 'Изъять' }],
			handler: function (index) {
				const item = this.items[index];
				clickItem(this.name, item.text);
				closeMenu();
			},
		},
		fib: {
			name: 'fib',
			items: [
				{ text: 'Наручники', icon: 'cuffs.svg' },
				{ text: 'Розыск', icon: 'wanted.svg' },
				{ text: 'Обыск', icon: 'search.svg' },
				{ text: 'Арест', icon: 'arrest.svg' },
				{ text: 'Следование', icon: 'follow.svg' },
				{ text: 'Прослушка', icon: 'headphones.svg' },
				{ text: 'В авто', icon: 'vehicle.svg' },
			],
			handler: function (index) {
				const item = this.items[index];
				clickItem(this.name, item.text);
				closeMenu();
			},
		},
		fib_vehicle: {
			name: 'fib_vehicle',
			items: [{ text: 'Номер' }],
			handler: function (index) {
				const item = this.items[index];
				clickItem(this.name, item.text);
				closeMenu();
			},
		},
		hospital: {
			name: 'hospital',
			items: [
				{ text: 'Лечить', icon: 'heal.svg' },
				{ text: 'Реанимировать', icon: 'reanimate.svg' },
				{ text: 'Медкарта', icon: 'doc.png' },
			],
			handler: function (index) {
				const item = this.items[index];
				clickItem(this.name, item.text);
				closeMenu();
			},
		},
		army: {
			name: 'army',
			items: [
				{ text: 'Наручники', icon: 'cuffs.svg' },
				{ text: 'Следование', icon: 'follow.svg' },
				{ text: 'Обыск', icon: 'search.svg' },
				{ text: 'В авто', icon: 'vehicle.svg' },
			],
			handler: function (index) {
				const item = this.items[index];
				closeMenu();
				clickItem(this.name, item.text);
			},
		},
		news: {
			name: 'news',
			items: [{ text: 'Эфир', icon: 'stream.svg' }],
			handler: function (index) {
				const item = this.items[index];
				closeMenu();
				clickItem(this.name, item.text);
			},
		},
		band: {
			name: 'band',
			items: [{ text: 'Ограбить', icon: 'rob.svg' }],
			handler: function (index) {
				const item = this.items[index];
				closeMenu();
				clickItem(this.name, item.text);
			},
		},
		mafia: {
			name: 'mafia',
			items: [
				{ text: 'Продать крышу', icon: 'roof.svg' },
				{ text: 'Ограбить', icon: 'rob.svg' },
				{ text: 'Связать', icon: 'rope.svg' },
				{ text: 'Вести', icon: 'follow.svg' },
				{ text: 'Мешок на голову', icon: 'hide.svg' },
				{ text: 'В авто', icon: 'vehicle.svg' },
			],
			handler: function (index) {
				const item = this.items[index];
				closeMenu();
				clickItem(this.name, item.text);
			},
		},
		casino_horses: {
			name: 'casino_horses',
			items: [],
			handler: function (index) {
				closeMenu();
				mp.trigger('casino.horse.select', index);
			},
		},
	};
}
