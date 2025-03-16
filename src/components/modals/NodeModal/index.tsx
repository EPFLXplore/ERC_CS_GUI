import SubSystems from "../../../data/subsystems.type";
import styles from "./style.module.sass";
import ROSLIB from "roslib";

/*
Author: Giovanni Ranieri
Year: 2024
Description: ROS node Modal. Shows which nodes are running. It uses the rover state.
*/

function NodeModal({
	roverState,
    name,
    onClose,
}: {
	roverState: any,
    name: string,
    onClose: () => void;
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
					<h1>{name.toUpperCase()}</h1>
				</div>
				<div className={styles.ModalContent}>

					{
					//@ts-ignore
					roverState['rover'] ?  
					//@ts-ignore
					Object.values(roverState['rover']['software']['nodes'][name]).map((el: any) => (
						<div className={styles.ChoiceGroup}>
							<div
								className={`${styles.Choice} ${
									//@ts-ignore
									el['status'] ? styles.Selected : ""
								}`}
							>
								{el['name']}
							</div>
						</div>
					)) : <p>NO DATA</p>}

{
					//@ts-ignore
					name == SubSystems.ROVER ?  
					//@ts-ignore
					Object.values(roverState['cameras']["control_station"]).map((el: any) => (
						<div className={styles.ChoiceGroup}>
							<div
								className={`${styles.Choice} ${
									//@ts-ignore
									el['status'] ? styles.Selected : ""
								}`}
							>
								{el['name']}
							</div>
						</div>
					)) : null}
				</div>
            </div>
		</div>
	);
}

export default NodeModal;