import React from "react";
import styles from "./style.module.sass";
import SubSystems from "../../../data/subsystems.type";
import { AlertColor } from "@mui/material";

type ArmTask = {
	name: string;
	type: number;
	id: number;
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
							onClick={() => setTask({ name: "Button 1", type: 0, id: 0 })}
						>
							Button 1
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Button 2" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Button 2", type: 0, id: 0 })}
						>
							Button 2
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Button 3" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Button 3", type: 0, id: 0 })}
						>
							Button 3
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Button 4" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Button 4", type: 0, id: 0 })}
						>
							Button 4
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Button 5" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Button 5", type: 0, id: 0 })}
						>
							Button 5
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Button 6" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Button 6", type: 0, id: 0 })}
						>
							Button 6
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Button 7" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Button 7", type: 0, id: 0 })}
						>
							Button 7
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Button 8" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Button 8", type: 0, id: 0 })}
						>
							Button 8
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Button 9" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Button 9", type: 0, id: 0 })}
						>
							Button 9
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Button 10" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Button 10", type: 0, id: 0 })}
						>
							Button 10
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Voltmeter" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Voltmeter", type: 0, id: 0 })}
						>
							Voltmeter
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Metal Bar" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Metal Bar", type: 0, id: 0 })}
						>
							Metal Bar
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Ethernet Cable" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Ethernet Cable", type: 0, id: 0 })}
						>
							Ethernet Cable
						</button>
						<p className={styles.ChoiceCategory}>Predefined Positions</p>
						<button
							className={`${styles.Choice} ${
								task?.name === "Home Position" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Home Position", type: 0, id: 0 })}
						>
							Home Position
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Panel A Position" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Panel A Position", type: 0, id: 0 })}
						>
							Panel A Position
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Panel B Position" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Panel B Position", type: 0, id: 0 })}
						>
							Panel B Position
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Panel C Position" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Panel C Position", type: 0, id: 0 })}
						>
							Panel C Position
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Pick Rock" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Pick Rock", type: 0, id: 0 })}
						>
							Pick Rock
						</button>
						<button
							className={`${styles.Choice} ${
								task?.name === "Pick Probe" ? styles.Selected : ""
							}`}
							onClick={() => setTask({ name: "Pick Probe", type: 0, id: 0 })}
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
									task_type: task.type,
									task_id: task.id,
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

export default ArmGoalModal;
