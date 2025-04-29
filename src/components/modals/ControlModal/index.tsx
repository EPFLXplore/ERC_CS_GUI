import React from "react";
import styles from "./style.module.sass";
import { executeSSHCommand, CommandsSSH } from "../../../utils/sshCommands";
import { AlertColor } from "@mui/material";

/*
Author: Giovanni Ranieri
Year: 2024
Description: Docker Modal. You can activate the dockers ROVER, NAV, DRILL actually.
*/

const sections = [
  { label: "Navigation", key: "nav" },
  { label: "Handling Device", key: "hd" },
  { label: "Science", key: "science" },
  { label: "Avionics", key: "avionics" },
  { label: "Rover", key: "rover" },
  { label: "Cameras", key: "cameras" },
];

function ControlModal({
  onClose,
  snackBar,
}: {
  onClose: () => void;
  snackBar: (severity: AlertColor, message: string) => void;
}) {
  return (
    <div className={styles.Background} onClick={onClose}>
      	<div className={styles.Modal} onClick={(e) => e.stopPropagation()}>

			<div className={styles.ModalHeader}>
				<h1>Docker Control</h1>
			</div>

			<div className={styles.ModalContent}>
				<div className={styles.ChoiceGroup}>
					{sections.map(({ label, key }) => (
					<React.Fragment key={key}>
						<div className={styles.ChoiceCategory}>
							<h1>{label}</h1>
						</div>
						
						{CommandsSSH[key as keyof typeof CommandsSSH]?.map((task) => (
						<button
							key={task.name}
							className={styles.Choice}
							onClick={() => executeSSHCommand(task.action, snackBar, task.name)}
						>
							{task.name}
						</button>
						))}
					</React.Fragment>
					))}
				</div>
			</div>
      	</div>
    </div>
  );
}

export default ControlModal;
