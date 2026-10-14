import { create } from 'zustand';
import {
	cloneData,
	createHotkeysList,
	createItemsMenu,
	defaultBlackList,
	defaultBodyList,
	defaultItemsInfo,
	defaultMergeList,
	drinkList,
	eatList,
	takeSearchList,
	throwableWeaponsList,
	weaponsList,
} from './data';

export interface AccessState {
	placeSqlId: number | null;
	pocketI: number | null;
	deny: boolean;
	targetSqlId: number | null;
	columns: { [index: string]: boolean };
	bodyFocus: number | null;
	hotkeyFocus: number | null;
	binFocus: boolean;
}

export interface InventoryState {
	maxPlayerWeight: number;
	itemsInfo: { [id: string]: any };
	itemsMenu: { [id: string]: any };
	bodyList: { [key: string]: number[] | null };
	hotkeysList: { [id: string]: any };
	blackList: { [key: string]: number[] };
	mergeList: { [key: string]: number[] };
	weaponsList: number[];
	throwableWeaponsList: number[];
	eatList: number[];
	drinkList: number[];
	takeSearchList: number[];
	environment: any[];
	equipment: { [key: string]: any };
	hotkeys: { [key: string]: any };
	hotkeysVersion: number;
	hotkeyFocus: number | null;
	satiety: number;
	thirst: number;
	debug: boolean;
	show: boolean;
	enable: boolean;
	controlEnable: boolean;
	lastShowTime: number;
	itemDesc: { item: any; x: number; y: number };
	itemNotif: { text: string | null; x: number; y: number };
	itemMenu: { item: any; x: number; y: number };
	dragItem: any;
	dragX: number;
	dragY: number;
	access: AccessState;
	spin: boolean;
	handsBlock: boolean;
	lastUseHotkey: number;
	waitUseHotkey: number;
	eatWaitTime: number;
	lastUseEat: number;
	drinkWaitTime: number;
	lastUseDrink: number;
	searchMode: any;
	searchWait: number;
	searchList: any[];
	foundTime: number;
}

export function createAccess(): AccessState {
	return {
		placeSqlId: null,
		pocketI: null,
		deny: false,
		targetSqlId: null,
		columns: {},
		bodyFocus: null,
		hotkeyFocus: null,
		binFocus: false,
	};
}

export const useInventoryStore = create<InventoryState>(() => ({
	maxPlayerWeight: 30,
	itemsInfo: cloneData(defaultItemsInfo),
	itemsMenu: createItemsMenu(),
	bodyList: cloneData(defaultBodyList),
	hotkeysList: createHotkeysList(),
	blackList: cloneData(defaultBlackList),
	mergeList: cloneData(defaultMergeList),
	weaponsList: weaponsList.slice(),
	throwableWeaponsList: throwableWeaponsList.slice(),
	eatList: eatList.slice(),
	drinkList: drinkList.slice(),
	takeSearchList: takeSearchList.slice(),
	environment: [],
	equipment: {},
	hotkeys: {},
	hotkeysVersion: 0,
	hotkeyFocus: null,
	satiety: 0,
	thirst: 0,
	debug: false,
	show: false,
	enable: false,
	controlEnable: true,
	lastShowTime: 0,
	itemDesc: { item: null, x: 0, y: 0 },
	itemNotif: { text: null, x: 0, y: 0 },
	itemMenu: { item: null, x: 0, y: 0 },
	dragItem: null,
	dragX: 0,
	dragY: 0,
	access: createAccess(),
	spin: false,
	handsBlock: false,
	lastUseHotkey: 0,
	waitUseHotkey: 1000,
	eatWaitTime: 30000,
	lastUseEat: 0,
	drinkWaitTime: 30000,
	lastUseDrink: 0,
	searchMode: null,
	searchWait: 5000,
	searchList: [],
	foundTime: 60 * 1000,
}));
