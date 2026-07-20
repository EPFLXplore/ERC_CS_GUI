/**
 * Shape of the FSM graph published on `Topics.HD_TASK_GRAPH` (`/HD/kinematics/json_graph`),
 * mirroring `SubTask.export_fsm_graph()` on the HD side:
 *
 *   nodes.append({ "index": index, "name": name, "next": next_indices })
 *   nodes.append({ "index": index, "sub_task": sub_graph })  // when source_cmd is a SubTask
 *
 * A node is either a regular command step (`name` + `next`) or a nested SubTask
 * container (`sub_task`, itself a list of nodes in the same shape).
 */
export interface FsmGraphNode {
	index: number;
	name?: string;
	next?: number[];
	sub_task?: FsmGraphNode[];
}
