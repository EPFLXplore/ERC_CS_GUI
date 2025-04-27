import styles from "./style.module.sass";
import ROSLIB from "roslib";
import { AlertColor } from "@mui/material";
import { Sensors } from "../../../data/sensors.types";

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
				{Object.values(Sensors).map((sensor_name: Sensors) => (
					<div className={styles.ChoiceContainer}>
						<button
							className={`${styles.Choice}`}
							onClick={() => resetSensors(sensor_name)}
						>
							Reset {sensor_name}
						</button>
				</div>))}
			</div>
		</div>
	);
}

export default ScienceModal;