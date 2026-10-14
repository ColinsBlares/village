import { create } from 'zustand';

export interface InfoParam {
	key: string;
	value: number;
	isProgress: boolean;
}

export interface InfoTableData {
	header: string;
	params: InfoParam[];
}

export interface InfoTableState {
	show: boolean;
	name: string;
	tables: Record<string, InfoTableData>;
}

const CHARACTER_SKILLS: InfoTableData = {
	header: 'Навыки',
	params: [
		{ key: 'Рыбак', value: 0, isProgress: true },
		{ key: 'Фермер', value: 0, isProgress: true },
		{ key: 'Водитель автобуса', value: 0, isProgress: true },
		{ key: 'Таксист', value: 0, isProgress: true },
		{ key: 'Перевозчик грузов', value: 0, isProgress: true },
	],
};

export const useInfoTableStore = create<InfoTableState>(() => ({
	show: false,
	name: 'character_skills',
	tables: {
		character_skills: CHARACTER_SKILLS,
	},
}));

export function prettyInfoValue(param: InfoParam) {
	if (param.isProgress) {
		return String(param.value) + '%';
	}
	return param.value;
}

export function setInfoTableValues(name: string, values: any) {
	if (typeof values === 'string') {
		values = JSON.parse(values);
	}
	const state = useInfoTableStore.getState();
	const table = state.tables[name];
	if (!table) {
		return;
	}
	const params = table.params.map(function (param, index) {
		if (!values || index >= values.length) {
			return param;
		}
		return {
			key: param.key,
			value: values[index],
			isProgress: param.isProgress,
		};
	});
	const tables = Object.assign({}, state.tables);
	tables[name] = {
		header: table.header,
		params: params,
	};
	useInfoTableStore.setState({ tables: tables });
}

export function showInfoTableByName(name: string, values: any) {
	if (!useInfoTableStore.getState().tables[name]) {
		return;
	}
	setInfoTableValues(name, values);
	useInfoTableStore.setState({ name: name, show: true });
}

export function setInfoTableShow(val: boolean) {
	useInfoTableStore.setState({ show: !!val });
}

export function initInfoTableLegacyBridge() {
	if (typeof window === 'undefined') {
		return;
	}

	const win = window as any;
	const target = win.infoTable || {};

	Object.defineProperty(target, 'show', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useInfoTableStore.getState().show;
		},
		set: function (val: boolean) {
			setInfoTableShow(val);
		},
	});

	Object.defineProperty(target, 'name', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useInfoTableStore.getState().name;
		},
		set: function (val: string) {
			useInfoTableStore.setState({ name: val });
		},
	});

	Object.defineProperty(target, 'tables', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useInfoTableStore.getState().tables;
		},
	});

	target.setValues = setInfoTableValues;
	target.showByName = showInfoTableByName;
	target.prettyValue = prettyInfoValue;
	win.infoTable = target;
}
