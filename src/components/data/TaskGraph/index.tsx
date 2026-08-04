import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FsmGraphNode } from "../../../data/hdTaskGraph.type";
import {
	FsmLaidOutNode,
	FsmLayoutResult,
	FsmNodeKind,
	SUBTASK_HEADER_H,
	SUBTASK_PADDING,
	layoutFsmGraph,
} from "../../../utils/fsmGraphLayout";
import styles from "./style.module.sass";

interface TaskGraphProps {
	graph: FsmGraphNode[] | null;
	taskName?: string | null;
	currentCommand?: string | null;
}

const KIND_LABEL: Record<FsmNodeKind, string> = {
	start: "Start",
	step: "Step",
	decision: "Decision",
	end: "End",
	subtask: "Sub-task",
};

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 1.75;

const normalizeNodeName = (value?: string | null) => value?.trim().toLowerCase() ?? "";

const matchesNodeName = (nodeName?: string | null, activeName?: string | null) => {
	const normalizedNode = normalizeNodeName(nodeName);
	const normalizedActive = normalizeNodeName(activeName);

	if (!normalizedNode || !normalizedActive) {
		return false;
	}

	return (
		normalizedNode === normalizedActive ||
		normalizedNode.includes(normalizedActive) ||
		normalizedActive.includes(normalizedNode)
	);
};

const edgePath = (from: FsmLaidOutNode, to: FsmLaidOutNode, back: boolean, selfLoop: boolean) => {
	if (selfLoop) {
		const x = from.x + from.width;
		const yTop = from.y + from.height * 0.28;
		const yBottom = from.y + from.height * 0.72;
		const bulge = 34;
		return `M ${x} ${yTop} C ${x + bulge} ${yTop}, ${x + bulge} ${yBottom}, ${x} ${yBottom}`;
	}

	if (back) {
		const x1 = from.x + from.width / 2;
		const y1 = from.y + from.height;
		const x2 = to.x + to.width / 2;
		const y2 = to.y + to.height;
		const loopY = Math.max(y1, y2) + 56;
		return `M ${x1} ${y1} C ${x1} ${loopY}, ${x2} ${loopY}, ${x2} ${y2}`;
	}

	const x1 = from.x + from.width;
	const y1 = from.y + from.height / 2;
	const x2 = to.x;
	const y2 = to.y + to.height / 2;
	const dx = Math.max(24, (x2 - x1) / 2);
	return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
};

const FsmCanvas = ({
	layout,
	taskName,
	currentCommand,
	depth,
}: {
	layout: FsmLayoutResult;
	taskName?: string | null;
	currentCommand?: string | null;
	depth: number;
}) => {
	const idPrefix = useId();
	const activeNodeIndex = useMemo(() => {
		const candidates = [currentCommand, taskName].filter(Boolean) as string[];

		for (const candidate of candidates) {
			const matchedNode = layout.nodes.find(
				(n) => n.kind !== "subtask" && matchesNodeName(n.node.name, candidate)
			);
			if (matchedNode) {
				return matchedNode.node.index;
			}
		}

		return null;
	}, [layout.nodes, currentCommand, taskName]);

	return (
		<div
			className={styles.canvas}
			style={{ width: layout.width || 1, height: layout.height || 1 }}
		>
			<svg
				className={styles.edgesLayer}
				width={layout.width || 1}
				height={layout.height || 1}
			>
				<defs>
					<marker
						id={`${idPrefix}-fwd`}
						viewBox="0 0 10 10"
						refX="8"
						refY="5"
						markerWidth="7"
						markerHeight="7"
						orient="auto-start-reverse"
					>
						<path d="M0,0 L10,5 L0,10 z" className={styles.arrowForward} />
					</marker>
					<marker
						id={`${idPrefix}-back`}
						viewBox="0 0 10 10"
						refX="8"
						refY="5"
						markerWidth="7"
						markerHeight="7"
						orient="auto-start-reverse"
					>
						<path d="M0,0 L10,5 L0,10 z" className={styles.arrowBack} />
					</marker>
				</defs>
				{layout.edges.map((e, i) => {
					const from = layout.byIndex.get(e.from);
					const to = layout.byIndex.get(e.to);
					if (!from || !to) return null;
					const selfLoop = e.from === e.to;
					const d = edgePath(from, to, e.back, selfLoop);
					const isBack = e.back || selfLoop;
					return (
						<path
							key={`${e.from}-${e.to}-${i}`}
							d={d}
							className={isBack ? styles.edgeBack : styles.edgeForward}
							markerEnd={`url(#${idPrefix}-${isBack ? "back" : "fwd"})`}
						/>
					);
				})}
			</svg>

			{layout.nodes.map((n) => {
				const isCurrent = activeNodeIndex === n.node.index;
				const label =
					n.kind === "subtask"
						? `Sub-task #${n.node.index}`
						: n.node.name || `#${n.node.index}`;

				return (
					<div
						key={n.node.index}
						className={[
							styles.node,
							styles[`kind_${n.kind}`],
							isCurrent ? styles.current : "",
						].join(" ")}
						style={{ left: n.x, top: n.y, width: n.width, height: n.height }}
						data-task-graph-current-node={isCurrent ? "true" : undefined}
						aria-current={isCurrent ? "true" : undefined}
						title={`#${n.node.index} — ${label}`}
					>
						<div className={styles.nodeIndex}>{n.node.index}</div>
						<div className={styles.nodeLabel}>{label}</div>
						{n.kind !== "subtask" && (
							<div className={styles.nodeKindTag}>{KIND_LABEL[n.kind]}</div>
						)}
						{isCurrent && <div className={styles.currentBadge}>CURRENT</div>}

						{n.nested && (
							<div
								className={styles.nestedWrap}
								style={{
									top: SUBTASK_HEADER_H + SUBTASK_PADDING,
									left: (n.width - n.nested.width) / 2,
								}}
							>
								<FsmCanvas
									layout={n.nested}
									taskName={taskName}
									currentCommand={currentCommand}
									depth={depth + 1}
								/>
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
};

const Legend = () => (
	<div className={styles.legend}>
		<span className={`${styles.legendItem} ${styles.kind_start}`}>Start</span>
		<span className={`${styles.legendItem} ${styles.kind_step}`}>Step</span>
		<span className={`${styles.legendItem} ${styles.kind_decision}`}>Decision</span>
		<span className={`${styles.legendItem} ${styles.kind_end}`}>End</span>
		<span className={`${styles.legendItem} ${styles.kind_subtask}`}>Sub-task</span>
		<span className={`${styles.legendItem} ${styles.current}`}>Current</span>
	</div>
);

const TaskGraph = ({ graph, taskName, currentCommand }: TaskGraphProps) => {
	const layout = useMemo(() => layoutFsmGraph(graph ?? []), [graph]);
	const viewportRef = useRef<HTMLDivElement | null>(null);
	const [zoom, setZoom] = useState(1);

	const hasGraph = !!graph && graph.length > 0;
	const hasCurrentCommand = Boolean(currentCommand && currentCommand !== "none yet");

	useEffect(() => {
		if (!hasGraph || !hasCurrentCommand) {
			return;
		}

		const viewport = viewportRef.current;
		if (!viewport) {
			return;
		}

		const currentNode = viewport.querySelector<HTMLElement>(
			'[data-task-graph-current-node="true"]'
		);
		if (!currentNode) {
			return;
		}

		const viewportRect = viewport.getBoundingClientRect();
		const nodeRect = currentNode.getBoundingClientRect();
		const top = viewport.scrollTop + (nodeRect.top - viewportRect.top) - (viewportRect.height - nodeRect.height) / 2;
		const left = viewport.scrollLeft + (nodeRect.left - viewportRect.left) - (viewportRect.width - nodeRect.width) / 2;

		viewport.scrollTo({ top: Math.max(0, top), left: Math.max(0, left), behavior: "smooth" });
	}, [hasCurrentCommand, hasGraph, layout.height, layout.width, currentCommand, taskName, zoom]);

	return (
		<div className={styles.container}>
			<div className={styles.headerRow}>
				<h3 className={styles.title}>HD Task Graph</h3>
				<div className={styles.zoomControls}>
					<button
						type="button"
						onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - 0.15).toFixed(2)))}
					>
						−
					</button>
					<span>{Math.round(zoom * 100)}%</span>
					<button
						type="button"
						onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + 0.15).toFixed(2)))}
					>
						+
					</button>
					<button type="button" onClick={() => setZoom(1)}>
						Reset
					</button>
				</div>
			</div>

			<div className={styles.subHeaderRow}>
				<span className={styles.taskName}>
					Task: <strong>{taskName && taskName !== "none yet" ? taskName : "—"}</strong>
				</span>
				<span className={styles.currentCommand}>
					Command:{" "}
					<strong>
						{currentCommand && currentCommand !== "none yet" ? currentCommand : "—"}
					</strong>
				</span>
			</div>

			<div className={styles.viewport} ref={viewportRef}>
				{hasGraph ? (
					<div
						className={styles.zoomWrap}
						style={{ transform: `scale(${zoom})` }}
					>
						<FsmCanvas layout={layout} taskName={taskName} currentCommand={currentCommand} depth={0} />
					</div>
				) : (
					<div className={styles.placeholder}>No task graph received yet.</div>
				)}
			</div>

			<Legend />
		</div>
	);
};

export default TaskGraph;
