import { notifyError, triggerMp } from './mp';

export const defaultItemsInfo: { [id: string]: any } = {
	1: { name: 'Очки', description: 'Описание очков.', height: 2, width: 3, weight: 0.1, chance: 50 },
	3: { name: 'Бронежилет', description: 'Описание броника.', height: 6, width: 8, weight: 10, chance: 50 },
	7: { name: 'Рубашка', description: 'Описание рубашки.', height: 5, width: 4, weight: 0.1, chance: 50 },
	8: { name: 'Штаны', description: 'Описание штанов.', height: 6, width: 8, weight: 0.1, chance: 50 },
	9: { name: 'Ботинки', description: 'Описание ботинков.', height: 3, width: 3, weight: 0.1, chance: 50 },
	13: { name: 'Сумка', description: 'Описание сумки.', height: 6, width: 8, weight: 2, chance: 50 },
	16: { name: 'Сигареты', description: 'Описание.', height: 2, width: 2, weight: 0.1, chance: 50 },
	18: {
		name: 'Фонарь SureFire G2 Nitrolon',
		description: 'Компактный, легкий и мощный фонарик, который можно использовать как подствольный целеуказатель.',
		height: 3,
		width: 4,
		weight: 2,
		chance: 50,
	},
	21: { name: 'Дробаш', description: 'Может стрелять.', height: 6, width: 8, weight: 2, chance: 50 },
	24: { name: 'Аптечка', description: 'Описание аптечки.', height: 6, width: 8, weight: 0.1, chance: 50 },
	37: { name: 'Патрон', description: 'Описание патрона.', height: 4, width: 4, weight: 0.02, chance: 50 },
	39: { name: 'Патрон', description: 'Описание патрона.', height: 4, width: 4, weight: 0.02, chance: 50 },
};

export const defaultBodyList: { [key: string]: number[] | null } = {
	0: [1],
	1: [6],
	2: [14],
	3: [2],
	4: [3],
	5: [7],
	6: [11],
	7: [10],
	8: [12],
	9: [],
	10: [13],
	11: [8],
	12: [9],
	13: null,
};

export const defaultBlackList: { [key: string]: number[] } = {
	3: [13],
	7: [13],
	8: [13],
};

export const defaultMergeList: { [key: string]: number[] } = {
	37: [20],
	38: [48],
	39: [21, 107],
	40: [22, 99],
};

export const weaponsList = [20, 21, 22, 41, 44, 46, 47, 48, 49, 50, 52, 80, 87, 88, 89, 90, 91, 93, 96, 99, 100, 107];
export const throwableWeaponsList = [117];
export const eatList = [35, 126, 127, 128, 129, 132, 134, 142, 143, 144];
export const drinkList = [34, 130, 133, 145];
export const takeSearchList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 13, 14, 17, 18, 19, 20, 21, 22, 23, 24, 26, 27, 28, 29, 30, 31, 32, 33, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 125];

function remote(eventName: string, payload: any) {
	triggerMp('callRemote', eventName, typeof payload === 'string' ? payload : JSON.stringify(payload));
}

export function createItemsMenu() {
	return {
		4: {
			'Установить': {
				handler: function (item: any) {
					remote('fib.spy', { itemSqlId: item.sqlId });
				},
			},
		},
		16: {
			'Курить': {
				handler: function (item: any) {
					triggerMp('callRemote', 'inventory.item.smoke.use', item.sqlId);
				},
			},
		},
		24: {
			'Вылечиться': {
				handler: function (item: any) {
					triggerMp('callRemote', 'inventory.item.med.use', item.sqlId);
				},
			},
		},
		25: {
			'Вылечиться': {
				handler: function (item: any) {
					triggerMp('callRemote', 'inventory.item.patch.use', item.sqlId);
				},
			},
		},
		26: {
			'Реанимировать': {
				handler: function (item: any) {
					triggerMp('inventory.item.adrenalin.use.callRemote', JSON.stringify({ itemSqlId: item.sqlId }));
				},
			},
		},
		27: {
			'Вылечиться': {
				handler: function (item: any) {
					triggerMp('callRemote', 'inventory.item.med.use', item.sqlId);
				},
			},
		},
		28: {
			'Скрутить': {
				handler: function (item: any) {
					triggerMp('police.cuffs.callRemote', JSON.stringify({ cuffsSqlId: item.sqlId }));
				},
			},
		},
		29: {
			'Употребить': {
				handler: function (item: any) {
					triggerMp('callRemote', 'inventory.item.drugs.use', item.sqlId);
				},
			},
		},
		30: {
			'Употребить': {
				handler: function (item: any) {
					triggerMp('callRemote', 'inventory.item.drugs.use', item.sqlId);
				},
			},
		},
		31: {
			'Употребить': {
				handler: function (item: any) {
					triggerMp('callRemote', 'inventory.item.drugs.use', item.sqlId);
				},
			},
		},
		32: {
			'Употребить': {
				handler: function (item: any) {
					triggerMp('callRemote', 'inventory.item.drugs.use', item.sqlId);
				},
			},
		},
		37: {
			'Зарядить': {
				handler: function (item: any) {
					triggerMp('callRemote', 'weapons.ammo.fill', item.sqlId);
				},
			},
		},
		38: {
			'Зарядить': {
				handler: function (item: any) {
					triggerMp('callRemote', 'weapons.ammo.fill', item.sqlId);
				},
			},
		},
		39: {
			'Зарядить': {
				handler: function (item: any) {
					triggerMp('callRemote', 'weapons.ammo.fill', item.sqlId);
				},
			},
		},
		40: {
			'Зарядить': {
				handler: function (item: any) {
					triggerMp('callRemote', 'weapons.ammo.fill', item.sqlId);
				},
			},
		},
		54: {
			'Связать': {
				handler: function (item: any) {
					triggerMp('mafia.cuffs.callRemote', JSON.stringify({ cuffsSqlId: item.sqlId }));
				},
			},
		},
		55: {
			'Надеть на голову': {
				handler: function (item: any) {
					triggerMp('mafia.bag.callRemote', JSON.stringify({ bagSqlId: item.sqlId }));
				},
			},
		},
		56: {
			'Заправить': {
				handler: function (item: any) {
					remote('inventory.item.use', { sqlId: item.sqlId, index: 0 });
				},
			},
			'Пополнить': {
				handler: function (item: any) {
					remote('inventory.item.use', { sqlId: item.sqlId, index: 1 });
				},
			},
			'Слить': {
				handler: function (item: any) {
					if (!item.params.litres) return notifyError('Канистра пустая');
					remote('inventory.item.use', { sqlId: item.sqlId, index: 2 });
				},
			},
		},
		139: {
			'Костер': {
				handler: function (item: any) {
					triggerMp('inventory.item.use.callRemote', JSON.stringify({ sqlId: item.sqlId, index: 0 }));
				},
			},
		},
	} as { [id: string]: any };
}

export function createHotkeysList() {
	return {
		4: {
			handler: function (item: any) {
				remote('fib.spy', { itemSqlId: item.sqlId });
			},
		},
		16: {
			handler: function (item: any) {
				triggerMp('callRemote', 'inventory.item.smoke.use', item.sqlId);
			},
		},
		24: {
			handler: function (item: any) {
				triggerMp('callRemote', 'inventory.item.med.use', item.sqlId);
			},
		},
		25: {
			handler: function (item: any) {
				triggerMp('callRemote', 'inventory.item.patch.use', item.sqlId);
			},
		},
		26: {
			handler: function (item: any) {
				triggerMp('inventory.item.adrenalin.use.callRemote', JSON.stringify({ itemSqlId: item.sqlId }));
			},
		},
		27: {
			handler: function (item: any) {
				triggerMp('callRemote', 'inventory.item.med.use', item.sqlId);
			},
		},
		28: {
			handler: function (item: any) {
				triggerMp('police.cuffs.callRemote', JSON.stringify({ cuffsSqlId: item.sqlId }));
			},
		},
		29: {
			handler: function (item: any) {
				triggerMp('callRemote', 'inventory.item.drugs.use', item.sqlId);
			},
		},
		30: {
			handler: function (item: any) {
				triggerMp('callRemote', 'inventory.item.drugs.use', item.sqlId);
			},
		},
		31: {
			handler: function (item: any) {
				triggerMp('callRemote', 'inventory.item.drugs.use', item.sqlId);
			},
		},
		32: {
			handler: function (item: any) {
				triggerMp('callRemote', 'inventory.item.drugs.use', item.sqlId);
			},
		},
		37: {
			handler: function (item: any) {
				triggerMp('callRemote', 'weapons.ammo.fill', item.sqlId);
			},
		},
		38: {
			handler: function (item: any) {
				triggerMp('callRemote', 'weapons.ammo.fill', item.sqlId);
			},
		},
		39: {
			handler: function (item: any) {
				triggerMp('callRemote', 'weapons.ammo.fill', item.sqlId);
			},
		},
		40: {
			handler: function (item: any) {
				triggerMp('callRemote', 'weapons.ammo.fill', item.sqlId);
			},
		},
		54: {
			handler: function (item: any) {
				triggerMp('mafia.cuffs.callRemote', JSON.stringify({ cuffsSqlId: item.sqlId }));
			},
		},
		55: {
			handler: function (item: any) {
				triggerMp('mafia.bag.callRemote', JSON.stringify({ bagSqlId: item.sqlId }));
			},
		},
		56: {
			handler: function (item: any) {
				const data = {
					sqlId: item.sqlId,
					index: item.params.litres ? 0 : 1,
				};
				remote('inventory.item.use', data);
			},
		},
		136: {
			handler: function () {},
		},
		139: {
			handler: function (item: any) {
				triggerMp('inventory.item.use.callRemote', JSON.stringify({ sqlId: item.sqlId, index: 0 }));
			},
		},
	} as { [id: string]: any };
}

export function cloneData<T>(value: T): T {
	return JSON.parse(JSON.stringify(value));
}
