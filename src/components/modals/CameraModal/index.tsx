import React, { useEffect } from "react";
import styles from "./style.module.sass";
import {CameraType} from "../../../data/cameras.type";
import SubSystems from "../../../data/subsystems.type";

enum CameraActions {
    FRONT = "Front",
    RIGHT = "Right",
    LEFT = "Left",
    BEHIND = "Behind"
}

function CameraModal({
    onClose,
    onClick,
    cameraStates
}: {
    onClose: () => void;
    onClick: (mode: string, activated: boolean) => void;
    cameraStates: CameraType 
}) {
	//const [selected, setSelected] = React.useState<CameraActions[]>([]);

	return (
		<div className={styles.Background} onClick={onClose}>
			<div
				className={styles.Modal}
				onClick={(e) => {
					e.stopPropagation();
				}}
			>
				<div className={styles.ModalHeader}>
					<h1>Cameras</h1>
				</div>
				<div className={styles.ModalContent}>

					<div className={styles.ChoiceGroup}>
						{Object.keys(cameraStates[SubSystems.CS]).length !== 0 ?
                        
                        Object.values(CameraActions).map((camera: string) => (
							<button
								className={`${styles.Choice} ${
                                    //@ts-ignore
									cameraStates[SubSystems.CS][camera]['status'] ? styles.Selected : ""
								}`}
								onClick={() => {
                                    //@ts-ignore
                                    if(!cameraStates[SubSystems.CS][camera]['status']) {
                                        onClick(camera, true)
                                    } else {
                                        onClick(camera, false)
                                    }
                                }}
							>
								{camera}
							</button>
						)) : <p>NO DATA</p>}
					</div>
				</div>
			</div>
		</div>
	);
}

export default CameraModal;

/**
 * <div className={styles.ChoiceGroup}>
						{Object.keys(cameraStates[SubSystems.CS]).length !== 0 ?
                        
                        Object.values(cameraStates[SubSystems.CS]).map((camera: any) => (
							<button
								className={`${styles.Choice} ${
									camera.status ? styles.Selected : ""
								}`}
								onClick={() => {
                                    if(!camera.status) {
                                        onClick(camera, true)
                                    } else {
                                        onClick(camera, false)
                                    }
                                }}
							>
								{camera}
							</button>
						)) : <p>NO DATA</p>}
					</div>
 */
