import { mapCaseEmsCallsData, mapCaseEmsMembersData } from './data/ems';
import { mapCaseFIBCallsData, mapCaseFIBDBResultData, mapCaseFIBData, mapCaseFIBMembersData, mapCaseFIBProfileData, mapCaseFIBWantedData } from './data/fib';
import { mapCaseGoverMembersData } from './data/gover';
import { applyType } from './data/index';
import { mapCaseNgMembersData } from './data/ng';
import { mapCasePdCallsData, mapCasePdData, mapCasePdDBResultData, mapCasePdMembersData, mapCasePdProfileData, mapCasePdWantedData } from './data/pd';
import { mapCaseWnewsAdsData, mapCaseWnewsMembersData } from './data/wnews';
import {
	onTabletKeyUp,
	setEnable,
	setInputFocus,
	setShow,
	setUserName,
	showGreenMessage,
	showRedMessage,
	useMapCaseStore,
} from './store';

function bridgeField(
	target: any,
	key: string,
	read: () => any,
	write: (val: any) => void,
) {
	Object.defineProperty(target, key, {
		configurable: true,
		enumerable: true,
		get: function () {
			return read();
		},
		set: function (val) {
			write(val);
		},
	});
}

export function initMapCaseLegacyBridge() {
	if (typeof window === 'undefined') return;

	const win = window as any;
	const stub = win.mapCase || {};

	if (stub.userName) setUserName(String(stub.userName));
	if (stub.inputFocus) setInputFocus(true);
	if (stub.type) applyType(String(stub.type));
	if (stub.enable) useMapCaseStore.setState({ enable: true });
	if (stub.show && (stub.enable || useMapCaseStore.getState().enable)) setShow(true);

	const target = stub;
	win.mapCase = target;

	bridgeField(target, 'show', function () {
		return useMapCaseStore.getState().show;
	}, setShow);
	bridgeField(target, 'enable', function () {
		return useMapCaseStore.getState().enable;
	}, setEnable);
	bridgeField(target, 'type', function () {
		return useMapCaseStore.getState().type;
	}, function (val) {
		applyType(val ? String(val) : '');
	});
	bridgeField(target, 'userName', function () {
		return useMapCaseStore.getState().userName;
	}, function (val) {
		setUserName(val ? String(val) : '');
	});
	bridgeField(target, 'inputFocus', function () {
		return useMapCaseStore.getState().inputFocus;
	}, function (val) {
		setInputFocus(!!val);
	});

	target.showGreenMessage = showGreenMessage;
	target.showRedMessage = showRedMessage;

	function takeOver(dataName: string, data: any) {
		const prev = win[dataName];
		if (prev && prev !== data) {
			Object.keys(prev).forEach(function (key) {
				data[key] = prev[key];
			});
		}
		win[dataName] = data;
	}

	takeOver('mapCasePdData', mapCasePdData);
	takeOver('mapCasePdDBResultData', mapCasePdDBResultData);
	takeOver('mapCasePdProfileData', mapCasePdProfileData);
	takeOver('mapCasePdCallsData', mapCasePdCallsData);
	takeOver('mapCasePdWantedData', mapCasePdWantedData);
	takeOver('mapCasePdMembersData', mapCasePdMembersData);
	takeOver('mapCaseFIBData', mapCaseFIBData);
	takeOver('mapCaseFIBDBResultData', mapCaseFIBDBResultData);
	takeOver('mapCaseFIBProfileData', mapCaseFIBProfileData);
	takeOver('mapCaseFIBCallsData', mapCaseFIBCallsData);
	takeOver('mapCaseFIBWantedData', mapCaseFIBWantedData);
	takeOver('mapCaseFIBMembersData', mapCaseFIBMembersData);
	takeOver('mapCaseEmsCallsData', mapCaseEmsCallsData);
	takeOver('mapCaseEmsMembersData', mapCaseEmsMembersData);
	takeOver('mapCaseNgMembersData', mapCaseNgMembersData);
	takeOver('mapCaseGoverMembersData', mapCaseGoverMembersData);
	takeOver('mapCaseWnewsAdsData', mapCaseWnewsAdsData);
	takeOver('mapCaseWnewsMembersData', mapCaseWnewsMembersData);

	window.addEventListener('keyup', onTabletKeyUp);
}
