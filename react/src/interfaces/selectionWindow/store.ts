import { create } from 'zustand';

export interface SelectionRecord {
	text: string;
}

export interface SelectionWindowState {
	show: boolean;
	header: string;
	selected: SelectionRecord | null;
	records: SelectionRecord[];
	description: string;
}

const DEFAULT_RECORDS: SelectionRecord[] = [
	{ text: 'Наличными (5 000$)' },
	{ text: 'Картой (124 230$)' },
];

export const useSelectionWindowStore = create<SelectionWindowState>(() => ({
	show: false,
	header: 'Способ оплаты',
	selected: null,
	records: DEFAULT_RECORDS,
	description: 'Выберите способ оплаты товара',
}));

export function setSelectionShow(val: boolean) {
	const show = !!val;
	const prev = useSelectionWindowStore.getState().show;
	if (prev === show) {
		return;
	}
	const patch: Partial<SelectionWindowState> = { show: show };
	if (show) {
		const records = useSelectionWindowStore.getState().records;
		patch.selected = records.length ? records[0] : null;
	}
	useSelectionWindowStore.setState(patch);
}

export function setSelectionField(key: string, val: any) {
	if (key === 'show') {
		setSelectionShow(val);
		return;
	}
	useSelectionWindowStore.setState({ [key]: val } as Partial<SelectionWindowState>);
}

export function selectRecord(record: SelectionRecord) {
	useSelectionWindowStore.setState({ selected: record });
}

export function acceptSelection() {}

export function declineSelection() {
	setSelectionShow(false);
}

export function initSelectionWindowLegacyBridge() {
	if (typeof window === 'undefined') {
		return;
	}

	const win = window as any;
	const target = win.selectionWindow || {};
	const keys = ['show', 'header', 'selected', 'records', 'description'];

	keys.forEach(function (key) {
		Object.defineProperty(target, key, {
			configurable: true,
			enumerable: true,
			get: function () {
				return (useSelectionWindowStore.getState() as any)[key];
			},
			set: function (val: any) {
				setSelectionField(key, val);
			},
		});
	});

	target.select = selectRecord;
	target.accept = acceptSelection;
	target.decline = declineSelection;
	win.selectionWindow = target;
}
