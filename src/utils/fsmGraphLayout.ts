import { FsmGraphNode } from "../data/hdTaskGraph.type";

/**
 * Pure, dependency-free layered layout for the HD FSM graph published on
 * `Topics.HD_TASK_GRAPH` (see `SubTask.export_fsm_graph`). No layout library is
 * available in this project, so this hand-rolled BFS layering + fixed-size boxes
 * stands in for something like dagre: nodes are grouped into columns by BFS
 * distance from the root(s), edges that don't strictly move forward a column
 * (loops/retries, e.g. step 7 -> step 6) are flagged `back` so the renderer can
 * draw them as distinct looping curves instead of straight arrows.
 */

export const BASE_NODE_W = 210;
export const BASE_NODE_H = 60;
export const COL_GAP = 72;
export const ROW_GAP = 22;
export const SUBTASK_PADDING = 18;
export const SUBTASK_HEADER_H = 30;
const DEPTH_SCALE = 0.86;
const MIN_NODE_W = 130;
const MIN_NODE_H = 40;

export type FsmNodeKind = "start" | "end" | "decision" | "subtask" | "step";

export interface FsmLaidOutNode {
	node: FsmGraphNode;
	kind: FsmNodeKind;
	depth: number;
	x: number;
	y: number;
	width: number;
	height: number;
	/** Present when `node.sub_task` exists; positions are already relative to this node's box. */
	nested?: FsmLayoutResult;
}

export interface FsmLaidOutEdge {
	from: number;
	to: number;
	back: boolean;
}

export interface FsmLayoutResult {
	nodes: FsmLaidOutNode[];
	edges: FsmLaidOutEdge[];
	width: number;
	height: number;
	byIndex: Map<number, FsmLaidOutNode>;
}

const sizeForDepth = (depth: number) => {
	const scale = Math.pow(DEPTH_SCALE, depth);
	return {
		w: Math.max(MIN_NODE_W, BASE_NODE_W * scale),
		h: Math.max(MIN_NODE_H, BASE_NODE_H * scale),
	};
};

const classifyNode = (node: FsmGraphNode, hasIncoming: boolean): FsmNodeKind => {
	if (node.sub_task) return "subtask";
	const nextCount = node.next?.length ?? 0;
	if (!hasIncoming) return "start";
	if (nextCount === 0) return "end";
	if (nextCount > 1) return "decision";
	return "step";
};

export function layoutFsmGraph(nodes: FsmGraphNode[], depth = 0): FsmLayoutResult {
	if (!nodes || nodes.length === 0) {
		return { nodes: [], edges: [], width: 0, height: 0, byIndex: new Map() };
	}

	const byIndex = new Map<number, FsmGraphNode>();
	nodes.forEach((n) => byIndex.set(n.index, n));

	const edges: FsmLaidOutEdge[] = [];
	const indeg = new Map<number, number>();
	nodes.forEach((n) => indeg.set(n.index, 0));
	nodes.forEach((n) => {
		(n.next ?? []).forEach((t) => {
			if (!byIndex.has(t)) return; // dangling reference, ignore defensively
			indeg.set(t, (indeg.get(t) ?? 0) + 1);
		});
	});

	const layer = new Map<number, number>();
	const visited = new Set<number>();

	const bfsFrom = (rootIndex: number, startLayer: number) => {
		const queue: number[] = [rootIndex];
		layer.set(rootIndex, startLayer);
		visited.add(rootIndex);
		let head = 0;
		while (head < queue.length) {
			const u = queue[head++];
			const L = layer.get(u) ?? startLayer;
			const un = byIndex.get(u);
			for (const t of un?.next ?? []) {
				if (!byIndex.has(t)) continue;
				if (!visited.has(t)) {
					layer.set(t, L + 1);
					visited.add(t);
					queue.push(t);
				}
				// else: edge into an already-placed node; layering left as-is,
				// classified as a back edge below once all layers are final.
			}
		}
	};

	let roots = nodes.filter((n) => (indeg.get(n.index) ?? 0) === 0);
	if (roots.length === 0) roots = [nodes.reduce((a, b) => (a.index < b.index ? a : b))];
	roots
		.slice()
		.sort((a, b) => a.index - b.index)
		.forEach((r) => {
			if (!visited.has(r.index)) bfsFrom(r.index, 0);
		});

	// Disconnected remainders (shouldn't normally happen, but stay defensive).
	nodes
		.slice()
		.sort((a, b) => a.index - b.index)
		.forEach((n) => {
			if (!visited.has(n.index)) bfsFrom(n.index, 0);
		});

	nodes.forEach((n) => {
		(n.next ?? []).forEach((t) => {
			if (!byIndex.has(t)) return;
			const from = layer.get(n.index) ?? 0;
			const to = layer.get(t) ?? 0;
			edges.push({ from: n.index, to: t, back: to <= from });
		});
	});

	// Group into columns, sized bottom-up (subtask nodes recurse first).
	const maxLayer = Math.max(...nodes.map((n) => layer.get(n.index) ?? 0));
	const columns: FsmGraphNode[][] = Array.from({ length: maxLayer + 1 }, () => []);
	nodes.forEach((n) => columns[layer.get(n.index) ?? 0].push(n));
	columns.forEach((col) => col.sort((a, b) => a.index - b.index));

	const laidOut: FsmLaidOutNode[] = [];
	const laidByIndex = new Map<number, FsmLaidOutNode>();
	const base = sizeForDepth(depth);

	const boxes = columns.map((col) =>
		col.map((n) => {
			const kind = classifyNode(n, (indeg.get(n.index) ?? 0) > 0);
			if (n.sub_task && n.sub_task.length > 0) {
				const nested = layoutFsmGraph(n.sub_task, depth + 1);
				const width = Math.max(base.w, nested.width + SUBTASK_PADDING * 2);
				const height = SUBTASK_HEADER_H + nested.height + SUBTASK_PADDING * 2;
				return { node: n, kind, depth, width, height, nested };
			}
			return { node: n, kind, depth, width: base.w, height: base.h };
		})
	);

	const colWidths = boxes.map((col) => (col.length ? Math.max(...col.map((b) => b.width)) : base.w));
	const colContentHeights = boxes.map(
		(col) => col.reduce((sum, b) => sum + b.height, 0) + Math.max(0, col.length - 1) * ROW_GAP
	);
	const maxColumnHeight = Math.max(0, ...colContentHeights);

	let xCursor = 0;
	for (let l = 0; l < boxes.length; l++) {
		const colOffsetY = (maxColumnHeight - colContentHeights[l]) / 2;
		let yCursor = colOffsetY;
		for (const b of boxes[l]) {
			const x = xCursor + (colWidths[l] - b.width) / 2;
			const y = yCursor;
			const placed: FsmLaidOutNode = { ...b, x, y };
			laidOut.push(placed);
			laidByIndex.set(b.node.index, placed);
			yCursor += b.height + ROW_GAP;
		}
		xCursor += colWidths[l] + COL_GAP;
	}

	const width = Math.max(0, xCursor - COL_GAP);
	const height = maxColumnHeight;

	return { nodes: laidOut, edges, width, height, byIndex: laidByIndex };
}
