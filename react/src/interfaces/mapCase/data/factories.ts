import {
	bumpMapCase,
	showRedMessage,
	useMapCaseStore,
} from '../store';

export interface MemberRecord {
	id: number;
	num: number;
	name: string;
	rank: number;
}

export interface CallRecord {
	id: number;
	num: number;
	name: string;
	description: string;
	pos?: { x: number; y: number };
}

export interface WantedRecord {
	id: number;
	num: number;
	name: string;
	description: string;
	danger: number;
}

export interface DbRecord {
	id: number;
	num: number;
	name: string;
	phone: string;
	address: string;
}

export interface ProfileRecord {
	id?: number;
	name?: string;
	danger?: number;
	cause?: string;
	gender?: string;
	spouse?: string;
	property?: string;
	phone?: string;
	pass?: string;
	veh?: string;
	law?: number;
	crimes?: number;
	fines?: string;
	[key: string]: any;
}

export interface SortMod {
	mod: string;
	update: (mod: string) => void;
}

export interface InfoRow {
	title: string;
	key: string;
}

export function parsePayload(value: any) {
	if (typeof value == 'string') return JSON.parse(value);
	return value;
}

export function clampRank(rank: number, length: number) {
	const max = length || 0;
	return Math.max(1, Math.min(max, rank));
}

export function createSortMod(initial: string): SortMod {
	return {
		mod: initial,
		update: function (mod: string) {
			this.mod = mod;
			bumpMapCase();
		},
	};
}

export function textSplice(value: string, length: number) {
	if (!value) return '';
	if (value.length < length) return value;
	return value.slice(0, length) + '...';
}

export function prettyMoney(val: number | string) {
	const text = val + '';
	return text.replace(/(\d)(?=(\d{3})+(\D|$))/g, '$1 ');
}

export function sortByKey(list: any[], key: string) {
	const next = list.slice();
	next.sort(function (a, b) {
		if (a[key] > b[key]) return 1;
		if (a[key] < b[key]) return -1;
		return 0;
	});
	return next;
}

function removeById(list: any[], id: any) {
	for (let i = 0; i < list.length; i++) {
		if (list[i].id == id) {
			list.splice(i, 1);
			i--;
		}
	}
}

export function pushFactionWindow(
	menuBody: Record<string, { windows: string[] }>,
	win: string,
) {
	const focus = useMapCaseStore.getState().menuFocus;
	const item = menuBody[focus];
	if (!item) return;
	item.windows.push(win);
	bumpMapCase();
}

export function createMembersData(options: {
	rankHead: string;
	ranks: string[];
	dismissEvent: string;
	lowerEvent: string;
	raiseEvent: string;
}) {
	const data = {
		list: [] as MemberRecord[],
		ranks: [] as string[],
		sortMod: createSortMod('num'),
		rankHead: options.rankHead,
		setRanks: function (ranksList: any) {
			data.ranks = parsePayload(ranksList) || [];
			bumpMapCase();
		},
		setMemberRank: function (id: any, rank: number) {
			const nextRank = clampRank(rank, data.ranks.length);
			for (let i = 0; i < data.list.length; i++) {
				if (data.list[i].id == id) data.list[i].rank = nextRank;
			}
			bumpMapCase();
		},
		add: function (members: any) {
			let rows = parsePayload(members);
			if (!Array.isArray(rows)) rows = [rows];
			for (let i = 0; i < rows.length; i++) {
				removeById(data.list, rows[i].id);
				data.list.push(rows[i]);
			}
			bumpMapCase();
		},
		remove: function (id: any) {
			removeById(data.list, id);
			bumpMapCase();
		},
		dismiss: function (rec: MemberRecord) {
			mp.trigger('callRemote', options.dismissEvent, rec.id);
		},
		lowerRank: function (rec: MemberRecord) {
			if (rec.rank <= 1) {
				showRedMessage(
					'<span>' +
						rec.name +
						'</span><br /> имеет мин. ранг - ' +
						data.ranks[rec.rank - 1],
				);
				return;
			}
			mp.trigger('callRemote', options.lowerEvent, rec.id);
		},
		raiseRank: function (rec: MemberRecord) {
			if (rec.rank >= data.ranks.length) {
				showRedMessage(
					'<span>' +
						rec.name +
						'</span><br /> имеет макс. ранг - ' +
						data.ranks[rec.rank - 1],
				);
				return;
			}
			mp.trigger('callRemote', options.raiseEvent, rec.id);
		},
	};

	data.setRanks(options.ranks);
	return data;
}

export function createCallsData(acceptEvent: string) {
	const data = {
		list: [] as CallRecord[],
		sortMod: createSortMod('num'),
		accept: function (rec: CallRecord) {
			mp.trigger('callRemote', acceptEvent, rec.id);
		},
		add: function (calls: any) {
			let rows = parsePayload(calls);
			if (!Array.isArray(rows)) rows = [rows];
			for (let i = 0; i < rows.length; i++) {
				removeById(data.list, rows[i].id);
				data.list.push(rows[i]);
			}
			bumpMapCase();
		},
		remove: function (id: any) {
			removeById(data.list, id);
			bumpMapCase();
		},
	};
	return data;
}

export function createWantedData() {
	const data = {
		list: [] as WantedRecord[],
		sortMod: createSortMod('num'),
		add: function (wanted: any) {
			let rows = parsePayload(wanted);
			if (!Array.isArray(rows)) rows = [rows];
			for (let i = 0; i < rows.length; i++) {
				removeById(data.list, rows[i].id);
				if (!rows[i].description) rows[i].description = '-';
				data.list.push(rows[i]);
			}
			bumpMapCase();
		},
		remove: function (id: any) {
			removeById(data.list, id);
			bumpMapCase();
		},
	};
	return data;
}

export function createDbResultData(
	menuBody: Record<string, { windows: string[] }>,
	hideLoad: () => void,
) {
	const data = {
		list: [] as DbRecord[],
		sortMod: createSortMod('num'),
		setResult: function (list: any) {
			data.list = parsePayload(list) || [];
			pushFactionWindow(menuBody, 'dbResult');
			hideLoad();
		},
	};
	return data;
}

export const PROFILE_INFO: InfoRow[] = [
	{ title: 'Пол: ', key: 'gender' },
	{ title: 'Семейное положение: ', key: 'spouse' },
	{ title: 'Недвижимость: ', key: 'property' },
	{ title: 'Номер телефона: ', key: 'phone' },
	{ title: 'Номер паспорта: ', key: 'pass' },
	{ title: 'Транспорт: ', key: 'veh' },
	{ title: 'Законопослушность: ', key: 'law' },
	{ title: 'Преступления: ', key: 'crimes' },
	{ title: 'Штрафы: ', key: 'fines' },
];

export function bindField(obj: any, key: string, initial: any) {
	let value = initial;
	Object.defineProperty(obj, key, {
		configurable: true,
		enumerable: true,
		get: function () {
			return value;
		},
		set: function (next) {
			value = next;
			bumpMapCase();
		},
	});
}
