import { create } from 'zustand';
import { EnterMenuData, HouseData } from '@utils/shared/types';
import { useVisibilityStore } from '@utils/visibility/store';

export const useHouseStore = create<HouseData>(() => ({}));

export const useEnterMenuStore = create<EnterMenuData>(() => ({
	isShow: false,
	place: null,
}));

export function showHouse(flag: boolean) {
	useVisibilityStore.setState({ house: flag });
}

export function closeHouse() {
	useVisibilityStore.setState({ house: false });
	useHouseStore.setState({}, true);
	useEnterMenuStore.setState({ isShow: false, place: null });
}

export function loadHouseInfo(info: HouseData) {
	useHouseStore.setState(info, true);
}

export function setLoadingHouse(isLoading: boolean) {
	useHouseStore.setState({ isLoading });
}

export function setAnswerBuyHouse(payload: { answer: any; owner?: string }) {
	const patch: Partial<HouseData> = {
		answerBuy: payload.answer,
		isLoading: false,
	};

	if (payload.answer == 1) {
		patch.owner = payload.owner;
	}

	useHouseStore.setState(patch);
}

export function setAnswerEnterHouse(payload: { answer: any }) {
	useHouseStore.setState({
		answerEnter: payload.answer,
		isLoading: false,
	});
}

export function setHouseFormBlur(isBlur: boolean) {
	useHouseStore.setState({ isBlur });
}

export function showEnterMenuHouse(place: any) {
	useEnterMenuStore.setState({
		isShow: true,
		place,
	});
}

export function closeEnterMenuHouse() {
	useEnterMenuStore.setState({
		isShow: false,
		place: null,
	});

	useHouseStore.setState(state => ({
		isBlur: state.isBlur ? false : state.isBlur,
		answerEnter: null,
		isLoading: false,
	}));
}
