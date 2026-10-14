import menuHeaderWnews from '@imgs/mapCase/menu-header-wnews.svg';
import wnewsHeadName from '@imgs/mapCase/wnews-head-name.svg';
import { mapCaseSvgPaths } from '../svgPaths';
import { hideLoad, setCurrentOverWindow, showLoad, showRedMessage } from '../store';
import { bindField, createMembersData, parsePayload } from './factories';

export const mapCaseWnewsMembersData = createMembersData({
	rankHead: 'Должность',
	ranks: ['Старший редахтер', 'Альпака', 'Главный уборщик', 'Старший Альпака'],
	dismissEvent: 'mapCase.news.members.uval',
	lowerEvent: 'mapCase.news.rank.lower',
	raiseEvent: 'mapCase.news.rank.raise',
});

export const mapCaseWnewsAdsData = {
	adsAmount: 0,
	adData: {
		ad: { text: '', author: '' } as { text: string; author: string; [key: string]: any },
		maxLength: 60,
		send: function (adData: any) {
			mp.trigger('callRemote', 'mapCase.news.ads.accept', JSON.stringify(adData));
		},
		refuse: function (adData: any) {
			mp.trigger('callRemote', 'mapCase.news.ads.cancel', JSON.stringify(adData));
		},
	},
	getAd: function () {
		mp.trigger('callRemote', 'mapCase.news.ads.get');
	},
	setAd: function (adData: any) {
		this.adData.ad = parsePayload(adData);
		setCurrentOverWindow('map-case-wnews-over-ads');
		hideLoad();
	},
};

bindField(mapCaseWnewsAdsData, 'adsAmount', 0);

export function requestAd() {
	if (!mapCaseWnewsAdsData.adsAmount) {
		showRedMessage('Нет объявлений<br />для редактирования!');
		return;
	}
	showLoad();
	mapCaseWnewsAdsData.getAd();
}

export const mapCaseWnewsData = {
	menuHeader: '',
	menuHeaderName: wnewsHeadName,
	menuTitle: 'Добро пожаловать,',
	menuHeaderImg: menuHeaderWnews,
	windowsData: {
		ads: mapCaseWnewsAdsData,
		members: mapCaseWnewsMembersData,
	},
	menuBody: {
		ads: {
			title: 'Объявления',
			img: mapCaseSvgPaths.newsPaper,
			windows: ['ads'],
		},
		members: {
			title: 'Список сотрудников',
			img: mapCaseSvgPaths.users,
			windows: ['members'],
		},
	},
};
