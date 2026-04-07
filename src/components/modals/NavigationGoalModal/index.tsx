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

const ROVER_SPEED_MIN = 0;
const ROVER_SPEED_MAX = 2.4;

function NavigationGoalModal({
	ros,
	onSetGoal,
	setSpeedRoverService,
	onClose,
	onCancelGoal,
	onResetFaults,
	onResetHome,
	snackBar,
	currentGoal = undefined,
	pointOnMap,
}: {
	ros: ROSLIB.Ros | null;
	onSetGoal: (system: string, actionArgs: Object) => void;
	setSpeedRoverService: (value: number) => void;
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
	const [speedRover, setSpeedRover] = React.useState<number>(0.7);

	const handleSpeedSubmit = () => {
		if (
			!Number.isFinite(speedRover) ||
			speedRover < ROVER_SPEED_MIN ||
			speedRover > ROVER_SPEED_MAX
		) {
			snackBar(
				"error",
				`Speed must be between ${ROVER_SPEED_MIN} and ${ROVER_SPEED_MAX} m/s`
			);
			return;
		}
		setSpeedRoverService(speedRover);
		onClose();
		snackBar("success", `Set Speed Rover to ${speedRover}`);
	};

	return (
		<div className={styles.Background} onClick={onClose}>
			<div
				className={styles.Modal}
				onClick={(e) => e.stopPropagation()}
			>
				<div className={styles.ModalHeader}>
					<h1>Navigation Goal Task</h1>
				</div>

				<div className={styles.ModalContent}>

					<div className={styles.InputGroup}>
						<label htmlFor="x">X-Coordinate</label>
						<input
							type="number"
							id="x"
							value={xCord}
							onChange={(e) => setXCord(parseFloat(e.target.value))}
						/>
					</div>

					<div className={styles.InputGroup}>
						<label htmlFor="y">Y-Coordinate</label>
						<input
							type="number"
							id="y"
							value={yCord}
							onChange={(e) => setYCord(parseFloat(e.target.value))}
						/>
					</div>

					<div className={styles.InputGroup}>
						<label htmlFor="o">Orientation</label>
						<input
							type="number"
							id="o"
							value={orientation}
							onChange={(e) => setOrientation(parseFloat(e.target.value))}
						/>
					</div>

					<div className={styles.ModalFooter}>
						<button
							className={styles.PrimaryColor}
							onClick={() => {
								onSetGoal(SubSystems.NAGIVATION, {
									mode: 0,
									goal: new Pose2D(xCord, yCord, orientation),
								});
							}}
						>
							Set Goal
						</button>
						<button onClick={() => onCancelGoal(SubSystems.NAGIVATION)}>
							Cancel Goal
						</button>
					</div>
				</div>

				<div className={styles.Separator}></div>

				<div className={styles.ModalHeader}>
					<h1>Reset Faults and Home</h1>
				</div>

				<div className={styles.ModalContent}>
					<div className={styles.ResetSection}>
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

				<div className={styles.ModalHeader}>
					<h1>Speed Rover</h1>
				</div>

				<div className={styles.ModalContent}>
					<label
						htmlFor="speed-rover"
						style={{ fontWeight: 600, fontSize: "1.15rem", textAlign: "center" }}
					>
						Speed (m/s, {ROVER_SPEED_MIN}–{ROVER_SPEED_MAX})
					</label>
					<div className={styles.SpeedRoverSection}>
						<input
							id="speed-rover"
							type="number"
							className={styles.SpeedRoverInput}
							min={ROVER_SPEED_MIN}
							max={ROVER_SPEED_MAX}
							step={0.1}
							value={speedRover}
							onChange={(e) => {
								const raw = e.target.value;
								if (raw === "") {
									setSpeedRover(0);
									return;
								}
								const v = parseFloat(raw);
								if (!Number.isNaN(v)) setSpeedRover(v);
							}}
							placeholder="Enter speed"
						/>
						<button
							className={styles.SpeedRoverButton}
							onClick={handleSpeedSubmit}
						>
							Submit
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default NavigationGoalModal;
