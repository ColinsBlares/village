import { create } from 'zustand';

export interface NpcDraft {
	id: number;
	key: string;
	name: string;
	model: string;
	x: number;
	y: number;
	z: number;
	h: number;
	dimension: number;
	behavior: string;
	scenario: string;
	animDict: string;
	animName: string;
	speed: number;
	route: Array<{ x: number; y: number; z: number }>;
	dialog: string;
	blip: boolean;
	enabled: boolean;
	kind: string;
	weapon: string;
	ammo: number;
	health: number;
	armor: number;
	aggroRange: number;
}

export interface CatalogItem {
	id?: string;
	value?: string;
	label: string;
	dict?: string;
	name?: string;
}

export interface NpcEditorPayload {
	npcs: NpcDraft[];
	behaviors: Array<{ value: string; label: string }>;
	scenarios: string[];
	kinds: CatalogItem[];
	models: CatalogItem[];
	weapons: CatalogItem[];
	anims: CatalogItem[];
}

interface NpcEditorState {
	show: boolean;
	npcs: NpcDraft[];
	behaviors: Array<{ value: string; label: string }>;
	scenarios: string[];
	kinds: CatalogItem[];
	models: CatalogItem[];
	weapons: CatalogItem[];
	anims: CatalogItem[];
	selectedId: number | null;
	draft: NpcDraft | null;
}

export const useNpcEditorStore = create<NpcEditorState>(() => ({
	show: false,
	npcs: [],
	behaviors: [],
	scenarios: [],
	kinds: [],
	models: [],
	weapons: [],
	anims: [],
	selectedId: null,
	draft: null,
}));

function pick(payload: NpcEditorPayload, selectId?: number) {
	const npcs = payload.npcs || [];
	let selectedId = selectId || null;
	if (!npcs.find(npc => npc.id === selectedId)) {
		selectedId = npcs.length ? npcs[0].id : null;
	}
	const found = npcs.find(npc => npc.id === selectedId) || null;
	return {
		npcs,
		behaviors: payload.behaviors || [],
		scenarios: payload.scenarios || [],
		kinds: payload.kinds || [],
		models: payload.models || [],
		weapons: payload.weapons || [],
		anims: payload.anims || [],
		selectedId,
		draft: found ? { ...found, route: (found.route || []).slice() } : null,
	};
}

export function openNpcEditor(payload: NpcEditorPayload) {
	useNpcEditorStore.setState({ show: true, ...pick(payload) });
}

export function setNpcEditorData(payload: NpcEditorPayload, selectId?: number) {
	const state = useNpcEditorStore.getState();
	useNpcEditorStore.setState(pick(payload, selectId || state.selectedId || undefined));
}

export function selectNpc(id: number) {
	const npc = useNpcEditorStore.getState().npcs.find(item => item.id === id);
	useNpcEditorStore.setState({
		selectedId: id,
		draft: npc ? { ...npc, route: (npc.route || []).slice() } : null,
	});
}

export function patchDraft(field: string, value: string | number | boolean) {
	const draft = useNpcEditorStore.getState().draft;
	if (!draft) return;
	useNpcEditorStore.setState({ draft: { ...draft, [field]: value } });
}

export function hideNpcEditor() {
	useNpcEditorStore.setState({ show: false });
}

export function initNpcEditorBridge() {
	Object.defineProperty(window, 'npcEditor', {
		configurable: true,
		get: function () {
			return { hide: hideNpcEditor };
		},
	});
}
