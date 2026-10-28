import { create } from 'zustand';

export interface TradeItem {
	sqlId: number;
	itemId: number;
	params: Record<string, any>;
}

interface TradeState {
	show: boolean;
	partnerName: string;
	cash: number;
	items: TradeItem[];
	offerItems: TradeItem[];
	offerCash: number;
	ready: boolean;
	confirm: boolean;
	theirItems: TradeItem[];
	theirCash: number;
	theirReady: boolean;
	theirConfirm: boolean;
	cashDraft: string;
}

const empty: TradeState = {
	show: false,
	partnerName: '',
	cash: 0,
	items: [],
	offerItems: [],
	offerCash: 0,
	ready: false,
	confirm: false,
	theirItems: [],
	theirCash: 0,
	theirReady: false,
	theirConfirm: false,
	cashDraft: '0',
};

export const useTradeStore = create<TradeState>(() => empty);

let cashFocus = false;
let listening = false;

function asItems(list: any): TradeItem[] {
	if (!Array.isArray(list)) return [];
	const items: TradeItem[] = [];
	for (let i = 0; i < list.length; i++) {
		const item = list[i];
		if (!item) continue;
		const params = item.params && typeof item.params === 'object' ? Object.assign({}, item.params) : {};
		if (item.count && !params.count) params.count = item.count;
		items.push({
			sqlId: Number(item.sqlId),
			itemId: Number(item.itemId),
			params: params,
		});
	}
	return items;
}

function draftSum() {
	const sum = parseInt(useTradeStore.getState().cashDraft || '0', 10);
	return isNaN(sum) ? 0 : sum;
}

export function findTradeItem(sqlId: any) {
	const trade = useTradeStore.getState();
	if (!trade.show || sqlId == null) return null;
	const lists = [trade.offerItems, trade.theirItems];
	for (let listIndex = 0; listIndex < lists.length; listIndex++) {
		const list = lists[listIndex];
		for (let i = 0; i < list.length; i++) {
			if (list[i].sqlId == sqlId) return list[i];
		}
	}
	return null;
}

export function applyTrade(payload: any) {
	let data = payload;
	if (typeof data === 'string') data = JSON.parse(data);
	const draft = cashFocus ? useTradeStore.getState().cashDraft : String(Number(data.offerCash) || 0);
	useTradeStore.setState({
		show: true,
		partnerName: data.partnerName ? String(data.partnerName) : '',
		cash: Number(data.cash) || 0,
		items: asItems(data.items),
		offerItems: asItems(data.offerItems),
		offerCash: Number(data.offerCash) || 0,
		ready: !!data.ready,
		confirm: !!data.confirm,
		theirItems: asItems(data.theirItems),
		theirCash: Number(data.theirCash) || 0,
		theirReady: !!data.theirReady,
		theirConfirm: !!data.theirConfirm,
		cashDraft: draft,
	});
	const inventory = (window as any).inventory;
	if (inventory && !inventory.show) inventory.show = true;
}

let closingInventory = false;

export function closeTrade() {
	const was = useTradeStore.getState().show;
	cashFocus = false;
	useTradeStore.setState({
		show: false,
		partnerName: '',
		cash: 0,
		items: [],
		offerItems: [],
		offerCash: 0,
		ready: false,
		confirm: false,
		theirItems: [],
		theirCash: 0,
		theirReady: false,
		theirConfirm: false,
		cashDraft: '0',
	});
	if (!was || closingInventory) return;
	closingInventory = true;
	const inventory = (window as any).inventory;
	if (inventory && inventory.show) inventory.show = false;
	closingInventory = false;
}

export function cancelTrade() {
	if (!useTradeStore.getState().show) return;
	mp.trigger('trade.cancel');
	closeTrade();
}

export function localAdd(item: any) {
	const current = useTradeStore.getState();
	if (!item || current.offerItems.some(function (entry) { return entry.sqlId == item.sqlId; })) return;
	useTradeStore.setState({
		offerItems: current.offerItems.concat([{
			sqlId: item.sqlId,
			itemId: item.itemId,
			params: item.params || {},
		}]),
		ready: false,
		confirm: false,
		theirConfirm: false,
	});
}

export function localRemove(sqlId: number) {
	const current = useTradeStore.getState();
	useTradeStore.setState({
		offerItems: current.offerItems.filter(function (entry) { return entry.sqlId != sqlId; }),
		ready: false,
		confirm: false,
		theirConfirm: false,
	});
}

export function setCashDraft(value: string) {
	const draft = String(value || '').replace(/\D/g, '').slice(0, 8);
	useTradeStore.setState({ cashDraft: draft });
}

export function setCashFocus(focused: boolean) {
	cashFocus = focused;
	if (!focused) flushCash();
}

export function flushCash() {
	const sum = draftSum();
	if (sum === useTradeStore.getState().offerCash) return;
	mp.trigger('trade.cash', sum);
}

export function addTradeItem(sqlId: number) {
	mp.trigger('trade.item.add', sqlId);
}

export function removeTradeItem(sqlId: number) {
	mp.trigger('trade.item.remove', sqlId);
}

export function toggleReady() {
	const next = useTradeStore.getState().ready ? 0 : 1;
	mp.trigger('trade.ready', draftSum(), next);
}

export function confirmTrade() {
	mp.trigger('trade.confirm', draftSum());
}

function onKeyUp(event: KeyboardEvent) {
	if (event.keyCode !== 27) return;
	if (!useTradeStore.getState().show) return;
	const busy = (window as any).busy;
	if (busy && busy.includes && busy.includes(['chat', 'terminal'])) return;
	cancelTrade();
}

export function initTradeLegacyBridge() {
	if (typeof window === 'undefined') return;
	const win = window as any;
	const target = win.trade || {};
	target.apply = applyTrade;
	target.close = closeTrade;
	win.trade = target;
	if (listening) return;
	listening = true;
	window.addEventListener('keyup', onKeyUp);
}
