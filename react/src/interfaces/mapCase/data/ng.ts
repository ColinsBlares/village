import menuHeaderNg from '@imgs/mapCase/menu-header-ng.svg';
import { mapCaseSvgPaths } from '../svgPaths';
import { createMembersData } from './factories';

export const mapCaseNgMembersData = createMembersData({
	rankHead: 'Должность',
	ranks: ['Старший медик', 'Альпака', 'Главный уборщик', 'Старший Альпака'],
	dismissEvent: 'mapCase.army.members.uval',
	lowerEvent: 'mapCase.army.rank.lower',
	raiseEvent: 'mapCase.army.rank.raise',
});

export const mapCaseNgData = {
	menuHeader: 'UNITED STATES<br />ARMY',
	menuTitle: 'Добро пожаловать,',
	menuHeaderImg: menuHeaderNg,
	windowsData: {
		members: mapCaseNgMembersData,
	},
	menuBody: {
		members: {
			title: 'Список сотрудников',
			img: mapCaseSvgPaths.users,
			windows: ['members'],
		},
	},
};
