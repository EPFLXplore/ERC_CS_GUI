import React, { useEffect } from "react";
import styles from "./style.module.sass";
import ROSLIB from "roslib";
import { executeSSHCommand, CommandsSSH, IDConnections, closeSSH } from "../../../utils/sshCommands";
import { AlertColor } from "@mui/material";

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
						<h1>RPI Cams</h1>
				</div>
				<div className={styles.ModalContent}>
					<div className={styles.ChoiceGroup}>
						{CommandsSSH.rpi_cameras_cs.map((task) => (
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
						<h1>RPI Rover/Drill</h1>
				</div>
				<div className={styles.ModalContent}>
					<div className={styles.ChoiceGroup}>
						{CommandsSSH.rpi_rover_drill.map((task) => (
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
						<h1>Jetson</h1>
				</div>
				<div className={styles.ModalContent}>
					<div className={styles.ChoiceGroup}>
						{CommandsSSH.jetson_xavier.map((task) => (
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

/*
{Object.keys(IDConnections).length != 0 ? 
				<div className={styles.ChoiceGroup}>
					{Object.entries(IDConnections).map(([conn_name, conn_id]) => (
						<button
							className={styles.Choice}
							//@ts-ignore
							onClick={() => closeSSH(conn_name, conn_id, removeStatus)}
							>
								{"close: " + conn_name}
						</button>
					))}
				</div> : <></>
			}


			{status.length != 0 ? 
				<div className={styles.ChoiceGroup}>
					{status.map(([conn_name, conn_id]) => (
						<button
							className={styles.Choice}
							//@ts-ignore
							onClick={() => closeSSH(conn_name, conn_id, removeStatus)}
							>
								{"close: " + conn_name}
						</button>
					))}
				</div> : <></>
			}
*/