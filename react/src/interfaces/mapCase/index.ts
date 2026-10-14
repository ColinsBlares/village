import { defineScreen } from '@utils/defineScreen';

const mapCaseDataNames = [
	'mapCasePdData', 'mapCasePdDBResultData', 'mapCasePdProfileData', 'mapCasePdCallsData',
	'mapCasePdWantedData', 'mapCasePdMembersData', 'mapCaseFIBData', 'mapCaseFIBDBResultData',
	'mapCaseFIBProfileData', 'mapCaseFIBCallsData', 'mapCaseFIBWantedData', 'mapCaseFIBMembersData',
	'mapCaseEmsCallsData', 'mapCaseEmsMembersData', 'mapCaseNgMembersData', 'mapCaseGoverMembersData',
	'mapCaseWnewsAdsData', 'mapCaseWnewsMembersData',
];

if (typeof window !== 'undefined') {
	const win = window as any;
	mapCaseDataNames.forEach(function (name) {
		if (!win[name]) {
			win[name] = {};
		}
	});
}

export default defineScreen({
	id: 'mapCase',
	order: 4,
	load: function () { return import('./runtime'); },
	global: 'mapCase',
	isOpen: function (bag) { return !!(bag.show && bag.enable); },
	methods: ["showGreenMessage","showRedMessage"],
	hotkey: { event: 'keyup', codes: [80], requireEnable: true, busy: ['auth', 'chat', 'terminal', 'inventory', 'playerMenu', 'phone', 'inputWindow', 'jobProcess', 'timer', 'playersList', 'bugTracker'] },
});
