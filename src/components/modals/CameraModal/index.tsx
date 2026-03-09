import styles from "./style.module.sass";
import { depth_cameras, allCameras} from "../../../data/cameras.type";
import * as ROSLIB from "roslib";
import React from "react";
import { CameraType } from "../../../data/cameras.type";

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
	cameraStates,
	onClose,
	onClick,
	rgbOnClick
}: {
	cameraStates: CameraType,
	onClose: () => void;
	onClick: (subsystem: string, mode: string, activated: boolean) => void;
	rgbOnClick: (subsystem: string, activate: boolean) => void; // button press -> change HD/NAV camera mode
}) {

	const [camera, clickedCamera] = React.useState<string | null>(null);

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
							
							<React.Fragment>
								{Object.values(allCameras[cameraGroup].enum).map((camera: string) => {
									const subsystem = allCameras[cameraGroup].subsystem_to_check;
									const subsystemCameras = cameraStates[subsystem] as any;
									const cameraData = subsystemCameras?.[camera] ?? {
										status: false,
										data_rate: "0",
									};

									return (
									<React.Fragment key={camera}>
										<div className={styles.ChoiceWrapper}>
										<button
										className={`${styles.Choice} ${
											cameraData['status'] ? styles.Selected : ""
											}`}
										onClick={() => {
											if (!cameraData['status']) {
												onClick(subsystem, camera, true)
											} else {
												onClick(subsystem, camera, false)
											}
											clickedCamera(camera)
										}}
										>
											{camera}
										</button>
									{dataRateDiv(subsystemCameras ?? {}, camera)}
										</div>
									</React.Fragment>
									);
								})}
							</React.Fragment>
						</React.Fragment>
						))}
					</div>
				
					<div className={styles.ChoiceGroup}>
						{(Object.keys(depth_cameras) as Array<keyof typeof depth_cameras>).map((cameraGroup) => (
						<React.Fragment key={cameraGroup}>
							<div className={styles.ChoiceCategory}>
								<h2>{cameraGroup}</h2>
							</div>
							
							{(() => {
								const subsystem = depth_cameras[cameraGroup].subsystem_to_check;
								const cameraName = depth_cameras[cameraGroup].camera;
								const subsystemCameras = cameraStates[subsystem] as any;
								const cameraData = subsystemCameras?.[cameraName] ?? { depth: false };
								
								return (
								<React.Fragment key={cameraGroup}>
									<div className={styles.ChoiceWrapper}>
									<button
									className={`${styles.Choice} ${
										cameraData['depth'] ? styles.Selected : ""
										}`}
									onClick={() => {
										if (!cameraData['depth']) {
											rgbOnClick(subsystem, true)
										} else {
											rgbOnClick(subsystem, false)
										}
									}}
									>
										{depth_cameras[cameraGroup].name}
									</button>
									</div>
								</React.Fragment>
								);
							})()}
						</React.Fragment>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

export default CameraModal;