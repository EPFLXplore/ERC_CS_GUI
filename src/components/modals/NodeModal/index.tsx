import SubSystems from "../../../data/subsystems.type";
import styles from "./style.module.sass";
import * as ROSLIB from "roslib";

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
	// Map subsystem display names to state keys
	const subsystemKeyMap: { [key: string]: string } = {
		[SubSystems.NAGIVATION]: "navigation",
		[SubSystems.HANDLING_DEVICE]: "handling_device",
		[SubSystems.DRILL]: "drill",
		[SubSystems.EL]: "electronics",
		[SubSystems.ROVER]: "rover",
	};

	const subsystemKey = subsystemKeyMap[name] || name.toLowerCase();
	const subsystemData = roverState?.[subsystemKey];

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
						{subsystemData?.software?.nodes ? (
							Object.values(subsystemData.software.nodes).map((el: any, idx: number) => (
								<div
									key={`node-${idx}`}
									className={`${styles.Choice} ${el.status ? styles.Selected : ""}`}
								>
									{el.name || `Node ${idx}`}
								</div>
							))
						) : (
							<p style={{ color: "white" }}>NO DATA</p>
						)}

						{/** Camera nodes - check in subsystem's camera data */}
						{subsystemData?.cameras ? (
							Object.values(subsystemData.cameras).map((el: any, idx: number) => (
								<div
									key={`camera-node-${idx}`}
									className={`${styles.Choice} ${el.status ? styles.Selected : ""}`}
								>
									{el.name || `Camera ${idx}`}
								</div>
							))
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
}

export default NodeModal;
