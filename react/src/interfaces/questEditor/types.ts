import type { Edge, Node } from '@xyflow/react';

export interface QuestMeta {
	id: number;
	key: string;
	name: string;
	description: string;
	enabled: boolean;
	autoStart: string;
	requireQuest: string | null;
	repeatable: boolean;
	graph: { nodes: Node[]; edges: Edge[] };
}

export interface NodeTypeMeta {
	type: string;
	title: string;
	category: string;
	outputs: string[];
	params: Array<{
		key: string;
		label: string;
		kind: string;
		options?: Array<{ value: string; label: string }>;
	}>;
}

export interface SignalMeta {
	name: string;
	label: string;
	fields: string[];
}

export interface JobMeta {
	id: number;
	name: string;
}

export interface NpcOption {
	key: string;
	name: string;
}

export interface EditorPayload {
	quests: QuestMeta[];
	nodeTypes: NodeTypeMeta[];
	signals: SignalMeta[];
	jobs: JobMeta[];
	npcs: NpcOption[];
}
