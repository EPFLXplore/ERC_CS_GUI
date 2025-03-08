import React from "react";
import styles from "./style.module.sass";
import SubSystems from "../../../data/subsystems.type";
import { AlertColor } from "@mui/material";

/*
Author: Ugo Balducci
Year: 2023
Description: HD Modal. We select a task and then send it through the send task button. We can cancel a task
using the cancel task button.
*/

type ArmTask = {
	name: string;
	msg: string;
};

function ArmGoalModal({
	onSetGoal,
	onClose,
	onCancelGoal,
	currentTask = undefined,
	snackBar,
	resetHdConfirmation,
}: {
	onSetGoal: (system: string, actionArgs: Object) => void;
	onClose: () => void;
	onCancelGoal: (system: string) => void;
	currentTask?: ArmTask;
	snackBar: (sev: AlertColor, mes: string) => void;
	resetHdConfirmation: ((confirm: boolean) => void) | null;
}) {
	const [task, setTask] = React.useState<ArmTask | null>(null);

	return (
		<div className={styles.Background} onClick={onClose}>
			<div
				className={styles.Modal}
				onClick={(e) => {
					e.stopPropagation();
				}}
			>
				<div className={styles.ModalHeader}>
					<h1>Set Arm Task</h1>
				</div>
				<div className={styles.ModalContent}>
					{currentTask ? (
						<p>Current Task is {currentTask.name}.</p>
					) : task ? (
						<p>Selected Task is {task.name}.</p>
					) : (
						<p>No current task set.</p>
					)}

					<div className={styles.ChoiceGroup}>
						<p className={styles.ChoiceCategory}>Basic Switches</p>
						<button
							className={`${styles.Choice} ${
								task?.name === "Main Switch" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Main Switch", msg: "switch_main" })}
						>
							Main Switch
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Switch 1" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Switch 1", msg: "switch_1" })}
						>
							Switch 1
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Switch 2" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Switch 2", msg: "switch_2" })}
						>
							Switch 2
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Switch 3" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Switch 3", msg: "switch_3" })}
						>
							Switch 3
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Switch 4" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Switch 4", msg: "switch_4"})}
						>
							Switch 4
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Switch 5" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Switch 5", msg: "switch_5" })}
						>
							Switch 5
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Switch 6" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Switch 6",msg: "switch_6" })}
						>
							Switch 6
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Switch 7" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Switch 7", msg: "switch_7" })}
						>
							Switch 7
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Switch 8" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Switch 8", msg: "switch_8" })}
						>
							Switch 8
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Switch 9" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Switch 9", msg: "switch_9"})}
						>
							Switch 9
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Switch 10" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Switch 10", msg: "switch_10" })}
						>
							Switch 10
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Switch 11" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Switch 11", msg: "switch_11" })}
						>
							Switch 11
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Switch 12" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Switch 12", msg: "switch_12" })}
						>
							Switch 12
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Switch 13" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Switch 13", msg: "switch_13" })}
						>
							Switch 13
						</button>
						<p className={styles.ChoiceCategory}>Other</p>
						<button
							className={`${styles.Choice} ${
								task?.name === "Electromagnet" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Electromagnet", msg: "electromagnet" })}
						>
							Electromagnet
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Socket 1" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Socket 1", msg: "socket_1" })}
						>
							Socket 1
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Socket 2" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Socket 2", msg: "socket_2" })}
						>
							Socket 2
						</button>
						<p className={styles.ChoiceCategory}>Control and Power Switches</p>
						<button
							className={`${styles.Choice} ${
								task?.name === "Control Switch 1" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Control Switch 1", msg: "control_switch_1" })}
						>
							Control Switch 1
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Control Switch 1" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Control Switch 2", msg: "control_switch_2" })}
						>
							Control Switch 2
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Control Switch 1" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Control Switch 3", msg: "control_switch_3" })}
						>
							Control Switch 3
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Control Switch 1" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Control Switch 4", msg: "control_switch_4" })}
						>
							Control Switch 4
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Control Switch 1" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Control Switch 5", msg: "control_switch_5" })}
						>
							Control Switch 5
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Power Switch 1" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Power Switch 1", msg: "power_switch_1" })}
						>
							Power Switch 1
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Power Switch 2" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Power Switch 2", msg: "power_switch_2" })}
						>
							Power Switch 2
						</button>
						<p className={styles.ChoiceCategory}>Predefined Positions</p>
						<button
							className={`${styles.Choice} ${
								task?.name === "Home Position" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Home Position", msg: "home"})}
						>
							Home Position
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Zero" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Zero", msg: "zero"})}
						>
							Zero
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Cobra" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Cobra", msg: "cobra"})}
						>
							Cobra
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Sad" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Sad", msg: "sad"})}
						>
							Sad Arm
						</button>
						<p className={styles.ChoiceCategory}>Tasks</p>
						<button
							className={`${styles.Choice} ${
								task?.name === "Pick Rock" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Pick Rock", msg: "" })}
						>
							Pick Rock
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Pick Probe" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Pick Probe", msg: "" })}
						>
							Pick Probe
						</button>
					</div>
				</div>

				<div className={styles.ModalFooter}>
					<button
						onClick={() => {
							if (task) {
								onSetGoal(SubSystems.HANDLING_DEVICE, {
									action: task.msg
								});
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
							onCancelGoal(SubSystems.HANDLING_DEVICE);
							if(resetHdConfirmation) {
								resetHdConfirmation(false);
							}
						}}
					>
						Cancel Task
					</button>
				</div>
			</div>
		</div>
	);
}

export default ArmGoalModal;
