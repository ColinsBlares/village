import menuHeaderFib from '@imgs/mapCase/menu-header-fib.svg';
import { bumpMapCase, hideLoad, useMapCaseStore } from '../store';
import { mapCaseSvgPaths } from '../svgPaths';
import {
	createCallsData,
	createDbResultData,
	createMembersData,
	createWantedData,
	PROFILE_INFO,
	ProfileRecord,
	pushFactionWindow,
} from './factories';

export const mapCaseFIBDBSearchData = {
	searchByPhone: function (value: string) {
		mp.trigger('callRemote', 'mapCase.fib.searchByPhone', value);
	},
	searchByName: function (value: string) {
		mp.trigger('callRemote', 'mapCase.fib.searchByName', value);
	},
	searchByCar: function (value: string) {
		mp.trigger('callRemote', 'mapCase.fib.searchByCar', value);
	},
};

export const mapCaseFIBCallsData = createCallsData('mapCase.pd.calls.accept');
export const mapCaseFIBWantedData = createWantedData();
export const mapCaseFIBMembersData = createMembersData({
	rankHead: 'Звание',
	ranks: ['Старший Сержант', 'Альпака', 'Главный уборщик', 'Старший Альпака'],
	dismissEvent: 'mapCase.fib.members.uval',
	lowerEvent: 'mapCase.fib.rank.lower',
	raiseEvent: 'mapCase.fib.rank.raise',
});

export const mapCaseFIBIdentificationData = {
	searchById: function (id: string) {
		mp.trigger('mapCase.fib.search.start', id);
	},
	waitingTime: 30,
};

const menuBody = {
	dbSearch: {
		title: 'Поиск по базе данных',
		img: mapCaseSvgPaths.magnifier,
		windows: ['dbSearch'],
	},
	calls: {
		title: 'Вызовы',
		img: mapCaseSvgPaths.pdHeadset,
		windows: ['calls'],
	},
	wanted: {
		title: 'Список разыскиваемых',
		img: mapCaseSvgPaths.folder,
		windows: ['wanted'],
	},
	members: {
		title: 'Список сотрудников',
		img: mapCaseSvgPaths.users,
		windows: ['members'],
	},
	identification: {
		title: 'Установление личности',
		img: mapCaseSvgPaths.photoCamera,
		windows: ['identification'],
	},
};

export const mapCaseFIBDBResultData = createDbResultData(menuBody, hideLoad);

export const mapCaseFIBProfileData = {
	profileData: {
		dbSearch: {} as ProfileRecord,
		identification: {} as ProfileRecord,
		wanted: {} as ProfileRecord,
	} as Record<string, ProfileRecord>,
	infoList: PROFILE_INFO,
	setProfileData: function (payload: any) {
		const data = typeof payload == 'string' ? JSON.parse(payload) : payload;
		const focus = useMapCaseStore.getState().menuFocus;
		this.profileData[focus] = data;
		hideLoad();
		pushFactionWindow(menuBody, 'profile');
	},
	giveFine: function (cause: string, amount: string, profileData: ProfileRecord) {
		mp.trigger(
			'callRemote',
			'mapCase.fib.fines.give',
			JSON.stringify({
				recId: profileData.id,
				recName: profileData.name,
				cause: cause,
				price: amount,
			}),
		);
	},
	giveWanted: function (cause: string, danger: number, profileData: ProfileRecord) {
		if (danger > profileData.danger) {
			profileData.law -= danger - profileData.danger;
			profileData.crimes += danger - profileData.danger;
		}
		profileData.cause = cause;
		profileData.danger = danger;
		bumpMapCase();
		mp.trigger(
			'callRemote',
			'mapCase.fib.wanted.give',
			JSON.stringify({
				recId: profileData.id,
				recName: profileData.name,
				cause: cause,
				wanted: danger,
			}),
		);
	},
};

export const mapCaseFIBData = {
	menuHeader: 'FEDERAL<br />INVESTIGATION BUREAU',
	menuTitle: 'Добро пожаловать,',
	menuHeaderImg: menuHeaderFib,
	windowsData: {
		dbSearch: mapCaseFIBDBSearchData,
		dbResult: mapCaseFIBDBResultData,
		calls: mapCaseFIBCallsData,
		wanted: mapCaseFIBWantedData,
		members: mapCaseFIBMembersData,
		identification: mapCaseFIBIdentificationData,
		profile: mapCaseFIBProfileData,
	},
	menuBody: menuBody,
	getProfile: function (data: { id: number }) {
		mp.trigger('callRemote', 'mapCase.fib.getProfile', data.id);
	},
	emergencyCall: function () {
		mp.trigger('callRemote', 'mapCase.fib.emergency.call');
	},
};
