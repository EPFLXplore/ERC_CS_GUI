import React from "react";
import styles from "./style.module.sass";
import { Pose2D } from "../../../data/pose2d.type";
import SubSystems from "../../../data/subsystems.type";
import { roundToTwoDecimals } from "../../../utils/maths";
import { map3DTo2D } from "../../../utils/mapUtils";

function ArmGoalModal({
	onSetGoal,
	onClose,
	onCancelGoal,
	currentGoal = undefined,
	pointOnMap,
}: {
	onSetGoal: (system: string, actionArgs: Object) => void;
	onClose: () => void;
	onCancelGoal: (system: string) => void;
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
			</div>
		</div>
	);
}

export default ArmGoalModal;
