import { create } from 'zustand';

export interface AdminPanelState {
	show: boolean;
	data: any;
	auditData: any[];
	historyData: any;
	activeTab: string;
}

const initialState: AdminPanelState = {
	show: false,
	data: {
		self: { characterId: 0, name: '', level: 0 },
		commands: [],
		players: [],
		staff: [],
		reports: [],
		reportMessages: [],
		audits: [],
		notifications: [],
		notes: [],
	},
	auditData: [],
	historyData: null,
	activeTab: 'commands',
};

export const useAdminPanelStore = create<AdminPanelState>(() => initialState);

function parseData(raw: any) {
	if (typeof raw === 'string') return JSON.parse(raw);
	return raw || {};
}

function applyShowSideEffects(show: boolean) {
	mp.trigger('blur', show, 250);
	const busy = (window as any).busy;
	if (show) {
		if (busy && busy.add) busy.add('adminPanel', true, true);
	} else if (busy && busy.remove) {
		busy.remove('adminPanel', true);
	}
}

export function openAdminPanel(raw: any) {
	const data = parseData(raw);
	useAdminPanelStore.setState({
		show: true,
		data: { ...initialState.data, ...data },
		auditData: data.audits || [],
		historyData: null,
	});
	applyShowSideEffects(true);
}

export function setAdminPanelData(raw: any) {
	const data = parseData(raw);
	useAdminPanelStore.setState(function (state) {
		return {
			data: { ...state.data, ...data },
			auditData: data.audits || state.auditData,
		};
	});
}

export function setAdminPanelAuditData(raw: any) {
	const rows = parseData(raw);
	useAdminPanelStore.setState({ auditData: Array.isArray(rows) ? rows : [] });
}

export function setAdminPanelHistoryData(raw: any) {
	useAdminPanelStore.setState({ historyData: parseData(raw) });
}

export function setAdminPanelTab(activeTab: string) {
	useAdminPanelStore.setState({ activeTab });
}

export function refreshAdminPanel() {
	if (useAdminPanelStore.getState().show) {
		mp.trigger('callRemote', 'admin.panel.load');
	}
}

export function closeAdminPanel() {
	if (!useAdminPanelStore.getState().show) return;
	useAdminPanelStore.setState({ show: false });
	applyShowSideEffects(false);
}

export function initAdminPanelBridge() {
	if (typeof window === 'undefined') return;
	const win = window as any;
	const target = win.adminPanel || {};
	Object.defineProperty(target, 'show', {
		configurable: true,
		enumerable: true,
		get: () => useAdminPanelStore.getState().show,
		set: (value: boolean) => {
			if (value) refreshAdminPanel();
			else closeAdminPanel();
		},
	});
	target.open = openAdminPanel;
	target.setData = setAdminPanelData;
	target.setAuditData = setAdminPanelAuditData;
	target.setHistoryData = setAdminPanelHistoryData;
	target.refresh = refreshAdminPanel;
	target.close = closeAdminPanel;
	win.adminPanel = target;

	window.addEventListener('keyup', function (event) {
		if (event.key === 'Escape' && useAdminPanelStore.getState().show) {
			closeAdminPanel();
		}
	});
}
