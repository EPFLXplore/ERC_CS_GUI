import styles from "./style.module.sass";
import SubSystems from "../../../data/subsystems.type";
import { depth_cameras, allCameras} from "../../../data/cameras.type";
import useNewCamera from "../../../hooks/cameraHooks";
import ROSLIB from "roslib";
import useRoverState from "../../../hooks/roverStateHooks";
import React from "react";

/*
Author: Giovanni Ranieri and Matas Jones
Year: 2024
Description: Camera Modal. You can activate, deactivate each camera by sending a request. The button
is red if the camera is publishing. White button means nothing, the camera node for each camera is not
necessarily running. Check instead on the ROS panel. The data rate is also shown. 
*/

function dataRateDiv(cameraStates: any, camera: string) {

	let rate = 0
	
	if(cameraStates[camera]['status']) {
		rate = Math.round(Number(cameraStates[camera]['data_rate']))
	} else {
		rate = 0.0
	}
	let unit = "Mbps"

	return (
		<div className={styles.dataRate}>
			{rate} {unit}
		</div>
	);
}


function CameraModal({
	ros,
	onClose,
	onClick,
	rgbOnClick
}: {
	ros: ROSLIB.Ros | null,
	onClose: () => void;
	onClick: (subsystem: string, mode: string, activated: boolean) => void;
	rgbOnClick: (subsystem: string, activate: boolean) => void; // button press -> change HD/NAV camera mode
}) {

	const [roverState] = useRoverState(ros)
	const [cameraStates, rotateCams, images, currentVideo, setCurrentVideo] = useNewCamera(ros, roverState)

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

						{(Object.keys(allCameras) as Array<keyof typeof allCameras>).map((cameraGroup) => (
						<React.Fragment key={cameraGroup}>
							<div className={styles.ChoiceCategory}>
								<h2>{cameraGroup}</h2>
							</div>
							
							{cameraStates[allCameras[cameraGroup].subsystem_to_check] != null ?
								<React.Fragment>
									{Object.values(allCameras[cameraGroup].enum).map((camera: string) => (
										<React.Fragment key={camera}>
											<div className={styles.ChoiceWrapper}>
											<button
											className={`${styles.Choice} ${
												//@ts-ignore
												cameraStates[allCameras[cameraGroup].subsystem_to_check][camera]['status'] ? styles.Selected : ""
												}`}
											onClick={() => {
												//@ts-ignore
												if (!cameraStates[allCameras[cameraGroup].subsystem_to_check][camera]['status']) {
													onClick(allCameras[cameraGroup].subsystem_to_check, camera, true)
												} else {
													onClick(allCameras[cameraGroup].subsystem_to_check, camera, false)
												}
											}}
											>
												{camera}
											</button>
										{dataRateDiv(cameraStates[allCameras[cameraGroup].subsystem_to_check], camera)}
											</div>
										</React.Fragment>
									))}
								</React.Fragment> : <p>NO DATA</p>}
						</React.Fragment>
						))}
					</div>
				
					<div className={styles.ChoiceGroup}>
						{(Object.keys(depth_cameras) as Array<keyof typeof depth_cameras>).map((cameraGroup) => (
						<React.Fragment key={cameraGroup}>
							<div className={styles.ChoiceCategory}>
								<h2>{cameraGroup}</h2>
							</div>
							
							{cameraStates[depth_cameras[cameraGroup].subsystem_to_check] != null ?
								<React.Fragment key={cameraGroup}>
										<div className={styles.ChoiceWrapper}>
										<button
										className={`${styles.Choice} ${
											//@ts-ignore
											cameraStates[depth_cameras[cameraGroup].subsystem_to_check][depth_cameras[cameraGroup].camera]['depth'] ? styles.Selected : ""
											}`}
										onClick={() => {
											//@ts-ignore
											if (!cameraStates[depth_cameras[cameraGroup].subsystem_to_check][depth_cameras[cameraGroup].camera]['depth']) {
												rgbOnClick(depth_cameras[cameraGroup].subsystem_to_check, true)
											} else {
												rgbOnClick(depth_cameras[cameraGroup].subsystem_to_check, false)
											}
										}}
										>
											{depth_cameras[cameraGroup].name}
										</button>
										</div>
									</React.Fragment>
							: <p>NO DATA</p>}
						</React.Fragment>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

export default CameraModal;