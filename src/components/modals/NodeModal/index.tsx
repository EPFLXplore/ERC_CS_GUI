import styles from "./style.module.sass";
import ROSLIB from "roslib";
import useRoverState from "../../../hooks/roverStateHooks";


function NodeModal({
	ros,
    name,
    onClose,
}: {
	ros: ROSLIB.Ros | null,
    name: string,
    onClose: () => void;
}) {

	const [roverState] = useRoverState(ros)

	return (
		<div className={styles.Background} onClick={onClose}>
			<div
				className={styles.Modal}
				onClick={(e) => {
					e.stopPropagation();
				}}
			>
				<div className={styles.ModalHeader}>
					<h1>{name}</h1>
				</div>
				<div className={styles.ModalContent}>

					{
					//@ts-ignore
					roverState['rover'] ?  
					//@ts-ignore
					Object.values(roverState['rover']['software']['nodes'][name]).map((el: any) => (
						<div className={styles.ChoiceGroup}>
							<button
								className={`${styles.Choice} ${
									//@ts-ignore
									el['status'] ? styles.Selected : ""
								}`}
							>
								{el['name']}
							</button>
						</div>
					)) : <p>NO DATA</p>}
				</div>
            </div>
		</div>
	);
}

export default NodeModal;