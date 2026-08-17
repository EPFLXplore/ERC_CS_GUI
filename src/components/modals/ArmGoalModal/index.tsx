import React from "react";
import styles from "./style.module.sass";
import SubSystems from "../../../data/subsystems.type";
import { AlertColor } from "@mui/material";
import PreviousIcon from "../../../assets/images/icons/previous.svg";
import PauseIcon from "../../../assets/images/icons/pause.svg";
import NextIcon from "../../../assets/images/icons/next.svg";

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

const toHdGoal = (task: string) => {
	const baseGoal = {
		target: task,
		maintenance_objects: [] as string[],
		model_element: "",
		rotation_degree: 0,
		clockwise_or_not: "",
		probe_number: 0,
		probe_orientation: "",
		predefined_pose: "",
	};

	// Maintenance panel elements are now passed through ALIGN_OBJECT_WITH_ARUCO.
	if (
		task.startsWith("switch_") ||
		task === "electromagnet" ||
		task.startsWith("small_rotation_switch_") ||
		task.startsWith("big_rotation_switch_")
	) {
		return {
			...baseGoal,
			target: "align_object_with_aruco",
			maintenance_objects: [task],
		};
	}

	// SAM-based alignment: send model name in model_element.
	if (task.startsWith("model_")) {
		return {
			...baseGoal,
			target: "align_object_with_sam",
			model_element: task,
		};
	}

	// Turn J6 helpers.
	const turnMatch = task.match(/^turn_j6_(30|45|90)_(pos|neg)$/);
	if (turnMatch) {
		return {
			...baseGoal,
			target: "turn_j6",
			rotation_degree: Number(turnMatch[1]),
			clockwise_or_not: turnMatch[2],
		};
	}

	// Probe helpers.
	const probeMatch = task.match(/^probe_(u|s)_(1|2|3)$/);
	if (probeMatch) {
		return {
			...baseGoal,
			target: "probe_deposit",
			probe_orientation: probeMatch[1] === "u" ? "u" : "s",
			probe_number: Number(probeMatch[2]),
		};
	}

	return baseGoal;
};

function ArmGoalModal({
	onSetGoal,
	onClose,
	onCancelGoal,
	snackBar,
	resetHdConfirmation,
	onSendNamedPose,
	onUpdateTaskCommand,
}: {
	onSetGoal: (system: string, actionArgs: Object) => void;
	onClose: () => void;
	onCancelGoal: (system: string) => void;
	snackBar: (sev: AlertColor, mes: string) => void;
	resetHdConfirmation: ((confirm: boolean) => void) | null;
	onSendNamedPose: (poseName: string) => void;
	onUpdateTaskCommand: (mode: 0 | 1 | 2) => void;
}) {
	const [tasks, setTasks] = React.useState<ArmTask[] | null>(null);

	const armTasks = [
		{ category: "Switches", items: [
		  { name: "Main Switch", msg: "switch_main" },
		  { name: "Switch 1", msg: "switch_1" },
		  { name: "Switch 2", msg: "switch_2" },
		  { name: "Switch 3", msg: "switch_3" },
		  { name: "Switch 4", msg: "switch_4" },
		  { name: "Switch 5", msg: "switch_5" },
		  { name: "Switch 6", msg: "switch_6" },
		  { name: "Switch 7", msg: "switch_7" },
		  { name: "Switch 8", msg: "switch_8" },
		  { name: "Switch 9", msg: "switch_9" },
		  { name: "Switch 10", msg: "switch_10" },
		  { name: "Switch 11", msg: "switch_11" },
		  { name: "Switch 12", msg: "switch_12" },
		  { name: "Switch 13", msg: "switch_13" },
		]},
		{ category: "Objects", items: [
		  { name: "Electromagnet", msg: "electromagnet" },
		]},
		{ category: "Control and Power Switches", items: [
		  { name: "Control Switch 1", msg: "small_rotation_switch_1" },
		  { name: "Control Switch 2", msg: "small_rotation_switch_2" },
		  { name: "Control Switch 3", msg: "small_rotation_switch_3" },
		  { name: "Control Switch 4", msg: "small_rotation_switch_4" },
		  { name: "Control Switch 5", msg: "small_rotation_switch_5" },
		  { name: "Power Switch 1", msg: "big_rotation_switch_1" },
		  { name: "Power Switch 2", msg: "big_rotation_switch_2" },
		]},
		{ category: "Predefined Positions", isPredefined: true, items: [
		  { name: "Home Position", msg: "home" },
		  { name: "Zero", msg: "zero" },
		  { name: "Cobra", msg: "cobra" },
		  { name: "Sad Arm", msg: "above_ground" },
		  { name: "Rangement", msg: "rangement" },
		  { name: "Front Panel", msg: "front_panel" },
		  { name: "Above Steering Right", msg: "above_steering_right" },
		  { name: "Above Tool changing", msg: "above_container_tool_drop_rvt_1" },
		  { name: "Above Sand Dune", msg: "above_ground_sand_dune" },
		  { name: "Above Sand Flat", msg: "above_ground_sand" },
		  { name: "Above Container Rock/Sand", msg: "intermediate_rock_3" },
		]},
		{ category: "Tasks", items: [
		  { name: "debug", msg: "debug" },
		  { name: "Pick Rock", msg: "rocks" },
		  { name: "Approach Aruco", msg: "aruco_approach" },
		  { name: "Grab Sand", msg: "sand_collect" },
		  { name: "QR Code", msg: "qr_code"},
		  { name: "Move Nav", msg: "send_nav_move"},
		  { name: "Turn J6 30° POS", msg: "turn_j6_30_pos"},
		  { name: "Turn J6 45° POS", msg: "turn_j6_45_pos"},
		  { name: "Turn J6 90° POS", msg: "turn_j6_90_pos"},
		  { name: "Turn J6 30° NEG", msg: "turn_j6_30_neg"},
		  { name: "Turn J6 45° NEG", msg: "turn_j6_45_neg"},
		  { name: "Turn J6 90° NEG", msg: "turn_j6_90_neg"},
		  { name: "Probe 1 UP", msg: "probe_u_1"},
		  { name: "Probe 2 UP", msg: "probe_u_2"},
		  { name: "Probe 3 UP", msg: "probe_u_3"},
		  { name: "Probe SIDE", msg: "probe_s_1"},
		]},
		{ category: "SAM Approach", items: [
		  { name: "Control Switch", msg: "model_small_rotation_switch" },
		  { name: "Power Switch", msg: "model_big_rotation_switch" }
		]}
	  ];
	  

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
				<div className={styles.TaskControlBar}>
					<button
						type="button"
						className={styles.TaskControlButton}
						onClick={() => onUpdateTaskCommand(2)}
						title="Previous Command"
					>
						<img src={PreviousIcon} alt="Previous" />
						<span>Previous</span>
					</button>
					<button
						type="button"
						className={styles.TaskControlButton}
						onClick={() => onUpdateTaskCommand(0)}
						title="Pause Task"
					>
						<img src={PauseIcon} alt="Pause" />
						<span>Pause</span>
					</button>
					<button
						type="button"
						className={styles.TaskControlButton}
						onClick={() => onUpdateTaskCommand(1)}
						title="Next Command"
					>
						<img src={NextIcon} alt="Next" />
						<span>Next</span>
					</button>
				</div>
				<div className={styles.ModalContent}>
					<div className={styles.ChoiceGroup}>
						{armTasks.map((group) => (
							<React.Fragment key={group.category}>
							<p className={styles.ChoiceCategory}>{group.category}</p>
							{group.items.map((item) => (
								<button
								key={item.name}
								className={`${styles.Choice} ${!group.isPredefined && tasks?.some(t => t.name === item.name) ? styles.Selected : ""}`}
								onClick={() => {
									if (group.isPredefined) {
										onSendNamedPose(item.msg);
										onClose();
									} else {
										setTasks((old: ArmTask[] | null) => {
											if(old === null) {
												return [{ name: item.name, msg: item.msg }];
											}
											if (old.some(t => t.name === item.name)) {
												return old.filter(t => t.name !== item.name);
											}
											const newTasks = [...old];
											newTasks.push({ name: item.name, msg: item.msg});
											return newTasks;
										});
									}
								}}
								>
								{item.name}
								</button>
							))}
							</React.Fragment>
						))}
					</div>
				</div>

				<div className={styles.ModalFooter}>
					<button
						onClick={() => {
							if (tasks) {
								const goals = tasks.map((t) => toHdGoal(t.msg));
								onSetGoal(SubSystems.HANDLING_DEVICE, {
									goals,
								});
								
								onClose();
							} else {
								snackBar("error", "No task selected");
							}
						}}
						className={`${styles.PrimaryColor}`}
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
						className={`${styles.SecondaryColor}`}
					>
						Cancel Task
					</button>
				</div>
			</div>
		</div>
	);
}

export default ArmGoalModal;