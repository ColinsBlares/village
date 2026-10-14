import {
	animatePhoneHide,
	animatePhoneIncoming,
	animatePhoneShow,
} from '@utils/shared/phoneDom';
import {
	BusinessProperty,
	HouseProperty,
	PhoneInfo,
} from '@utils/shared/types';
import { useVisibilityStore } from '@utils/visibility/store';
import {
	closeScreenIfOpen,
	collapseSuccessSell,
	removeScreenByName,
} from './navigation';
import { usePhoneStore } from './phoneState';
import { resetTaxiDriver } from './taxiDriver';

export {
	applyPhoneBusinessPayment,
	applyPhoneCashbox,
	applyPhoneHousePayment,
	usePhoneStore,
} from './phoneState';

let phoneIsShow = false;
let phoneIsShow2 = false;

function mapFirstBiz(recipe: (biz: BusinessProperty) => BusinessProperty) {
	usePhoneStore.setState(state => ({
		biz: (state.biz || []).map((item, index) =>
			index === 0 ? recipe(item) : item,
		),
	}));
}

function mapFirstHouse(recipe: (house: HouseProperty) => HouseProperty) {
	usePhoneStore.setState(state => ({
		houses: (state.houses || []).map((item, index) =>
			index === 0 ? recipe(item) : item,
		),
	}));
}

export function showPhone(flag: boolean) {
	phoneIsShow = flag;

	if (flag) {
		animatePhoneShow();
		phoneIsShow2 = false;
	} else {
		animatePhoneHide();
	}

	useVisibilityStore.setState({ phone: flag });

	const info = usePhoneStore.getState();

	if (!flag && info.incomingCall && info.incomingCall.state) {
		mp.trigger('phone.call.in.ans', 0);
		phoneIsShow2 = false;
		usePhoneStore.setState({ incomingCall: null });
	}

	if (!flag) {
		collapseSuccessSell();
	}
}

export function addInfoToPhone(info: PhoneInfo) {
	usePhoneStore.setState(state => ({
		...state,
		...info,
		contacts: [
			...(info.contacts || []),
			{
				name: 'Мой номер',
				number: info.number,
			},
		],
		isLoad: true,
	}));
}

export function disableHomePhone(isDisabled: boolean) {
	usePhoneStore.setState({ isDisabled });
}

export function setSymbolPriceNews(symbolPriceNews: number) {
	usePhoneStore.setState({ symbolPriceNews });
}

export function addContact(contact: { name: string; number: string }) {
	usePhoneStore.setState(state => ({
		contacts: [...(state.contacts || []), contact],
	}));
}

export function sortContacts() {
	usePhoneStore.setState(state => ({
		contacts: [...(state.contacts || [])].sort((a, b) =>
			a.name.localeCompare(b.name),
		),
	}));
}

export function deleteContact(number: string) {
	usePhoneStore.setState(state => ({
		contacts: (state.contacts || []).filter(
			contact => contact.number !== number,
		),
	}));
}

export function updateMyNumber(oldNumber: string, newNumber: string) {
	usePhoneStore.setState(state => {
		const contacts = (state.contacts || []).map(contact => ({ ...contact }));
		const myNumberIndex = contacts.findIndex(
			contact => contact.number == oldNumber && contact.name == 'Мой номер',
		);

		if (myNumberIndex === -1) {
			return {};
		}

		const deletedContacts = contacts.filter(
			contact => contact.number == newNumber,
		);

		deletedContacts.forEach(contact => {
			const deleteIndex = contacts.findIndex(
				item => item.number == contact.number,
			);

			if (deleteIndex !== -1) {
				contacts.splice(deleteIndex, 1);
			}
		});

		if (contacts[myNumberIndex]) {
			contacts[myNumberIndex].number = newNumber;
		}

		return {
			contacts,
			number: newNumber,
		};
	});
}

export function renameContact(number: string, newName: string) {
	usePhoneStore.setState(state => ({
		contacts: (state.contacts || []).map(contact =>
			contact.number === number ? { ...contact, name: newName } : contact,
		),
	}));
}

export function setIncomingCall(callState: boolean, number?: string) {
	if (!phoneIsShow && callState) {
		animatePhoneIncoming();
		phoneIsShow2 = true;
	}

	usePhoneStore.setState({
		incomingCall: {
			state: callState,
			number,
		},
	});
}

export function setActiveCall(
	callState: boolean,
	number: string,
	isMine: boolean,
) {
	usePhoneStore.setState(state => ({
		activeCall: {
			...(state.activeCall || {}),
			state: callState,
			number,
			isMine,
		},
	}));
}

export function setCallStatus(callStatus: number) {
	const state = usePhoneStore.getState();

	if (state.incomingCall && state.incomingCall.state && phoneIsShow2) {
		animatePhoneHide();
		phoneIsShow2 = false;
	}

	usePhoneStore.setState({
		incomingCall: {
			...(state.incomingCall || {}),
			state: false,
		},
		activeCall: {
			...(state.activeCall || {}),
			callStatus,
		},
	});
}

export function setCall(isCall: boolean) {
	usePhoneStore.setState({ isCall });
}

export function changeStateHouse() {
	mapFirstHouse(house => ({
		...house,
		isOpened: !house.isOpened,
	}));
}

export function setSellStatusHouse(sellStatus: any) {
	mapFirstHouse(house => ({ ...house, sellStatus }));
}

export function setSellInfoHouse(ansSell: any) {
	mapFirstHouse(house => ({ ...house, ansSell }));
}

export function sellHouse(_name?: any) {
	usePhoneStore.setState({ houses: [] });
}

export function setSellStatusBusiness(sellStatus: any) {
	mapFirstBiz(biz => ({ ...biz, sellStatus }));
}

export function setSellInfoBusiness(ansSell: any) {
	mapFirstBiz(biz => ({ ...biz, ansSell }));
}

export function createOrderBusiness(
	productsCount: number,
	productsPrice: number,
) {
	mapFirstBiz(biz => ({
		...biz,
		order: { productsCount, productsPrice },
		cashBox: (biz.cashBox || 0) - productsPrice,
		orderStatus: null,
	}));
}

export function cancelOrderBusiness() {
	mapFirstBiz(biz => {
		if (biz.order == null) {
			return biz;
		}

		return {
			...biz,
			cashBox:
				(biz.cashBox || 0) +
				parseInt(String(biz.order.productsPrice * 0.8), 10),
			order: null,
		};
	});
}

export function setOrderStatusBusiness(orderStatus: any) {
	mapFirstBiz(biz => ({ ...biz, orderStatus }));
}

export function takeOrderBusiness(isTake: boolean) {
	mapFirstBiz(biz => ({
		...biz,
		order: biz.order ? { ...biz.order, isTake } : biz.order,
	}));
}

export function completeOrderBusiness(count: number, sum: number) {
	mapFirstBiz(biz => {
		const order = biz.order ? { ...biz.order } : null;
		const next = {
			...biz,
			resources: (biz.resources || 0) + count,
			order,
		};

		if (next.order && next.order.productsCount - count > 0) {
			next.order.productsCount -= count;
			next.order.productsPrice -= sum;
		} else {
			next.order = null;
		}

		return next;
	});

	removeScreenByName('OrderCancel');
}

export function updateProductsBusiness(resources: number) {
	mapFirstBiz(biz => ({ ...biz, resources }));
}

export function sellBusiness(id: any) {
	usePhoneStore.setState(state => ({
		biz: (state.biz || []).filter(biz => biz.id !== id),
	}));
}

export function createOrderBusinessFaction(
	productsCount: number,
	productsPrice: number,
) {
	usePhoneStore.setState(state => ({
		factionBiz: state.factionBiz
			? {
					...state.factionBiz,
					order: { productsCount, productsPrice },
					cashBox: (state.factionBiz.cashBox || 0) - productsPrice,
					orderStatus: null,
				}
			: state.factionBiz,
	}));
}

export function cancelOrderBusinessFaction() {
	usePhoneStore.setState(state => {
		if (!state.factionBiz || state.factionBiz.order == null) {
			return {};
		}

		return {
			factionBiz: {
				...state.factionBiz,
				order: null,
			},
		};
	});
}

export function setOrderStatusBusinessFaction(orderStatus: any) {
	usePhoneStore.setState(state => ({
		factionBiz: state.factionBiz
			? { ...state.factionBiz, orderStatus }
			: state.factionBiz,
	}));
}

export function takeOrderBusinessFaction(isTake: boolean) {
	usePhoneStore.setState(state => ({
		factionBiz: state.factionBiz
			? {
					...state.factionBiz,
					order: state.factionBiz.order
						? { ...state.factionBiz.order, isTake }
						: state.factionBiz.order,
				}
			: state.factionBiz,
	}));
}

export function completeOrderBusinessFaction(count: number, sum: number) {
	usePhoneStore.setState(state => {
		if (!state.factionBiz) {
			return {};
		}

		const order = state.factionBiz.order ? { ...state.factionBiz.order } : null;
		const factionBiz = {
			...state.factionBiz,
			resources: (state.factionBiz.resources || 0) + count,
			order,
		};

		if (factionBiz.order && factionBiz.order.productsCount - count > 0) {
			factionBiz.order.productsCount -= count;
			factionBiz.order.productsPrice -= sum;
		} else {
			factionBiz.order = null;
		}

		return { factionBiz };
	});
}

export function installPhoneApp(appName: string, info: any) {
	usePhoneStore.setState(state => {
		if (appName === 'house') {
			return { houses: state.houses ? [...state.houses, info] : [info] };
		}

		if (appName === 'biz') {
			return { biz: state.biz ? [...state.biz, info] : [info] };
		}

		if (appName === 'taxi') {
			return { isDriver: true };
		}

		if (appName === 'factionBiz') {
			return { factionBiz: info };
		}

		return {};
	});
}

export function deleteApp(appName: string) {
	if (appName === 'house') {
		usePhoneStore.setState({ houses: [] });
		closeScreenIfOpen('HouseApp');
		return;
	}

	if (appName === 'biz') {
		usePhoneStore.setState({ biz: [] });
		closeScreenIfOpen('BusinessApp');
		return;
	}

	if (appName === 'taxi') {
		usePhoneStore.setState({ isDriver: false });
		resetTaxiDriver();
		closeScreenIfOpen('TaxiDriver');
		return;
	}

	if (appName === 'factionBiz') {
		usePhoneStore.setState({ factionBiz: null });
	}
}

export function updateCashboxBusiness(cashBox: number) {
	mapFirstBiz(biz => ({ ...biz, cashBox }));
}

export function updateStatisticsBusiness(date: any, money: number) {
	mapFirstBiz(biz => {
		const statistics = biz.statistics ? [...biz.statistics] : [];
		const dayIndex = statistics.findIndex(day => day.date == date);

		if (dayIndex !== -1) {
			statistics[dayIndex] = { ...statistics[dayIndex], money };
		} else {
			if (statistics.length === 30) {
				statistics.pop();
			}

			statistics.unshift({ date, money });
		}

		return { ...biz, statistics };
	});
}

export function setBuyStatusHouse(buyStatus: any) {
	mapFirstHouse(house => ({ ...house, buyStatus }));
}

export function buyImprovementHouse(type: string) {
	mapFirstHouse(house => {
		const improvements = house.improvements || [];
		const index = improvements.findIndex(item => item.type == type);

		if (index === -1) {
			return house;
		}

		return {
			...house,
			buyStatus: null,
			improvements: improvements.map((item, itemIndex) =>
				itemIndex === index ? { ...item, isBuyed: true } : item,
			),
		};
	});
}

export function setBuyStatusBusiness(buyStatus: any) {
	mapFirstBiz(biz => ({ ...biz, buyStatus }));
}

export function buyImprovementBusiness(type: string) {
	mapFirstBiz(biz => {
		const improvements = biz.improvements || [];
		const index = improvements.findIndex(item => item.type == type);

		if (index === -1) {
			return biz;
		}

		return {
			...biz,
			buyStatus: null,
			improvements: improvements.map((item, itemIndex) =>
				itemIndex === index ? { ...item, isBuyed: true } : item,
			),
		};
	});
}

export function setBuyStatusBusinessFaction(buyStatus: any) {
	usePhoneStore.setState(state => ({
		factionBiz: state.factionBiz
			? { ...state.factionBiz, buyStatus }
			: state.factionBiz,
	}));
}

export function buyImprovementBusinessFaction(type: string) {
	usePhoneStore.setState(state => {
		if (!state.factionBiz) {
			return {};
		}

		const improvements = state.factionBiz.improvements || [];
		const index = improvements.findIndex(item => item.type == type);

		if (index === -1) {
			return {};
		}

		return {
			factionBiz: {
				...state.factionBiz,
				buyStatus: null,
				improvements: improvements.map((item, itemIndex) =>
					itemIndex === index ? { ...item, isBuyed: true } : item,
				),
			},
		};
	});
}
