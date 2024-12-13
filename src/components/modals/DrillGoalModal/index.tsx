import React, { useEffect } from "react";
import styles from "./style.module.sass";
import SubSystems from "../../../data/subsystems.type";
import { AlertColor } from "@mui/material";

/*
Author: Ugo Balducci and Giovanni Ranieri
Year: 2024
Description: Drill Modal. You can send commands to the drill. Auto will execute the complete FSM:
	START => DOWN => UP => OPEN => RELEASE => CLOSE => STOP
*/

enum DrillTask {
	AUTO = "Auto",
	START = "Start",
	DOWN = "Down",
	RELEASE = "Release",
	UP = "Up",
	ABORT = "Abort",
	STOP = "Stop",
	CLOSE = "Close",
	OPEN = "Open"
}

function DrillGoalModal({
	roverState,
	onSetGoal,
	onClose,
	onCancelGoal,
	snackBar,
}: {
	roverState: any,
	onSetGoal: (system: string, actionArgs: Object) => void;
	onClose: () => void;
	onCancelGoal: (system: string) => void;
	snackBar: (sev: AlertColor, mes: string) => void;
}) {
	const [task, setTask] = React.useState<DrillTask | null>(null);

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
					{task ? (
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

				<div className={styles.ModalHeader}>
					<h2>Drill Feedback</h2>
				</div>
				<div
					className={styles.ModalFeedback}
				>
					<span style={{display: 'block'}} color={`${
						Number(roverState['drill']['state']['warning_type']) != 0 ? 'red' : 'white' 
					}`}>
						{`${!roverState['rover'] ? "" : 
							roverState['drill']['state']['current_status']
						}`}
					</span>
				</div>

				<div className={styles.ModalFooter}>
					<button
						onClick={() => {
							if (task) {
								onSetGoal(SubSystems.DRILL, { action: task.toLowerCase() });
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
							onCancelGoal(SubSystems.DRILL);
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
