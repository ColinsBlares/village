import { create } from 'zustand';
import { OFFER_DIALOGS, OfferDialogDef, prettyOffer } from './dialogs';

export const SHOW_TIME = 10000;

export interface OfferDialogState {
	show: boolean;
	title: string;
	text: string;
	openedAt: number;
	green: boolean;
	red: boolean;
}

export const useOfferDialogStore = create<OfferDialogState>(() => ({
	show: false,
	title: '',
	text: '',
	openedAt: 0,
	green: false,
	red: false,
}));

let activeDialog: OfferDialogDef | null = null;
let timeoutId: number | null = null;
let listening = false;

function busyAdd() {
	const busy = (window as any).busy;
	if (busy) {
		busy.add('offerDialog', false, true);
	}
}

function busyRemove() {
	const busy = (window as any).busy;
	if (busy) {
		busy.remove('offerDialog', true);
	}
}

function isBlocked() {
	const busy = (window as any).busy;
	if (!busy || !busy.includes) {
		return false;
	}
	return busy.includes(['chat', 'terminal', 'mapCase', 'phone']);
}

export function hideOfferDialog() {
	if (timeoutId !== null) {
		window.clearTimeout(timeoutId);
		timeoutId = null;
	}
	const wasOpen = activeDialog != null;
	activeDialog = null;
	useOfferDialogStore.setState({
		show: false,
		title: '',
		text: '',
		openedAt: 0,
		green: false,
		red: false,
	});
	markOpened(false);
	if (wasOpen) {
		busyRemove();
	}
}

export function showOfferDialog(name: string, values: any) {
	const dialog = OFFER_DIALOGS[name];
	if (!dialog) {
		return;
	}
	if (typeof values === 'string') {
		values = JSON.parse(values);
	}
	dialog.on(values);
	activeDialog = dialog;
	if (timeoutId !== null) {
		window.clearTimeout(timeoutId);
	}
	timeoutId = window.setTimeout(function () {
		if (activeDialog) {
			activeDialog.ignore();
		}
		hideOfferDialog();
	}, SHOW_TIME);
	const wasOpen = useOfferDialogStore.getState().show;
	useOfferDialogStore.setState({
		show: true,
		title: dialog.title,
		text: dialog.text,
		openedAt: Date.now(),
		green: false,
		red: false,
	});
	markOpened(true);
	if (!wasOpen) {
		busyAdd();
	}
}

function markOpened(open: boolean) {
	const bag = (window as any).offerDialog;
	if (bag) {
		bag.opened = open;
	}
}

export function acceptOffer() {
	if (!activeDialog) {
		return;
	}
	activeDialog.yes();
	hideOfferDialog();
}

export function declineOffer() {
	if (!activeDialog) {
		return;
	}
	activeDialog.no();
	hideOfferDialog();
}

function onKeyUp(event: KeyboardEvent) {
	if (!activeDialog) {
		return;
	}
	useOfferDialogStore.setState({ green: false, red: false });
	if (isBlocked()) {
		return;
	}
	if (event.keyCode == 89) {
		acceptOffer();
	} else if (event.keyCode == 78) {
		declineOffer();
	}
}

function onKeyDown(event: KeyboardEvent) {
	if (!activeDialog) {
		return;
	}
	if (isBlocked()) {
		return;
	}
	if (event.keyCode == 89) {
		useOfferDialogStore.setState({ green: true });
	} else if (event.keyCode == 78) {
		useOfferDialogStore.setState({ red: true });
	}
}

export function initOfferDialogLegacyBridge() {
	if (typeof window === 'undefined') {
		return;
	}

	const win = window as any;
	const target = win.offerDialog || {};

	Object.defineProperty(target, 'show', {
		configurable: true,
		enumerable: true,
		writable: false,
		value: showOfferDialog,
	});
	target.hide = hideOfferDialog;
	target.pretty = prettyOffer;

	win.offerDialog = target;

	if (listening) {
		return;
	}
	listening = true;
	window.addEventListener('keyup', onKeyUp);
	window.addEventListener('keydown', onKeyDown);
}
