import menuHeaderPd from '@imgs/mapCase/menu-header-pd.svg';
import { hideLoad, useMapCaseStore, bumpMapCase } from '../store';
import { mapCaseSvgPaths } from '../svgPaths';
import {
	bindField,
	createCallsData,
	createDbResultData,
	createMembersData,
	createWantedData,
	PROFILE_INFO,
	ProfileRecord,
	pushFactionWindow,
} from './factories';

export const mapCasePdDBSearchData = {
	searchByPhone: function (value: string) {
		mp.trigger('callRemote', 'mapCase.pd.searchByPhone', value);
	},
	searchByName: function (value: string) {
		mp.trigger('callRemote', 'mapCase.pd.searchByName', value);
	},
	searchByCar: function (value: string) {
		mp.trigger('callRemote', 'mapCase.pd.searchByCar', value);
	},
};

export const mapCasePdCallsData = createCallsData('mapCase.pd.calls.accept');
export const mapCasePdWantedData = createWantedData();
export const mapCasePdMembersData = createMembersData({
	rankHead: 'Звание',
	ranks: ['Старший Сержант', 'Альпака', 'Главный уборщик', 'Старший Альпака'],
	dismissEvent: 'mapCase.pd.members.uval',
	lowerEvent: 'mapCase.pd.rank.lower',
	raiseEvent: 'mapCase.pd.rank.raise',
});

export const mapCasePdIdentificationData = {
	searchById: function (id: string) {
		mp.trigger('mapCase.pd.search.start', id);
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

export const mapCasePdDBResultData = createDbResultData(menuBody, hideLoad);

export const mapCasePdProfileData = {
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
			'mapCase.pd.fines.give',
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
			'mapCase.pd.wanted.give',
			JSON.stringify({
				recId: profileData.id,
				recName: profileData.name,
				cause: cause,
				wanted: danger,
			}),
		);
	},
};

export const mapCasePdData = {
	menuHeader: '',
	menuTitle: 'Добро пожаловать,',
	menuHeaderImg: menuHeaderPd,
	windowsData: {
		dbSearch: mapCasePdDBSearchData,
		dbResult: mapCasePdDBResultData,
		calls: mapCasePdCallsData,
		wanted: mapCasePdWantedData,
		members: mapCasePdMembersData,
		identification: mapCasePdIdentificationData,
		profile: mapCasePdProfileData,
	},
	menuBody: menuBody,
	getProfile: function (data: { id: number }) {
		mp.trigger('callRemote', 'mapCase.pd.getProfile', data.id);
	},
	emergencyCall: function () {
		mp.trigger('callRemote', 'mapCase.pd.emergency.call');
	},
};

bindField(mapCasePdData, 'menuHeader', 'LOS SANTOS<br />POLICE DEPARTMENT');
