import {
	addEnvironmentItem,
	addEnvironmentPlace,
	addItem,
	bindHotkey,
	clearHands,
	clearHotkeys,
	deleteEnvironmentItem,
	deleteEnvironmentPlace,
	deleteItem,
	getEnvironmentItem,
	getEnvironmentPlace,
	getItem,
	getItemByParams,
	getItemInfoHash,
	getItemName,
	getItemsByItemId,
	getItemsInfoHashes,
	getPrettyParams,
	initItems,
	initSearchItems,
	moveItemToBody,
	onUseHandsItem,
	setAmmo,
	setArmour,
	setBlackList,
	setBodyList,
	setEnable,
	setEnvironmentItemParam,
	setEnvironmentItemSqlId,
	setFoundItem,
	setItemInfo,
	setItemParam,
	setItemSqlId,
	setItemsInfo,
	setMergeList,
	setSearchMode,
	setShow,
	stopSearchMode,
	unbindHotkey,
	urlItemImg,
} from './model';
import { useInventoryStore } from './store';

const plainFields = [
	'maxPlayerWeight',
	'controlEnable',
	'debug',
	'spin',
	'handsBlock',
	'satiety',
	'thirst',
	'lastShowTime',
	'lastUseHotkey',
	'waitUseHotkey',
	'eatWaitTime',
	'lastUseEat',
	'drinkWaitTime',
	'lastUseDrink',
	'searchWait',
	'foundTime',
];

function bindValue(target: any, key: string, get: () => any, set: (val: any) => void) {
	Object.defineProperty(target, key, {
		configurable: true,
		enumerable: true,
		get: get,
		set: set,
	});
}

export function initInventoryLegacyBridge() {
	if (typeof window === 'undefined') return;
	const win = window as any;
	if (!win.inventory) win.inventory = {};
	const legacy = win.inventory;
	if (!legacy.hotkeys || typeof legacy.hotkeys !== 'object') legacy.hotkeys = {};
	useInventoryStore.setState({ hotkeys: legacy.hotkeys });

	bindValue(legacy, 'show', function () {
		return useInventoryStore.getState().show;
	}, function (val) {
		setShow(!!val);
	});
	bindValue(legacy, 'enable', function () {
		return useInventoryStore.getState().enable;
	}, function (val) {
		setEnable(!!val);
	});
	bindValue(legacy, 'searchMode', function () {
		return useInventoryStore.getState().searchMode;
	}, function (val) {
		setSearchMode(val);
	});
	bindValue(legacy, 'hotkeys', function () {
		return useInventoryStore.getState().hotkeys;
	}, function (val) {
		const hotkeys = useInventoryStore.getState().hotkeys;
		for (const key in hotkeys) delete hotkeys[key];
		if (val && typeof val === 'object') {
			for (const key in val) hotkeys[key] = val[key];
		}
		useInventoryStore.setState({ hotkeysVersion: useInventoryStore.getState().hotkeysVersion + 1 });
	});

	for (let i = 0; i < plainFields.length; i++) {
		const key = plainFields[i];
		bindValue(legacy, key, function () {
			return (useInventoryStore.getState() as any)[key];
		}, function (val) {
			useInventoryStore.setState({ [key]: val } as any);
		});
	}

	const objectFields = ['itemsInfo', 'itemsMenu', 'bodyList', 'hotkeysList', 'blackList', 'mergeList', 'weaponsList', 'throwableWeaponsList', 'eatList', 'drinkList', 'takeSearchList', 'environment', 'equipment', 'itemDesc', 'itemNotif', 'itemMenu', 'searchList'];
	for (let i = 0; i < objectFields.length; i++) {
		const key = objectFields[i];
		bindValue(legacy, key, function () {
			return (useInventoryStore.getState() as any)[key];
		}, function (val) {
			useInventoryStore.setState({ [key]: val } as any);
		});
	}

	const methods: { [name: string]: any } = {
		setItemsInfo: setItemsInfo,
		setItemInfo: setItemInfo,
		setMergeList: setMergeList,
		setBlackList: setBlackList,
		setBodyList: setBodyList,
		getItem: getItem,
		addItem: addItem,
		initItems: initItems,
		initSearchItems: initSearchItems,
		stopSearchMode: stopSearchMode,
		deleteItem: deleteItem,
		setItemSqlId: setItemSqlId,
		setItemParam: setItemParam,
		setFoundItem: setFoundItem,
		addEnvironmentPlace: addEnvironmentPlace,
		deleteEnvironmentPlace: deleteEnvironmentPlace,
		getEnvironmentPlace: getEnvironmentPlace,
		getEnvironmentItem: getEnvironmentItem,
		addEnvironmentItem: addEnvironmentItem,
		deleteEnvironmentItem: deleteEnvironmentItem,
		setEnvironmentItemSqlId: setEnvironmentItemSqlId,
		setEnvironmentItemParam: setEnvironmentItemParam,
		setArmour: setArmour,
		setAmmo: setAmmo,
		getItemName: getItemName,
		bindHotkey: bindHotkey,
		unbindHotkey: unbindHotkey,
		clearHotkeys: clearHotkeys,
		onUseHandsItem: onUseHandsItem,
		clearHands: clearHands,
		moveItemToBody: moveItemToBody,
		urlItemImg: urlItemImg,
		getPrettyParams: getPrettyParams,
		getItemsByItemId: getItemsByItemId,
		getItemByParams: getItemByParams,
		getItemInfoHash: getItemInfoHash,
		getItemsInfoHashes: getItemsInfoHashes,
		notify: function (message: string) {
			const notifications = (window as any).notifications;
			if (notifications && notifications.push) notifications.push('info', message, 'Инвентарь');
		},
	};

	const names = Object.keys(methods);
	for (let i = 0; i < names.length; i++) legacy[names[i]] = methods[names[i]];
	win.inventory = legacy;
}
