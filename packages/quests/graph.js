"use strict";

function parseGraph(raw) {
	if (!raw) return { nodes: [], edges: [] };
	if (typeof raw === "object") return raw;
	try {
		return JSON.parse(raw);
	} catch (e) {
		return { nodes: [], edges: [] };
	}
}

function parseVars(raw) {
	if (!raw) return {};
	if (typeof raw === "object") return raw;
	try {
		return JSON.parse(raw);
	} catch (e) {
		return {};
	}
}

function getNode(graph, id) {
	if (!graph || !graph.nodes) return null;
	return graph.nodes.find(n => n.id === id) || null;
}

function getStartNode(graph) {
	if (!graph || !graph.nodes) return null;
	return graph.nodes.find(n => n.type === "start") || null;
}

function getEdge(graph, nodeId, sourceHandle) {
	if (!graph || !graph.edges) return null;
	const handle = sourceHandle || "exec";
	return (
		graph.edges.find(
			e => e.source === nodeId && (e.sourceHandle || "exec") === handle,
		) || null
	);
}

function sanitizeGraphForSave(graph) {
	const nodes = (graph.nodes || []).map(n => ({
		id: n.id,
		type: n.type,
		position: n.position,
		data: n.data || {},
	}));
	const edges = (graph.edges || []).map(e => ({
		id: e.id,
		source: e.source,
		target: e.target,
		sourceHandle: e.sourceHandle || "exec",
		targetHandle: e.targetHandle || "exec",
	}));
	return { nodes, edges };
}

module.exports = {
	parseGraph,
	parseVars,
	getNode,
	getStartNode,
	getEdge,
	sanitizeGraphForSave,
};
