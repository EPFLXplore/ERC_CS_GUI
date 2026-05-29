import React from "react";
import styles from "./style.module.sass";
import SubSystems from "../../../data/subsystems.type";
import { AlertColor } from "@mui/material";
import * as ROSLIB from "roslib";
import { resetDrillHome } from "../../../utils/drillActions";

/*
Author: Ugo Balducci and Giovanni Ranieri
Year: 2024
Description: Drill Modal. You can send commands to the drill. Auto will execute the complete FSM

Additionally, the modal implements small actions like step up and step down, where the drill will move
up and down by a small amount. Clicking on the buttons will send directly the commands, without clicking on the
"Set Task" button.
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
	OPEN = "Open",
	SEMI_RETURN = "semi_return",
	TEST_AUTO = "test_auto"
}

enum DrillSmallActions {
	STEP_DOWN = "step_down",
    STEP_UP = "step_up"
}

/** Matches `uint16` ceiling in `custom_msg/action/DrillCmd.action` (max 65535); UI cap per ops need. */
const MAX_DRILL_STEP_INCREMENT = 64000;

function clampStepIncrement(n: number): number {
	if (!Number.isFinite(n) || n <= 0) return 0;
	return Math.min(Math.trunc(n), MAX_DRILL_STEP_INCREMENT);
}

interface DrillGoalModalProps {
	task: DrillSmallActions,
	multiple_increment: number
}

function DrillGoalModal({
	ros,
	onSetGoal,
	onClose,
	onCancelGoal,
	snackBar,
}: {
	ros: ROSLIB.Ros | null;
	onSetGoal: (system: string, actionArgs: Object) => void;
	onClose: () => void;
	onCancelGoal: (system: string) => void;
	snackBar: (sev: AlertColor, mes: string) => void;
}) {
	const [task, setTask] = React.useState<DrillTask | null>(null);
	const [actionSmallTask, setActionSmallTask] = React.useState<DrillGoalModalProps>({
		task: DrillSmallActions.STEP_DOWN,
		multiple_increment: 0
	});

	const handleSmallStepCountChange = (value: string) => {
		const parsedValue = Number.parseInt(value, 10);
		setActionSmallTask((prev) => ({
			...prev,
			multiple_increment: clampStepIncrement(parsedValue),
		}));
	};

	return (
		<div className={styles.Background} onClick={onClose}>
			<div
				className={styles.Modal}
				onClick={(e) => {
					e.stopPropagation();
				}}
			>
				<div className={styles.ModalHeader}>
					<h1>Drill Task</h1>
				</div>
				<div className={styles.ModalContent}>

					<div className={styles.ChoiceGroup}>
					{Object.values(DrillTask).map((_task) => (
						<button
							key={_task}
							className={`${styles.Choice} ${task === _task ? styles.Selected : ""}`}
							onClick={() => setTask(_task)}
						>
							{_task}
						</button>
					))}
					</div>
				</div>

				<div className={styles.ModalContent}>

					<div className={styles.ChoiceGroup}>
					{Object.values(DrillSmallActions).map((_action) => (
						<button
							key={_action}
							className={`${styles.Choice}`}
							onClick={() => {

								if (actionSmallTask.task === _action) {
									setActionSmallTask({
										task: _action,
										multiple_increment: Math.min(
											MAX_DRILL_STEP_INCREMENT,
											actionSmallTask.multiple_increment + 1
										),
									});
								} else {
									setActionSmallTask({
										task: _action,
										multiple_increment: 1
									});
								}

								console.log("Action Small Task: ", actionSmallTask);

								//onSetGoal(SubSystems.DRILL, { action: _action.toLowerCase() });
							}}
						>
							{_action} : {actionSmallTask.task == _action ? actionSmallTask.multiple_increment : 0}
						</button>
					))}
					</div>

					<div className={styles.StepInputRow}>
						<label className={styles.StepLabel} htmlFor="drill-step-count">
							Steps
						</label>
						<input
							id="drill-step-count"
							type="number"
							min={0}
							max={MAX_DRILL_STEP_INCREMENT}
							step={1}
							inputMode="numeric"
							className={styles.StepInput}
							value={actionSmallTask.multiple_increment}
							onChange={(event) => handleSmallStepCountChange(event.target.value)}
							aria-label="Drill step count"
						/>
					</div>
				</div>

				<div className={styles.ModalContent}>
					<div className={styles.ChoiceGroup}>
						<button
							type="button"
							className={styles.Choice}
							onClick={() => resetDrillHome(ros, snackBar)}
						>
							Home Drill Translation
						</button>
					</div>
				</div>

				<div className={styles.ModalFooter}>
					<button
						onClick={() => {
							if (task) {
								onSetGoal(SubSystems.DRILL, { action: task.toLowerCase() });
								onClose();
							} else if (actionSmallTask.task) {
								onSetGoal(SubSystems.DRILL, {
									action: actionSmallTask.task.toLowerCase(),
									multiple_increment: actionSmallTask.multiple_increment
								});
								onClose();
							} else {
								snackBar("error", "No task selected");
								onClose();
							}
						}}
						className={`${styles.PrimaryColor}`}
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
