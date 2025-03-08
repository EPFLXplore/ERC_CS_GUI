import React, { useEffect } from "react";
import styles from "./style.module.sass";
import ROSLIB from "roslib";
import { executeSSHCommand, CommandsSSH, IDConnections, closeSSH } from "../../../utils/sshCommands";
import { AlertColor } from "@mui/material";

/*
Author: Giovanni Ranieri
Year: 2024
Description: Docker Modal. You can activate the dockers ROVER, NAV, DRILL actually. There is a button start
and stop for each. Stop stops the docker completely. The pipeline is: 

	1) Axios HTTP request to small express webserver (see in the webserver.js)
	2) SSH request to the correct device and runs a script

No feedback on the commands is available. To see if the dockers start, see which ROS nodes are running
on the ROS panel.
*/

function ControlModal({
    onClose,
	snackBar,
}: {
    onClose: () => void;
	snackBar: (severity: AlertColor, message: string) => void
}) {

	return (
		<div className={styles.Background} onClick={onClose}>
			<div
				className={styles.Modal}
				onClick={(e) => {
					e.stopPropagation();
				}}
			>
				<div className={styles.ModalHeader}>
						<h1>Jetson NAV/CS</h1>
				</div>
				<div className={styles.ModalContent}>
					<div className={styles.ChoiceGroup}>
						{CommandsSSH.jetson_nav.map((task) => (
							<button
								className={styles.Choice}
								//@ts-ignore
								onClick={() => {
									executeSSHCommand(task.action, snackBar, task.name)
									
								}}
								>
									{task.name}
							</button>
						))}
					</div>
				</div>

				<div className={styles.ModalHeader}>
						<h1>RPI Drill</h1>
				</div>
				<div className={styles.ModalContent}>
					<div className={styles.ChoiceGroup}>
						{CommandsSSH.rpi_drill.map((task) => (
							<button
								className={styles.Choice}
								//@ts-ignore
								onClick={() => executeSSHCommand(task.action, snackBar, task.name)}
								>
									{task.name}
							</button>
						))}
					</div>
				</div>

				<div className={styles.ModalHeader}>
						<h1>Jetson HD/Rover/Cams</h1>
				</div>
				<div className={styles.ModalContent}>
					<div className={styles.ChoiceGroup}>
						{CommandsSSH.jetson_hd.map((task) => (
							<button
								className={styles.Choice}
								//@ts-ignore
								onClick={() => executeSSHCommand(task.action, snackBar, task.name)}
								>
									{task.name}
							</button>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

export default ControlModal;