import { create } from 'zustand';
import { PhoneInfo } from '@utils/shared/types';

export const usePhoneStore = create<PhoneInfo>(() => ({}));

export function applyPhoneHousePayment(name: any, days: number) {
	usePhoneStore.setState(state => ({
		houses: (state.houses || []).map(house =>
			house.name === name ? { ...house, days: house.days + days } : house,
		),
	}));
}

export function applyPhoneBusinessPayment(id: any, days: number) {
	usePhoneStore.setState(state => ({
		biz: (state.biz || []).map(biz =>
			biz.id === id ? { ...biz, days: biz.days + days } : biz,
		),
	}));
}

export function applyPhoneCashbox(
	id: any,
	money: number,
	direction: 'push' | 'pop',
) {
	usePhoneStore.setState(state => ({
		biz: (state.biz || []).map(biz => {
			if (biz.id !== id) {
				return biz;
			}

			const cashBox =
				direction === 'push'
					? (biz.cashBox || 0) + money
					: (biz.cashBox || 0) - money;

			return { ...biz, cashBox };
		}),
	}));
}
