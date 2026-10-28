import { create } from 'zustand';
import { gameTrigger } from '../game';
import { taxiClasses } from './data';

export type TaxiScreen = 'home' | 'search' | 'found' | 'fail';

export const taxiNoDrivers = 'К сожалению сейчас по данному тарифу нет таксистов';
export const taxiUserCancel = 'Вы отменили заказ';

export interface TaxiOrder {
	name: string;
	model: string;
	number: string;
	isReady?: boolean;
	isInTaxi?: boolean;
	isSelect?: boolean;
	isWay?: boolean;
	area?: string;
	street?: string;
	price?: number;
}

interface TaxiState {
	screen: TaxiScreen;
	classId: string;
	location: { area: string; street: string } | null;
	order: TaxiOrder | null;
	reason: string;
}

export const useTaxiStore = create<TaxiState>(() => ({
	screen: 'home',
	classId: 'economy',
	location: null,
	order: null,
	reason: '',
}));

let dropped = false;

export function pickClass(id: string) {
	useTaxiStore.setState({ classId: id });
}

export function loadTaxiLocation(area: string, street: string) {
	useTaxiStore.setState({ location: { area: area, street: street } });
}

export function searchTaxi() {
	if (useTaxiStore.getState().screen === 'search') {
		return;
	}
	dropped = false;
	useTaxiStore.setState({ screen: 'search', order: null, reason: '' });
	gameTrigger('taxi.client.app.search');
}

export function showTaxiSearch() {
	dropped = false;
	useTaxiStore.setState({ screen: 'search', order: null, reason: '' });
}

export function takeTaxiOrder(order: TaxiOrder) {
	dropped = false;
	useTaxiStore.setState({
		screen: 'found',
		order: order,
		reason: '',
	});
}

export function markTaxiReady() {
	useTaxiStore.setState(state => ({
		screen: 'found',
		order: state.order ? { ...state.order, isReady: true } : { name: '', model: '', number: '', isReady: true },
	}));
}

export function markTaxiBoarded() {
	useTaxiStore.setState(state => ({
		screen: 'found',
		order: state.order ? { ...state.order, isInTaxi: true, isReady: true } : state.order,
	}));
}

export function setTaxiDestination(area: string, street: string, price: number) {
	useTaxiStore.setState(state => ({
		screen: 'found',
		order: state.order
			? { ...state.order, area: area, street: street, price: price, isSelect: true, isWay: false, isInTaxi: true }
			: state.order,
	}));
}

export function confirmTaxi() {
	const state = useTaxiStore.getState();
	if (!state.order || !state.order.isSelect) {
		return;
	}
	useTaxiStore.setState({
		order: { ...state.order, isWay: true },
	});
	gameTrigger('taxi.client.app.confirm');
}

export function failTaxi(reason?: string) {
	dropped = false;
	useTaxiStore.setState({
		screen: 'fail',
		reason: reason || taxiNoDrivers,
	});
}

export function resetTaxi(reason?: string) {
	if (dropped) {
		dropped = false;
		return;
	}
	useTaxiStore.setState({
		screen: 'fail',
		order: null,
		reason: reason || 'Заказ отменен',
	});
}

export function cancelTaxi() {
	useTaxiStore.setState({ screen: 'fail', reason: taxiUserCancel });
	gameTrigger('taxi.client.app.cancel');
}

export function closeTaxiResult() {
	dropped = false;
	useTaxiStore.setState({ screen: 'home', order: null, reason: '' });
}

export function selectedCar() {
	const id = useTaxiStore.getState().classId;
	const found = taxiClasses.find(function (item) {
		return item.id === id;
	});
	return found || taxiClasses[0];
}
