import React from "react";
import styles from "./style.module.sass";
import { Pose2D } from "../../utils/CustomMsgObjects";

function NavigationGoalModal({
	onSetGoal,
	onClose,
	//currentPos,
}: {
	onSetGoal: (system: string, start: boolean, ...args: any[]) => void;
	onClose: () => void;
	//currentPos: { x: number; y: number; o: number };
}) {
	const [xCord, setXCord] = React.useState(0);
	const [yCord, setYCord] = React.useState(0);
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
					<h2>Set Goal</h2>
				</div>
				<div className={styles.ModalContent}>
					<div className={styles.InputGroup}>
						<label htmlFor="x">X:</label>
						<input
							type="number"
							id="x"
							value={xCord}
							onChange={(e) => setXCord(parseInt(e.target.value))}
						/>
					</div>
					<div className={styles.InputGroup}>
						<label htmlFor="y">Y:</label>
						<input
							type="number"
							id="y"
							value={yCord}
							onChange={(e) => setYCord(parseInt(e.target.value))}
						/>
					</div>
					<div className={styles.InputGroup}>
						<label htmlFor="o">Orientation:</label>
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
							onSetGoal("navigation", true, 0, new Pose2D(xCord, yCord, orientation))
							onClose();
						}}
					>
						Set Goal
					</button>
				</div>
				<div className={styles.ModalFooter}>
					<button
						onClick={() => {
							onSetGoal("navigation", false);
							onClose();
						}}
					>
						Cancel Goal
					</button>
				</div>
			</div>
		</div>
	);
}

export default NavigationGoalModal;
