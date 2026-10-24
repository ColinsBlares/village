import React, { memo, useCallback, useMemo } from 'react';
import {
	ReactFlow,
	Background,
	Controls,
	MiniMap,
	addEdge,
	applyNodeChanges,
	applyEdgeChanges,
	type Connection,
	type Edge,
	type Node,
	type NodeChange,
	type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import QuestFlowNode from '../QuestFlowNode';
import { setGraph, selectNode, useQuestEditorStore } from '../../store';
import styles from './index.module.css';

const nodeTypes = { quest: QuestFlowNode };

function FlowCanvasView() {
	const nodes = useQuestEditorStore(state => state.nodes);
	const edges = useQuestEditorStore(state => state.edges);

	const onNodesChange = useCallback((changes: NodeChange[]) => {
		const state = useQuestEditorStore.getState();
		const next = applyNodeChanges(changes, state.nodes);
		setGraph(next, state.edges);
	}, []);

	const onEdgesChange = useCallback((changes: EdgeChange[]) => {
		const state = useQuestEditorStore.getState();
		const next = applyEdgeChanges(changes, state.edges);
		setGraph(state.nodes, next);
	}, []);

	const onConnect = useCallback((connection: Connection) => {
		const state = useQuestEditorStore.getState();
		const edge: Edge = {
			...connection,
			id: `e_${Date.now()}`,
			sourceHandle: connection.sourceHandle || 'exec',
			targetHandle: connection.targetHandle || 'exec',
		} as Edge;
		setGraph(state.nodes, addEdge(edge, state.edges));
	}, []);

	const onSelectionChange = useCallback((params: { nodes: Node[] }) => {
		const id = params.nodes.length ? params.nodes[0].id : null;
		selectNode(id);
	}, []);

	const flowNodes = useMemo(() => nodes, [nodes]);
	const flowEdges = useMemo(() => edges, [edges]);

	return (
		<div className={styles.canvas}>
			<ReactFlow
				nodes={flowNodes}
				edges={flowEdges}
				nodeTypes={nodeTypes}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				onSelectionChange={onSelectionChange}
				fitView
				deleteKeyCode={['Delete', 'Backspace']}
			>
				<Background gap={16} color="#2a3140" />
				<Controls />
				<MiniMap />
			</ReactFlow>
		</div>
	);
}

export default memo(FlowCanvasView);
