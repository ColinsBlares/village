import { create } from 'zustand';
import { ShopItem } from './catalog';

interface SupermarketState {
	show: boolean;
	title: string;
	headerImg: string;
	screen: string;
	categoryId: string;
	number: string;
	editing: boolean;
	loader: boolean;
	notification: string | null;
	prices: Record<string, number>;
}

export const useSupermarketStore = create<SupermarketState>(() => ({
	show: false,
	title: 'Супермаркет',
	headerImg: '',
	screen: 'goods',
	categoryId: 'all',
	number: '',
	editing: false,
	loader: false,
	notification: null,
	prices: {},
}));

let synced = false;
let notifTimer: number | null = null;

function busyAdd() {
	const busy = (window as any).busy;
	if (busy && busy.add) busy.add('supermarket', true, true);
}

function busyRemove() {
	const busy = (window as any).busy;
	if (busy && busy.remove) busy.remove('supermarket', true);
}

export function setSupermarketShow(val: boolean) {
	const show = !!val;
	const prev = useSupermarketStore.getState().show;
	if (prev === show) return;
	useSupermarketStore.setState({ show: show });
	if (show) busyAdd();
	else busyRemove();
}

export function openShop(payload: any) {
	let data = payload;
	if (typeof data === 'string') data = JSON.parse(data);
	const was = useSupermarketStore.getState().show;
	useSupermarketStore.setState({
		title: data.title || 'Супермаркет',
		headerImg: data.headerImg || '',
		prices: data.prices || {},
		screen: 'goods',
		categoryId: 'all',
		number: '',
		editing: false,
		loader: false,
		notification: null,
		show: true,
	});
	if (!was) busyAdd();
}

export function closeShop(notify?: boolean) {
	if (!useSupermarketStore.getState().show) return;
	useSupermarketStore.setState({
		show: false,
		loader: false,
		editing: false,
	});
	busyRemove();
	if (notify !== false) mp.trigger('supermarket.menu.closed');
}

export function notifyShop(text: string) {
	if (notifTimer !== null) window.clearTimeout(notifTimer);
	useSupermarketStore.setState({ notification: text, loader: false });
	notifTimer = window.setTimeout(function () {
		useSupermarketStore.setState({ notification: null });
		notifTimer = null;
	}, 6000);
}

export function pickCategory(id: string) {
	if (useSupermarketStore.getState().loader) return;
	useSupermarketStore.setState({ categoryId: id, screen: 'goods' });
}

export function setShopNumber(value: string) {
	useSupermarketStore.setState({ number: value });
}

export function setShopEditing(editing: boolean) {
	useSupermarketStore.setState({ editing: editing });
}

export function buyItem(item: ShopItem) {
	if (useSupermarketStore.getState().loader) return;
	if (item.action === 'number') {
		useSupermarketStore.setState({ screen: 'number', number: '' });
		return;
	}
	useSupermarketStore.setState({ loader: true });
	if (item.action === 'phone') {
		mp.trigger('supermarket.phone.buy');
		return;
	}
	mp.trigger('callRemote', 'supermarket.products.buy', item.product);
}

export function changeNumber() {
	if (useSupermarketStore.getState().loader) return;
	useSupermarketStore.setState({ loader: true });
	mp.trigger('supermarket.number.change', useSupermarketStore.getState().number);
}

export function shopBack() {
	if (useSupermarketStore.getState().loader) return;
	if (useSupermarketStore.getState().screen === 'number') {
		useSupermarketStore.setState({ screen: 'goods', editing: false });
		return;
	}
	closeShop();
}

export function initSupermarketLegacyBridge() {
	if (typeof window === 'undefined' || synced) return;
	synced = true;

	const win = window as any;
	const target = win.supermarket || {};

	Object.defineProperty(target, 'show', {
		configurable: true,
		enumerable: true,
		get: function () {
			return useSupermarketStore.getState().show;
		},
		set: function (val: boolean) {
			setSupermarketShow(!!val);
		},
	});

	target.open = openShop;
	target.close = closeShop;
	target.notify = notifyShop;
	win.supermarket = target;

	window.addEventListener('keyup', function (e) {
		const state = useSupermarketStore.getState();
		if (!state.show || state.loader) return;
		const busy = (window as any).busy;
		if (busy && busy.includes && busy.includes(['inventory', 'chat', 'terminal', 'phone'])) return;
		if (state.editing && e.keyCode === 8) return;
		if (e.keyCode === 27) shopBack();
	});
}
