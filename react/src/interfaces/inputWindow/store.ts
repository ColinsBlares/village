import { create } from 'zustand';
import { pushNotification } from '../notifications/store';

export interface InputWindowState {
	show: boolean;
	name: string;
	header: string;
	description: string;
	hint: string;
	inputHint: string;
	leftWord: string;
	rightWord: string;
	value: string;
	horse: number;
	playerId: any;
	vehId: any;
}

const WINDOWS: Record<string, Partial<InputWindowState>> = {
	mafia_power_sell: {
		name: 'mafia_power_sell',
		header: 'Продажа крыши бизнеса',
		hint: 'Введите сумму',
		inputHint: 'Сумма',
		leftWord: 'Продать',
		rightWord: 'Отменить',
	},
	fib_veh_plate: {
		name: 'fib_veh_plate',
		header: 'Смена номера авто',
		hint: 'Введите номер',
		inputHint: 'Номер',
		leftWord: 'Сменить',
		rightWord: 'Отменить',
	},
};

export const useInputWindowStore = create<InputWindowState>(() => ({
	show: false,
	name: '',
	header: '',
	description: '',
	hint: '',
	inputHint: '',
	leftWord: 'Принять',
	rightWord: 'Отменить',
	value: '',
	horse: 0,
	playerId: null,
	vehId: null,
}));

function busyAdd() {
	const busy = (window as any).busy;
	if (busy) {
		busy.add('inputWindow', true, true);
	}
}

function busyRemove() {
	const busy = (window as any).busy;
	if (busy) {
		busy.remove('inputWindow', true);
	}
}

export function setInputShow(val: boolean) {
	const show = !!val;
	const prev = useInputWindowStore.getState().show;
	if (prev === show) {
		return;
	}
	useInputWindowStore.setState({ show: show });
	if (show) {
		busyAdd();
	} else {
		busyRemove();
	}
}

export function setInputField(key: string, val: any) {
	if (key === 'show') {
		setInputShow(val);
		return;
	}
	useInputWindowStore.setState({ [key]: val } as Partial<InputWindowState>);
}

export function showInputByName(name: string) {
	const win = WINDOWS[name];
	if (!win) {
		return;
	}
	useInputWindowStore.setState(win);
	setInputShow(true);
}

export function acceptInput() {
	const state = useInputWindowStore.getState();
	const name = state.name;
	const value = state.value;

	if (name == 'money_giving') {
		mp.trigger('interaction.money.accept', value);
	}
	if (name == 'carsell_id') {
		mp.trigger('vehicles.sell.id', value);
	}
	if (name == 'carsell_price') {
		mp.trigger('vehicles.sell.price', value);
	}
	if (name == 'fuelstations_litres') {
		mp.trigger('fuelstations.fill.litres.send', value);
	}
	if (name == 'mafia_power_sell') {
		if (isNaN(value as any)) {
			pushNotification('error', 'Требуется число');
			return;
		}
		if ((value as any) <= 0) {
			pushNotification('error', 'Требуется положительное число');
			return;
		}
		const data = {
			recId: state.playerId,
			sum: parseInt(value, 10),
		};
		setInputShow(false);
		mp.trigger('callRemote', 'mafia.power.sell', JSON.stringify(data));
	}
	if (name == 'fib_veh_plate') {
		if (!value.length) {
			pushNotification('error', 'Введите номер');
			return;
		}
		if (value.length > 8) {
			pushNotification('error', 'Не более 8 символов');
			return;
		}
		const data = {
			vehId: state.vehId,
			plate: value,
		};
		setInputShow(false);
		mp.trigger('callRemote', 'fib.vehicle.plate.set', JSON.stringify(data));
	}
	if (name == 'dice') {
		const parsed = parseInt(value, 10);
		if (isNaN(parsed)) {
			pushNotification('error', 'Требуется число');
			return;
		}
		if (parsed <= 0 || parsed > 1000000) {
			pushNotification('error', 'Некорректное число');
			return;
		}
		const data = {
			targetId: state.playerId,
			amount: parsed,
		};
		setInputShow(false);
		mp.trigger('callRemote', 'casino.dice.offer.send', JSON.stringify(data));
	}
	if (name == 'horse_bet') {
		const parsed = parseInt(value, 10);
		if (isNaN(parsed)) {
			pushNotification('error', 'Требуется число');
			return;
		}
		if (parsed < 100 || parsed > 10000) {
			pushNotification('error', 'Ставка $100 - $10 000');
			return;
		}
		const data = {
			horse: state.horse,
			amount: parsed,
		};
		setInputShow(false);
		mp.trigger('callRemote', 'casino.horse.bet', JSON.stringify(data));
	}
}

export function declineInput() {
	const name = useInputWindowStore.getState().name;
	if (name == 'money_giving') {
		mp.trigger('interaction.money.decline');
	}
	if (name == 'carsell_id') {
		mp.trigger('vehicles.sell.close');
	}
	if (name == 'carsell_price') {
		mp.trigger('vehicles.sell.close');
	}
	if (name == 'fuelstations_litres') {
		mp.trigger('fuelstations.fill.litres.close');
	}
	if (name == 'mafia_power_sell') {
		setInputShow(false);
	}
	if (name == 'fib_veh_plate') {
		setInputShow(false);
	}
	if (name == 'dice') {
		setInputShow(false);
	}
	if (name == 'horse_bet') {
		setInputShow(false);
	}
}

const BRIDGE_KEYS = [
	'show',
	'name',
	'header',
	'description',
	'hint',
	'inputHint',
	'leftWord',
	'rightWord',
	'value',
	'horse',
	'playerId',
	'vehId',
];

export function initInputWindowLegacyBridge() {
	if (typeof window === 'undefined') {
		return;
	}

	const win = window as any;
	const target = win.inputWindow || {};
	const saved: Record<string, any> = {};

	BRIDGE_KEYS.forEach(function (key) {
		const desc = Object.getOwnPropertyDescriptor(target, key);
		if (desc && !desc.get && 'value' in desc) {
			saved[key] = desc.value;
		}
		Object.defineProperty(target, key, {
			configurable: true,
			enumerable: true,
			get: function () {
				return (useInputWindowStore.getState() as any)[key];
			},
			set: function (val: any) {
				setInputField(key, val);
			},
		});
	});

	target.showByName = showInputByName;
	target.accept = acceptInput;
	target.decline = declineInput;
	win.inputWindow = target;

	Object.keys(saved).forEach(function (key) {
		if (key === 'show') {
			if (saved[key]) {
				setInputField(key, saved[key]);
			}
			return;
		}
		if (saved[key] !== undefined && saved[key] !== '' && saved[key] !== null) {
			setInputField(key, saved[key]);
		}
	});
}
