import React from "react";
import styles from "./style.module.sass";
import { Pose2D } from "../../../data/pose2d.type";
import SubSystems from "../../../data/subsystems.type";
import { roundToTwoDecimals } from "../../../utils/maths";
import { map3DTo2D } from "../../../utils/mapUtils";
import { AlertColor } from "@mui/material";
import * as ROSLIB from "roslib";

/*
Author: Ugo Balducci
Year: 2023
Description: Navigation Modal. You can send a nav2 position goal by writing the coordinates.
*/

function ArmGoalModal({
	ros,
	onSetGoal,
	onClose,
	onCancelGoal,
	onResetFaults,
	onResetHome,
	snackBar,
	currentGoal = undefined,
	pointOnMap,
}: {
	ros: ROSLIB.Ros | null,
	onSetGoal: (system: string, actionArgs: Object) => void;
	onClose: () => void;
	onCancelGoal: (system: string) => void;
	onResetFaults: (ros: ROSLIB.Ros | null, subsystem: string, snackBar: (severity: AlertColor, message: string) => void) => void;
	onResetHome: (ros: ROSLIB.Ros | null, subsystem: string, snackBar: (severity: AlertColor, message: string) => void) => void;
	snackBar: (severity: AlertColor, message: string) => void;
	currentGoal?: { x: number; y: number; o: number };
	pointOnMap: { x: number; y: number };
}) {
	const pointOnTerrain = map3DTo2D({ x: pointOnMap.x, y: 0, z: pointOnMap.y });
	const [xCord, setXCord] = React.useState(roundToTwoDecimals(pointOnTerrain.x, 2));
	const [yCord, setYCord] = React.useState(roundToTwoDecimals(pointOnTerrain.y, 2));
	const [orientation, setOrientation] = React.useState(0);

	return (
		<div className={styles.Background} onClick={onClose}>
			<div
				className={styles.Modal}
				onClick={(e) => {
					e.stopPropagation();
				}}
			>
				<div className={styles.ModalHeader}>
					<h1>Set Goal</h1>
				</div>
				<div className={styles.ModalContent}>
					{currentGoal ? (
						<p>
							Current Goal is at {xCord}, {yCord}, {orientation}.
						</p>
					) : (
						<p>No current goal set.</p>
					)}
					<div className={styles.InputGroup}>
						<label htmlFor="x">X</label>
						<input
							type="number"
							id="x"
							value={xCord}
							onChange={(e) => setXCord(parseInt(e.target.value))}
						/>
					</div>
					<div className={styles.InputGroup}>
						<label htmlFor="y">Y</label>
						<input
							type="number"
							id="y"
							value={yCord}
							onChange={(e) => setYCord(parseInt(e.target.value))}
						/>
					</div>
					<div className={styles.InputGroup}>
						<label htmlFor="o">Orientation</label>
						<input
							type="number"
							id="o"
							value={orientation}
							onChange={(e) => setOrientation(parseInt(e.target.value))}
						/>
					</div>
				</div>
				<div className={styles.ModalFooter}>
					<button
						onClick={() => {
							onSetGoal(SubSystems.NAGIVATION, {
								mode: 0,
								goal: new Pose2D(xCord, yCord, orientation),
							});
							//onClose();
						}}
						className={styles.PrimaryColor}
					>
						Set Goal
					</button>
					<button
						onClick={() => {
							onCancelGoal(SubSystems.NAGIVATION);
							//onClose();
						}}
					>
						Cancel Goal
					</button>
				</div>
				<div className={styles.ModalHeader}>
					<h1>Reset Faults and Home</h1>
				</div>
				<div className={styles.ModalContent}>
					<button
						className={styles.Choice}
						onClick={() => onResetFaults(ros, SubSystems.NAGIVATION, snackBar)}
					>
						Reset Faults
					</button>
					<button
						className={styles.Choice}
						onClick={() => onResetHome(ros, SubSystems.NAGIVATION, snackBar)}
					>
						Reset Home
					</button>
				</div>
			</div>
		</div>
	);
}

export default ArmGoalModal;
