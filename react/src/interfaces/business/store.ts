import { create } from 'zustand';
import { BusinessData } from '@utils/shared/types';
import { useVisibilityStore } from '@utils/visibility/store';

export const useBusinessStore = create<BusinessData>(() => ({}));

export function showBusiness(flag: boolean) {
	useVisibilityStore.setState({ business: flag });
}

export function closeBusiness() {
	useVisibilityStore.setState({ business: false });
	useBusinessStore.setState({}, true);
}

export function loadBusinessInfo(info: BusinessData) {
	useBusinessStore.setState(info, true);
}

export function setLoadingBusiness(isLoading: boolean) {
	useBusinessStore.setState({ isLoading });
}

export function setAnswerBuyBusiness(payload: {
	answer: any;
	owner?: string;
	actions?: any;
}) {
	const patch: Partial<BusinessData> = {
		answerBuy: payload.answer,
		isLoading: false,
	};

	if (payload.answer == 1) {
		patch.owner = payload.owner;
		patch.actions = payload.actions;
	}

	useBusinessStore.setState(patch);
}

export function setBusinessFormBlur(isBlur: boolean) {
	useBusinessStore.setState({ isBlur });
}

export function setBusinessFaction(faction: string) {
	useBusinessStore.setState({ faction });
}
