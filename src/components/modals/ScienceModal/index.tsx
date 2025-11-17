import styles from "./style.module.sass";
import * as ROSLIB from "roslib";
import { AlertColor } from "@mui/material";
import { Sensors } from "../../../data/sensors.types";
import React from "react";

/*
Author: Giovanni Ranieri
Year: 2024
Description: You can send reset sensors from the Science Modal.
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