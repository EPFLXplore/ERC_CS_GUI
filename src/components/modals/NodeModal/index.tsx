import SubSystems from "../../../data/subsystems.type";
import styles from "./style.module.sass";
import ROSLIB from "roslib";

/*
Author: Giovanni Ranieri
Year: 2024
Description: ROS node Modal. Shows which nodes are running. It uses the rover state.
*/

const sections = [SubSystems.ROVER, SubSystems.NAGIVATION, SubSystems.HANDLING_DEVICE];

function NodeModal({
	roverState,
	name,
	onClose,
}: {
	roverState: any;
	name: string;
	onClose: () => void;
}) {
	return (
		<div className={styles.Background} onClick={onClose}>
			<div
				className={styles.Modal}
				onClick={(e) => e.stopPropagation()}
			>
				<div className={styles.ModalHeader}>
					<h1>{name.toLocaleUpperCase()}</h1>
				</div>
				<div className={styles.ModalContent}>
					<div className={styles.ChoiceGroup}>
						{roverState['rover'] ? (
							Object.values(roverState['rover']['software']['nodes'][name]).map((el: any, idx: number) => (
								<div
									key={`rover-node-${idx}`}
									className={`${styles.Choice} ${el.status ? styles.Selected : ""}`}
								>
									{el.name}
								</div>
							))
						) : (
							<p style={{ color: "white" }}>NO DATA</p>
						)}

						{/** Camera nodes by subsystem */}
						{sections.map((system: SubSystems) =>
							name === system && roverState?.cameras?.[system]
								? Object.values(roverState.cameras[system]).map((el: any, idx: number) => (
										<div
											key={`camera-node-${idx}`}
											className={`${styles.Choice} ${el.status ? styles.Selected : ""}`}
										>
											{el.name}
										</div>
								  ))
								: null
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default NodeModal;
