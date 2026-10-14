import menuHeaderEms from '@imgs/mapCase/menu-header-ems.svg';
import { mapCaseSvgPaths } from '../svgPaths';
import { createCallsData, createMembersData } from './factories';

export const mapCaseEmsCallsData = createCallsData('mapCase.ems.calls.accept');
export const mapCaseEmsMembersData = createMembersData({
	rankHead: 'Должность',
	ranks: ['Старший медик', 'Альпака', 'Главный уборщик', 'Старший Альпака'],
	dismissEvent: 'mapCase.ems.members.uval',
	lowerEvent: 'mapCase.ems.rank.lower',
	raiseEvent: 'mapCase.ems.rank.raise',
});

export const mapCaseEmsData = {
	menuHeader: 'EMERGENCY MEDICAL<br />SERVICE',
	menuTitle: 'Добро пожаловать,',
	menuHeaderImg: menuHeaderEms,
	windowsData: {
		calls: mapCaseEmsCallsData,
		members: mapCaseEmsMembersData,
	},
	menuBody: {
		calls: {
			title: 'Вызовы',
			img: mapCaseSvgPaths.smartphone,
			windows: ['calls'],
		},
		members: {
			title: 'Список сотрудников',
			img: mapCaseSvgPaths.users,
			windows: ['members'],
		},
	},
};
