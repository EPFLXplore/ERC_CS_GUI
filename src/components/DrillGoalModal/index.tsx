import React from "react";
import styles from "./style.module.sass";
import { Pose2D } from "../../utils/CustomMsgObjects";
import SubSystems from "../../utils/SubSystems";

enum DrillTask {
	START = "Start",
	DOWN = "Down",
	RELEASE = "Release",
	UP = "Up",
	ABORT = "Abort",
	STOP = "Stop",
}

function DrillGoalModal({
	onSetGoal,
	onClose,
	onCancelGoal,
	currentTask = undefined,
	snackBar,
}: {
	onSetGoal: (system: string, ...args: any[]) => void;
	onClose: () => void;
	onCancelGoal: (system: string) => void;
	currentTask?: DrillTask;
	snackBar: (sev: string, mes: string) => void;
}) {
	const [task, setTask] = React.useState<DrillTask | null>(null);
	const [orientation, setOrientation] = React.useState(0);

	return (
		<div className={styles.Background} onClick={onClose}>
			<div
				className={styles.Modal}
				onClick={(e) => {
					e.stopPropagation();
				}}
			>
				<div className={styles.ModalHeader}>
					<h1>Set Drill Task</h1>
				</div>
				<div className={styles.ModalContent}>
					{currentTask ? (
						<p>Current Task is {currentTask}.</p>
					) : task ? (
						<p>Selected Task is {task}.</p>
					) : (
						<p>No current task set.</p>
					)}

					<div className={styles.ChoiceGroup}>
						{Object.values(DrillTask).map((_task) => (
							<button
								className={`${styles.Choice} ${
									task === _task ? styles.Selected : ""
								}`}
								onClick={() => setTask(_task)}
							>
								{_task}
							</button>
						))}
					</div>
				</div>

				<div className={styles.ModalFooter}>
					<button
						onClick={() => {
							if (task) {
								onSetGoal(SubSystems.DRILL, task);
								onClose();
							} else {
								snackBar("error", "No task selected");
							}
						}}
						className={styles.PrimaryColor}
					>
						Set Task
					</button>
					<button
						onClick={() => {
							onCancelGoal(SubSystems.NAGIVATION);
							onClose();
						}}
					>
						Cancel Task
					</button>
				</div>
			</div>
		</div>
	);
}

export default DrillGoalModal;
