import React, { useEffect } from "react";
import styles from "./style.module.sass";
import {CameraType} from "../../../data/cameras.type";
import SubSystems from "../../../data/subsystems.type";
import { CameraCS, CameraHD, CameraNAV, CameraSC } from "../../../data/cameras.type";

function CameraModal({
    onClose,
    onClick,
    cameraStates
}: {
    onClose: () => void;
    onClick: (subsystem: string, mode: string, activated: boolean) => void;
    cameraStates: CameraType
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
					<h1>Cameras CS</h1>
				</div>
				<div className={styles.ModalContent}>

					<div className={styles.ChoiceGroup}>
						{cameraStates[SubSystems.CS] != null ?
                        
                        Object.values(CameraCS).map((camera: string) => (
							<button
								className={`${styles.Choice} ${
                                    //@ts-ignore
									cameraStates[SubSystems.CS][camera]['status'] ? styles.Selected : ""
								}`}
								onClick={() => {
                                    //@ts-ignore
                                    if(!cameraStates[SubSystems.CS][camera]['status']) {
                                        onClick(SubSystems.CS, camera, true)
                                    } else {
                                        onClick(SubSystems.CS, camera, false)
                                    }
                                }}
							>
								{camera}
							</button>
						)) : <p>NO DATA</p>}
					</div>
				</div>

				<div className={styles.ModalHeader}>
					<h1>Cameras HD</h1>
				</div>
				<div className={styles.ModalContent}>

					<div className={styles.ChoiceGroup}>
						{cameraStates[SubSystems.HANDLING_DEVICE] != null ?
                        
                        Object.values(CameraHD).map((camera: string) => (
							<button
								className={`${styles.Choice} ${
                                    //@ts-ignore
									cameraStates[SubSystems.HANDLING_DEVICE][camera]['status'] ? styles.Selected : ""
								}`}
								onClick={() => {
                                    //@ts-ignore
                                    if(!cameraStates[SubSystems.HANDLING_DEVICE][camera]['status']) {
                                        onClick(SubSystems.HANDLING_DEVICE, camera, true)
                                    } else {
                                        onClick(SubSystems.HANDLING_DEVICE, camera, false)
                                    }
                                }}
							>
								{camera}
							</button>
						)) : <p>NO DATA</p>}
					</div>
				</div>

				<div className={styles.ModalHeader}>
					<h1>Cameras NAV</h1>
				</div>
				<div className={styles.ModalContent}>

					<div className={styles.ChoiceGroup}>
						{cameraStates[SubSystems.NAGIVATION] != null ?
                        
                        Object.values(CameraNAV).map((camera: string) => (
							<button
								className={`${styles.Choice} ${
                                    //@ts-ignore
									cameraStates[SubSystems.NAGIVATION][camera]['status'] ? styles.Selected : ""
								}`}
								onClick={() => {
                                    //@ts-ignore
                                    if(!cameraStates[SubSystems.NAGIVATION][camera]['status']) {
                                        onClick(SubSystems.NAGIVATION, camera, true)
                                    } else {
                                        onClick(SubSystems.NAGIVATION, camera, false)
                                    }
                                }}
							>
								{camera}
							</button>
						)) : <p>NO DATA</p>}
					</div>
				</div>

				<div className={styles.ModalHeader}>
					<h1>Cameras SC</h1>
				</div>
				<div className={styles.ModalContent}>

					<div className={styles.ChoiceGroup}>
						{cameraStates[SubSystems.SCIENCE] != null ?
                        
                        Object.values(CameraSC).map((camera: string) => (
							<button
								className={`${styles.Choice} ${
                                    //@ts-ignore
									cameraStates[SubSystems.SCIENCE][camera]['status'] ? styles.Selected : ""
								}`}
								onClick={() => {
                                    //@ts-ignore
                                    if(!cameraStates[SubSystems.SCIENCE][camera]['status']) {
                                        onClick(SubSystems.SCIENCE, camera, true)
                                    } else {
                                        onClick(SubSystems.SCIENCE, camera, false)
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
