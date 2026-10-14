import { useMapCaseStore } from '../store';
import { mapCaseEmsData } from './ems';
import { mapCaseFIBData } from './fib';
import { mapCaseGoverData } from './gover';
import { mapCaseNgData } from './ng';
import { mapCasePdData } from './pd';
import { mapCaseWnewsData } from './wnews';

const factions: Record<string, any> = {
	pd: mapCasePdData,
	fib: mapCaseFIBData,
	ems: mapCaseEmsData,
	wnews: mapCaseWnewsData,
	ng: mapCaseNgData,
	gover: mapCaseGoverData,
};

export function getFactionData(type: string) {
	return factions[type] || null;
}

export function applyType(val: string) {
	const type = val || '';
	if (!type) {
		useMapCaseStore.setState({ type: '' });
		return;
	}
	const data = getFactionData(type);
	const keys = data ? Object.keys(data.menuBody) : [];
	useMapCaseStore.setState({
		type: type,
		menuFocus: keys.length ? keys[0] : '',
	});
}

export function getMenuWindows(type: string, menuFocus: string) {
	const data = getFactionData(type);
	if (!data || !menuFocus || !data.menuBody[menuFocus]) return [];
	return data.menuBody[menuFocus].windows as string[];
}

export function popWindow() {
	const state = useMapCaseStore.getState();
	const wins = getMenuWindows(state.type, state.menuFocus);
	if (wins.length > 1) wins.pop();
	useMapCaseStore.setState(function (current) {
		return { tick: current.tick + 1 };
	});
}
