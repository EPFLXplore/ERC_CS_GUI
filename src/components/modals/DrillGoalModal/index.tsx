import React from "react";
import styles from "./style.module.sass";
import SubSystems from "../../../data/subsystems.type";
import { AlertColor } from "@mui/material";
import * as ROSLIB from "roslib";
import { resetDrillHome } from "../../../utils/drillActions";
import { roundToTwoDecimals } from "../../../utils/maths";
import { Topics } from "../../../data/topics.type";

/*
Author: Ugo Balducci and Giovanni Ranieri
Year: 2024
Description: Drill Modal. You can send commands to the drill. Auto will execute the complete FSM

Additionally, the modal implements small actions like step up and step down. Select the direction,
adjust the step count with the slider, then press "Set Task".
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
	TEST_AUTO = "test_auto",
	RELEASE_AUTO = "release_auto"
}

enum DrillSmallActions {
	STEP_DOWN = "step_down",
    STEP_UP = "step_up"
}

const MIN_DRILL_POSITION_CM = 0;
const MAX_DRILL_POSITION_CM = 55;

const MIN_STEPS = 0;
const MAX_STEPS = 50;

/** Matches `uint16` ceiling in `custom_msg/action/DrillCmd.action` (max 65535); UI cap per ops need. */
const MAX_DRILL_STEP_INCREMENT = 64000;

function clampSteps(n: number): number {
	if (!Number.isFinite(n)) return MIN_STEPS;
	return Math.min(MAX_STEPS, Math.max(MIN_STEPS, Math.trunc(n)));
}

function clampStepIncrement(n: number): number {
	if (!Number.isFinite(n) || n <= 0) return 0;
	return Math.min(Math.trunc(n), MAX_DRILL_STEP_INCREMENT);
}

function clampAbsolutePositionCm(n: number): number {
	if (!Number.isFinite(n)) return MIN_DRILL_POSITION_CM;
	return Math.min(MAX_DRILL_POSITION_CM, Math.max(MIN_DRILL_POSITION_CM, Math.round(n)));
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
	const [positionCm, setPositionCm] = React.useState<number | null>(null);
	const [commandMode, setCommandMode] = React.useState<"absolute" | "task" | "step" | "resetHome">("absolute");

	React.useEffect(() => {
		if (!ros) {
			setPositionCm(null);
			return;
		}

		const listener = new ROSLIB.Topic({
			ros,
			name: Topics.DRILL_STATE,
			messageType: "std_msgs/String",
			queue_length: 1,
			queue_size: 1,
		});

		listener.subscribe((message) => {
			try {
				const raw = (message as { data?: unknown }).data;
				const data =
					typeof raw === "string"
						? JSON.parse(raw)
						: raw && typeof raw === "object"
							? raw
							: JSON.parse(String(raw));
				const pos = data?.motors?.motor_module?.position;
				setPositionCm(typeof pos === "number" ? pos : null);
			} catch {
				setPositionCm(null);
			}
		});

		return () => listener.unsubscribe();
	}, [ros]);

	const currentAbsolutePositionCm =
		positionCm === null ? null : clampAbsolutePositionCm(Math.abs(positionCm));
	const [task, setTask] = React.useState<DrillTask | null>(null);
	const [actionSmallTask, setActionSmallTask] = React.useState<DrillGoalModalProps>({
		task: DrillSmallActions.STEP_DOWN,
		multiple_increment: 1
	});
	const [targetPositionCm, setTargetPositionCm] = React.useState<number>(0);

	const handleStepSliderChange = (value: string) => {
		const parsedValue = Number.parseInt(value, 10);
		setCommandMode("step");
		setActionSmallTask((prev) => ({
			...prev,
			multiple_increment: clampSteps(parsedValue),
		}));
	};

	const handleAbsolutePositionChange = (value: string) => {
		const parsedValue = Number.parseInt(value, 10);
		setCommandMode("absolute");
		setTargetPositionCm(clampAbsolutePositionCm(parsedValue));
	};

	const sendDrillGoal = () => {
		if (commandMode === "resetHome") {
			resetDrillHome(ros, snackBar);
			return;
		}

		if (commandMode === "task" && task) {
			onSetGoal(SubSystems.DRILL, { action: task.toLowerCase() });
			return;
		}

		if (commandMode === "step") {
			if (actionSmallTask.multiple_increment <= 0) {
				snackBar("error", "Step count must be greater than 0");
				return;
			}
			onSetGoal(SubSystems.DRILL, {
				action: actionSmallTask.task.toLowerCase(),
				multiple_increment: actionSmallTask.multiple_increment,
			});
			return;
		}

		if (currentAbsolutePositionCm === null) {
			snackBar("error", "Drill position data is not available");
			return;
		}

		const targetAbsolutePositionCm = clampAbsolutePositionCm(targetPositionCm);
		const deltaCm = targetAbsolutePositionCm - currentAbsolutePositionCm;

		if (deltaCm === 0) {
			snackBar("info", "Drill is already at the selected position");
			return;
		}

		onSetGoal(SubSystems.DRILL, {
			action: deltaCm > 0 ? DrillSmallActions.STEP_DOWN : DrillSmallActions.STEP_UP,
			multiple_increment: Math.abs(deltaCm),
		});
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
				<div className={styles.PositionPanel}>
					<div className={styles.PositionPanelHeader}>
						<span className={styles.PositionPanelTitle}>Absolute position</span>
						<span className={styles.PositionPanelHint}>0 cm at the top, 55 cm at the bottom</span>
					</div>
					<div className={styles.PositionSliderRow}>
						<div className={styles.PositionSliderWrap}>
							<input
								className={styles.VerticalSlider}
								type="range"
								min={MIN_DRILL_POSITION_CM}
								max={MAX_DRILL_POSITION_CM}
								step={1}
								value={targetPositionCm}
								onChange={(event) => handleAbsolutePositionChange(event.target.value)}
								aria-label="Absolute drill position"
							/>
						</div>
					</div>
					<div className={styles.PositionReadout}>
						<span className={styles.PositionReadoutLabel}>Current</span>
						<span className={styles.PositionReadoutValue}>
							{currentAbsolutePositionCm === null ? "NO DATA" : `${roundToTwoDecimals(currentAbsolutePositionCm)} cm`}
						</span>
						<span className={styles.PositionReadoutLabel}>Target</span>
						<span className={styles.PositionReadoutValue}>{targetPositionCm} cm</span>
					</div>
				</div>
				<div className={styles.ModalContent}>

					<div className={styles.ChoiceGroup}>
					{Object.values(DrillTask).map((_task) => (
						<button
							key={_task}
							className={`${styles.Choice} ${commandMode === "task" && task === _task ? styles.Selected : ""}`}
							onClick={() => {
								setCommandMode("task");
								setTask(_task);
							}}
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
							className={`${styles.Choice} ${commandMode === "step" && actionSmallTask.task === _action ? styles.Selected : ""}`}
							onClick={() => {
								setCommandMode("step");
								setActionSmallTask((prev) => ({
									task: _action,
									multiple_increment:
										prev.task === _action ? prev.multiple_increment : Math.max(1, prev.multiple_increment),
								}));
							}}
						>
							{_action} : {actionSmallTask.task === _action ? actionSmallTask.multiple_increment : 0}
						</button>
					))}
					</div>

					<div className={styles.StepSliderRow}>
						<span className={styles.StepScaleLabel}>{MIN_STEPS}</span>
						<div className={styles.StepSliderWrap}>
							<input
								className={styles.HorizontalSlider}
								type="range"
								min={MIN_STEPS}
								max={MAX_STEPS}
								step={1}
								value={actionSmallTask.multiple_increment}
								disabled={commandMode !== "step"}
								onChange={(event) => handleStepSliderChange(event.target.value)}
								aria-label={`${actionSmallTask.task} step count`}
							/>
						</div>
						<span className={styles.StepScaleLabel}>{MAX_STEPS}</span>
					</div>
					{commandMode === "step" && (
						<div className={styles.StepReadout}>
							<span className={styles.StepReadoutLabel}>Selected</span>
							<span className={styles.StepReadoutValue}>{actionSmallTask.task}</span>
							<span className={styles.StepReadoutLabel}>Steps</span>
							<span className={styles.StepReadoutValue}>{actionSmallTask.multiple_increment}</span>
						</div>
					)}
				</div>

				<div className={styles.ModalContent}>
					<div className={styles.ChoiceGroup}>
						<button
							type="button"
							className={`${styles.Choice} ${commandMode === "resetHome" ? styles.Selected : ""}`}
							onClick={() => setCommandMode("resetHome")}
						>
							Home Drill Translation
						</button>
					</div>
				</div>

				<div className={styles.ModalFooter}>
					<button
						type="button"
						onClick={() => {
							sendDrillGoal();
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
