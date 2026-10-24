import { create } from 'zustand';
import type { Edge, Node } from '@xyflow/react';
import type { EditorPayload, NodeTypeMeta, QuestMeta } from './types';

interface QuestEditorState {
	show: boolean;
	quests: QuestMeta[];
	nodeTypes: NodeTypeMeta[];
	signals: EditorPayload['signals'];
	jobs: EditorPayload['jobs'];
	npcs: EditorPayload['npcs'];
	selectedQuestId: number | null;
	nodes: Node[];
	edges: Edge[];
	selectedNodeId: string | null;
}

function questGraphNodes(quest: QuestMeta | undefined): Node[] {
	if (!quest || !quest.graph || !quest.graph.nodes) return [];
	return quest.graph.nodes.map(n => ({
		...n,
		type: 'quest',
		data: {
			...(n.data || {}),
			nodeType: n.type,
			label: n.type,
		},
	}));
}

function questGraphEdges(quest: QuestMeta | undefined): Edge[] {
	if (!quest || !quest.graph || !quest.graph.edges) return [];
	return quest.graph.edges.map(e => ({ ...e }));
}

export const useQuestEditorStore = create<QuestEditorState>(() => ({
	show: false,
	quests: [],
	nodeTypes: [],
	signals: [],
	jobs: [],
	npcs: [],
	selectedQuestId: null,
	nodes: [],
	edges: [],
	selectedNodeId: null,
}));

export function openQuestEditor(payload: EditorPayload) {
	const quests = payload.quests || [];
	const selectedQuestId = quests.length ? quests[0].id : null;
	const quest = quests.find(q => q.id === selectedQuestId);
	useQuestEditorStore.setState({
		show: true,
		quests,
		nodeTypes: payload.nodeTypes || [],
		signals: payload.signals || [],
		jobs: payload.jobs || [],
		npcs: payload.npcs || [],
		selectedQuestId,
		nodes: questGraphNodes(quest),
		edges: questGraphEdges(quest),
		selectedNodeId: null,
	});
}

export function setQuestEditorData(payload: EditorPayload, selectId?: number) {
	const state = useQuestEditorStore.getState();
	const quests = payload.quests || [];
	let selectedQuestId = selectId || state.selectedQuestId;
	if (!quests.find(q => q.id === selectedQuestId)) {
		selectedQuestId = quests.length ? quests[quests.length - 1].id : null;
	}
	const quest = quests.find(q => q.id === selectedQuestId);
	useQuestEditorStore.setState({
		quests,
		nodeTypes: payload.nodeTypes || state.nodeTypes,
		signals: payload.signals || state.signals,
		jobs: payload.jobs || state.jobs,
		npcs: payload.npcs || state.npcs,
		selectedQuestId,
		nodes: questGraphNodes(quest),
		edges: questGraphEdges(quest),
		selectedNodeId: null,
	});
}

export function deleteSelectedNode() {
	const state = useQuestEditorStore.getState();
	if (!state.selectedNodeId) return;
	const id = state.selectedNodeId;
	setGraph(
		state.nodes.filter(n => n.id !== id),
		state.edges.filter(e => e.source !== id && e.target !== id),
	);
	selectNode(null);
}

export function hideQuestEditor() {
	useQuestEditorStore.setState({
		show: false,
		selectedNodeId: null,
	});
}

export function selectQuest(questId: number) {
	const quest = useQuestEditorStore.getState().quests.find(q => q.id === questId);
	useQuestEditorStore.setState({
		selectedQuestId: questId,
		nodes: questGraphNodes(quest),
		edges: questGraphEdges(quest),
		selectedNodeId: null,
	});
}

export function setGraph(nodes: Node[], edges: Edge[]) {
	useQuestEditorStore.setState({ nodes, edges });
}

export function selectNode(nodeId: string | null) {
	useQuestEditorStore.setState({ selectedNodeId: nodeId });
}

export function updateSelectedQuest(patch: Partial<QuestMeta>) {
	const state = useQuestEditorStore.getState();
	if (state.selectedQuestId == null) return;
	const quests = state.quests.map(q => {
		if (q.id !== state.selectedQuestId) return q;
		return { ...q, ...patch };
	});
	useQuestEditorStore.setState({ quests });
}

export function updateNodeData(nodeId: string, key: string, value: string | number) {
	const state = useQuestEditorStore.getState();
	const nodes = state.nodes.map(n => {
		if (n.id !== nodeId) return n;
		return {
			...n,
			data: {
				...n.data,
				[key]: value,
			},
		};
	});
	useQuestEditorStore.setState({ nodes });
}

export function addNodeFromPalette(nodeType: string, meta: NodeTypeMeta) {
	const state = useQuestEditorStore.getState();
	const id = `n_${Date.now()}`;
	const node: Node = {
		id,
		type: 'quest',
		position: { x: 120 + state.nodes.length * 24, y: 120 + state.nodes.length * 16 },
		data: {
			nodeType,
			label: meta.title,
		},
	};
	useQuestEditorStore.setState({ nodes: state.nodes.concat(node) });
}

export function getSelectedQuest(): QuestMeta | null {
	const state = useQuestEditorStore.getState();
	if (state.selectedQuestId == null) return null;
	return state.quests.find(q => q.id === state.selectedQuestId) || null;
}

export function buildSavePayload() {
	const state = useQuestEditorStore.getState();
	const quest = getSelectedQuest();
	if (!quest) return null;
	const nodes = state.nodes.map(n => ({
		id: n.id,
		type: (n.data && n.data.nodeType) || 'notify',
		position: n.position,
		data: { ...(n.data || {}) },
	}));
	nodes.forEach(n => {
		delete (n.data as Record<string, unknown>).nodeType;
		delete (n.data as Record<string, unknown>).label;
	});
	const edges = state.edges.map(e => ({
		id: e.id,
		source: e.source,
		target: e.target,
		sourceHandle: e.sourceHandle || 'exec',
		targetHandle: e.targetHandle || 'exec',
	}));
	return {
		id: quest.id,
		key: quest.key,
		name: quest.name,
		description: quest.description,
		enabled: quest.enabled,
		autoStart: quest.autoStart,
		requireQuest: quest.requireQuest,
		repeatable: quest.repeatable,
		graph: { nodes, edges },
	};
}

export function initQuestEditorLegacyBridge() {
	Object.defineProperty(window, 'questEditor', {
		configurable: true,
		get: function () {
			return {
				hide: hideQuestEditor,
			};
		},
	});
}
