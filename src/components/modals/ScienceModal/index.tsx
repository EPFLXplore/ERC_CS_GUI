import styles from "./style.module.sass";
import ROSLIB from "roslib";
import { AlertColor } from "@mui/material";
import { Sensors } from "../../../data/sensors.types";
import React from "react";

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

function ScienceModal({
    onClose,
	resetSensors,
	snackBar,
}: {
    onClose: () => void;
	resetSensors: (name_sensor: Sensors) => void;
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
						<h1>Reset Sensors</h1>
				</div>

				<div className={styles.ModalContent}>
					<div className={styles.ChoiceGroup}>
						{Object.values(Sensors).map((sensor_name: Sensors) => (
							<React.Fragment key={sensor_name}>
								<button
									key={sensor_name}
									className={`${styles.Choice}`}
									onClick={() => resetSensors(sensor_name)}
									>
									{sensor_name}
								</button>
							</React.Fragment>
						))}
	
					</div>
				</div>
			</div>
		</div>
	);
}

export default ScienceModal;