import menuHeaderGover from '@imgs/mapCase/menu-header-gover.svg';
import { mapCaseSvgPaths } from '../svgPaths';
import { createMembersData } from './factories';

export const mapCaseGoverMembersData = createMembersData({
	rankHead: 'Должность',
	ranks: ['Старший медик', 'Альпака', 'Главный уборщик', 'Старший Альпака'],
	dismissEvent: 'mapCase.gover.members.uval',
	lowerEvent: 'mapCase.gover.rank.lower',
	raiseEvent: 'mapCase.gover.rank.raise',
});

export const mapCaseGoverData = {
	menuHeader: 'GOVERNMENT',
	menuTitle: 'Добро пожаловать,',
	menuHeaderImg: menuHeaderGover,
	windowsData: {
		members: mapCaseGoverMembersData,
	},
	menuBody: {
		members: {
			title: 'Список сотрудников',
			img: mapCaseSvgPaths.users,
			windows: ['members'],
		},
	},
};
