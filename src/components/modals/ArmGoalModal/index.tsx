import React from "react";
import styles from "./style.module.sass";
import SubSystems from "../../../data/subsystems.type";
import { AlertColor } from "@mui/material";

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
}: {
	onSetGoal: (system: string, actionArgs: Object) => void;
	onClose: () => void;
	onCancelGoal: (system: string) => void;
	currentTask?: ArmTask;
	snackBar: (sev: AlertColor, mes: string) => void;
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
						<p className={styles.ChoiceCategory}>Panel Elements</p>
						<button
							className={`${styles.Choice} ${
								task?.name === "Button 1" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Button 1", msg: "button_a0" })}
						>
							Button 1
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Button 2" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Button 2", msg: "button_a1" })}
						>
							Button 2
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Button 3" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Button 3", msg: "button_a2" })}
						>
							Button 3
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Button 4" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Button 4", msg: "button_a3"})}
						>
							Button 4
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Button 5" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Button 5", msg: "button_a4" })}
						>
							Button 5
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Button 6" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Button 6",msg: "button_a5" })}
						>
							Button 6
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Button 7" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Button 7", msg: "button_a6" })}
						>
							Button 7
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Button 8" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Button 8", msg: "button_a7" })}
						>
							Button 8
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Button 9" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Button 9", msg: "button_a8"})}
						>
							Button 9
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Button 10" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Button 10", msg: "button_a9" })}
						>
							Button 10
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Voltmeter" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Voltmeter", msg: "voltmeter" })}
						>
							Voltmeter
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Metal Bar" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Metal Bar", msg: "" })}
						>
							Metal Bar
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Ethernet Cable" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Ethernet Cable", msg: "" })}
						>
							Ethernet Cable
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
								task?.name === "Panel A Position" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Panel A Position", msg: "" })}
						>
							Panel A Position
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Panel B Position" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Panel B Position", msg:"" })}
						>
							Panel B Position
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Panel C Position" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Panel C Position", msg: "" })}
						>
							Panel C Position
						</button>
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
