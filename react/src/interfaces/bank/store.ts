import { create } from 'zustand';
import { BankData } from '@utils/shared/types';
import { useVisibilityStore } from '@utils/visibility/store';
import {
	applyPhoneBusinessPayment,
	applyPhoneCashbox,
	applyPhoneHousePayment,
} from '../phone/phoneState';
import { resetBankPages } from './pagesStore';

export const useBankStore = create<BankData>(() => ({
	isLoading: true,
}));

export function showBank(info: BankData) {
	useVisibilityStore.setState({ bank: true });
	useBankStore.setState(info, true);
}

export function updateBank(info: BankData) {
	useBankStore.setState(info);
}

export function loadBankInfo(info: BankData) {
	useBankStore.setState(info, true);
}

export function closeBank() {
	useVisibilityStore.setState({ bank: false });
	useBankStore.setState({}, true);
	resetBankPages();
}

export function setLoadingBank(isLoading: boolean) {
	useBankStore.setState({ isLoading });
}

export function pushBank(_money: number) {
	const { cash, money } = useBankStore.getState();
	useBankStore.setState({ cash, money });
}

export function pushPhoneBank(_money: number) {
	const { money, phoneMoney } = useBankStore.getState();
	useBankStore.setState({ money, phoneMoney });
}

export function popBank(_money: number) {
	const { cash, money } = useBankStore.getState();
	useBankStore.setState({ cash, money });
}

export function transferBank(_money: number) {
	const { money } = useBankStore.getState();
	useBankStore.setState({ money });
}

export function payHouseBank(name: any, days: number, _money: number) {
	const bank = useBankStore.getState();
	useBankStore.setState({
		money: bank.money,
		houses: (bank.houses || []).map((house, index) =>
			index === 0 ? { ...house, days: house.days + days } : house,
		),
	});
	applyPhoneHousePayment(name, days);
}

export function payBusinessBank(id: any, days: number, _money: number) {
	const bank = useBankStore.getState();
	useBankStore.setState({
		money: bank.money,
		biz: (bank.biz || []).map((biz, index) =>
			index === 0 ? { ...biz, days: biz.days + days } : biz,
		),
	});
	applyPhoneBusinessPayment(id, days);
}

export function pushCashBoxBank(id: any, money: number) {
	const bank = useBankStore.getState();
	useBankStore.setState({ money: bank.money });
	applyPhoneCashbox(id, money, 'push');
}

export function popCashBoxBank(id: any, money: number) {
	const bank = useBankStore.getState();
	useBankStore.setState({ money: bank.money });
	applyPhoneCashbox(id, money, 'pop');
}

export function setArgsBank(args: any) {
	useBankStore.setState({ args });
}

export function setAnswerBank(payload: { answer: any; type: any }) {
	useBankStore.setState({
		answer: payload.answer,
		type: payload.type,
		isLoading: false,
	});
}

export function setAskAnswerBank(askAnswer: any) {
	useBankStore.setState({
		isLoading: false,
		askAnswer,
	});
}
