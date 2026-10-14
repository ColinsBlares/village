import { create } from 'zustand';
import { bindCefObject, prettyMoney } from '@utils/cefBridge';

export interface CharacterData {
	name: string;
	cash: number;
	bank: number;
	status: string;
	hours: number;
	faction: string;
	job: string;
	house: string;
	biz: string;
	warns: number;
}

export interface CharacterInfoState {
	show: boolean;
	coins: number;
	showAddCoins: boolean;
	characters: CharacterData[];
	slots: number;
	limitSlots: number;
	i: number;
	slotPrice: number;
	slotHours: number | string;
}

const INFO_KEYS = ['show', 'coins', 'showAddCoins', 'characters', 'slots', 'limitSlots', 'i'];

export const useCharacterInfoStore = create<CharacterInfoState>(() => ({
	show: false,
	coins: 0,
	showAddCoins: false,
	characters: [],
	slots: 1,
	limitSlots: 3,
	i: 0,
	slotPrice: 500,
	slotHours: 'N',
}));

export function isCreateVisible(state: CharacterInfoState): boolean {
	const length = state.characters.length;
	const canNew = state.slots > length;
	return !!(canNew && state.show && (state.i >= length || length === 0));
}

export function isAddSlotVisible(state: CharacterInfoState): boolean {
	return !isCreateVisible(state) && state.i > state.characters.length - 1 && !!state.show;
}

export function pretty(val: number | string): string {
	return prettyMoney(val);
}

export function addCharacter(character: any) {
	let next = character;
	if (typeof next === 'string') {
		next = JSON.parse(next);
	}
	const characters = useCharacterInfoStore.getState().characters.slice();
	characters.push(next);
	useCharacterInfoStore.setState({ characters: characters });
}

export function addCoins() {
	console.log('characterInfo.addCoins()');
}

function loaderVisible(): boolean {
	const loader = (window as any).loader;
	return !!(loader && loader.show);
}

function showLoader() {
	const loader = (window as any).loader;
	if (loader) {
		loader.show = true;
	}
}

export function chooseLeft() {
	if (loaderVisible()) {
		return;
	}
	const state = useCharacterInfoStore.getState();
	if (state.i <= 0) {
		return;
	}
	mp.trigger('characterInit.chooseLeft');
}

export function chooseCharacter() {
	if (loaderVisible()) {
		return;
	}
	const state = useCharacterInfoStore.getState();
	if (state.i > state.characters.length - 1) {
		return;
	}
	showLoader();
	mp.trigger('characterInit.choose');
}

export function chooseRight() {
	if (loaderVisible()) {
		return;
	}
	const state = useCharacterInfoStore.getState();
	if (state.i == state.slots || state.i == state.limitSlots - 1 || state.i == state.characters.length) {
		return;
	}
	mp.trigger('characterInit.chooseRight');
}

export function onClickCreateCharacter() {
	if (loaderVisible()) {
		return;
	}
	showLoader();
	mp.trigger('characterInit.choose');
}

export function addSlot() {
	showLoader();
	mp.trigger('characterInit.slot.buy');
}

export function initCharacterInfoLegacyBridge() {
	bindCefObject(
		'characterInfo',
		INFO_KEYS,
		function (key) {
			return (useCharacterInfoStore.getState() as any)[key];
		},
		function (key, value) {
			if (key === 'show') {
				useCharacterInfoStore.setState({ show: !!value });
				return;
			}
			if (key === 'characters') {
				useCharacterInfoStore.setState({
					characters: Array.isArray(value) ? value.slice() : [],
				});
				return;
			}
			useCharacterInfoStore.setState({ [key]: value } as Partial<CharacterInfoState>);
		},
		{
			addCharacter: addCharacter,
			addCoins: addCoins,
			pretty: pretty,
		},
	);

	bindCefObject(
		'characterSelector',
		['show'],
		function () {
			const state = useCharacterInfoStore.getState();
			return !!(state.show && state.characters.length);
		},
		function () {},
		{
			left: chooseLeft,
			enter: chooseCharacter,
			right: chooseRight,
		},
	);

	bindCefObject(
		'createCharacter',
		['show'],
		function () {
			return isCreateVisible(useCharacterInfoStore.getState());
		},
		function () {},
		{
			onClickCreateCharacter: onClickCreateCharacter,
		},
	);

	bindCefObject(
		'characterAddSlot',
		['show', 'price', 'hours', 'oneSlot'],
		function (key) {
			const state = useCharacterInfoStore.getState();
			if (key === 'show') {
				return isAddSlotVisible(state);
			}
			if (key === 'price') {
				return state.slotPrice;
			}
			if (key === 'hours') {
				return state.slotHours;
			}
			if (key === 'oneSlot') {
				return state.slots == 1;
			}
			return undefined;
		},
		function (key, value) {
			if (key === 'price') {
				useCharacterInfoStore.setState({ slotPrice: value });
			} else if (key === 'hours') {
				useCharacterInfoStore.setState({ slotHours: value });
			}
		},
		{
			addSlot: addSlot,
		},
	);
}
