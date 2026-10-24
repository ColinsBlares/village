import { create } from 'zustand';

export interface VisibilityState {
	[key: string]: boolean;
}

export const useVisibilityStore = create<VisibilityState>(() => ({
	hud: false,
	phone: false,
	phoneReady: false,
	house: false,
	enterMenu: false,
	business: false,
	bank: false,
	players: false,
	speedometer: false,
	auth: false,
	chat: true,
	acceptWindow: false,
	inputWindow: false,
	selectionWindow: false,
	selectItems: false,
	offerDialog: false,
	infoTable: false,
	modal: false,
	prompt: false,
	loader: false,
	watermark: false,
	timer: false,
	notifications: true,
	carPass: false,
	characterPass: false,
	driverLicense: false,
	gunLicense: false,
	medicalCard: false,
	governmentBadge: false,
	check: false,
	carSpecifications: false,
	characterInfo: false,
	captureScore: false,
	killList: false,
	fishing: false,
	wheelResult: false,
	bugTracker: false,
	supermarket: false,
	terminal: false,
	interactionMenu: false,
	craft: false,
	inventory: false,
	playerMenu: false,
	mapCase: false,
	selectMenu: false,
	changelist: false,
	questTracker: false,
	questEditor: false,
	questLog: false,
	questDialog: false,
	npcEditor: false,
}));

export function setScreenOpen(id: keyof VisibilityState, value: boolean) {
	const current = useVisibilityStore.getState()[id];
	if (!!current === !!value) {
		return;
	}

	const patch: Partial<VisibilityState> = {};
	patch[id] = !!value;
	useVisibilityStore.setState(patch);
}
