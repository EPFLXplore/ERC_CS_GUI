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
	snackBar,
	resetHdConfirmation,
}: {
	onSetGoal: (system: string, actionArgs: Object) => void;
	onClose: () => void;
	onCancelGoal: (system: string) => void;
	snackBar: (sev: AlertColor, mes: string) => void;
	resetHdConfirmation: ((confirm: boolean) => void) | null;
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
		{ category: "Objects and Sockets", items: [
		  { name: "Electromagnet", msg: "electromagnet" },
		  { name: "Socket 1", msg: "socket_1" },
		  { name: "Socket 2", msg: "socket_2" },
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
		{ category: "Predefined Positions", items: [
		  { name: "Home Position", msg: "home" },
		  { name: "Zero", msg: "zero" },
		  { name: "Cobra", msg: "cobra" },
		  { name: "Sad Arm", msg: "above_ground" },
		  { name: "Rangement", msg: "rangement" },
		  { name: "Front Panel", msg: "front_panel" },
		]},
		{ category: "Tasks", items: [
		  { name: "Pick Rock", msg: "rocks" },
		  { name: "Approach Aruco", msg: "aruco_approach" },
		  { name: "Grab Sand", msg: "sand_collect" },
		  { name: "QR Code", msg: "qr_code"},
		  { name: "Turn J6 30° POS", msg: "turn_j6_30_pos"},
		  { name: "Turn J6 45° POS", msg: "turn_j6_45_pos"},
		  { name: "Turn J6 90° POS", msg: "turn_j6_90_pos"},
		  { name: "Turn J6 30° NEG", msg: "turn_j6_30_neg"},
		  { name: "Turn J6 45° NEG", msg: "turn_j6_45_neg"},
		  { name: "Turn J6 90° NEG", msg: "turn_j6_90_neg"}
		]},
		{ category: "Only Models", items: [
		  { name: "Control Switch 1", msg: "model_small_rotation_switch_1" },
		  { name: "Control Switch 2", msg: "model_small_rotation_switch_2" },
		  { name: "Control Switch 3", msg: "model_small_rotation_switch_3" },
		  { name: "Control Switch 4", msg: "model_small_rotation_switch_4" },
		  { name: "Control Switch 5", msg: "model_small_rotation_switch_5" },
		  { name: "Power Switch 1", msg: "model_big_rotation_switch_1" },
		  { name: "Power Switch 2", msg: "model_big_rotation_switch_2" },
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
				<div className={styles.ModalContent}>
					<div className={styles.ChoiceGroup}>
						{armTasks.map((group) => (
							<React.Fragment key={group.category}>
							<p className={styles.ChoiceCategory}>{group.category}</p>
							{group.items.map((item) => (
								<button
								key={item.name}
								className={`${styles.Choice} ${tasks?.some(t => t.name === item.name) ? styles.Selected : ""}`}
								onClick={() => setTasks((old: ArmTask[] | null) => {
									if(old === null) {
										const t = [{ name: item.name, msg: item.msg }]
										console.log("Setting taskssss:", t);
										return [{ name: item.name, msg: item.msg }];
									}

									if (old.some(t => t.name === item.name)) {
										return old.filter(t => t.name !== item.name);
									}

									const newTasks = [...old];
									newTasks.push({ name: item.name, msg: item.msg});
									console.log(newTasks);
									return newTasks;
								})}
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
								const _tasks = tasks?.map(t => t.msg)
								onSetGoal(SubSystems.HANDLING_DEVICE, {
									actions: _tasks
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