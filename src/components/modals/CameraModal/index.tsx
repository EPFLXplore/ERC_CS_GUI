import styles from "./style.module.sass";
import {
	depth_cameras,
	allCameras,
	NAV_CAMERA_NAV_INDEX,
	CAMERA_FEED_TOPICS,
} from "../../../data/cameras.type";
import * as ROSLIB from "roslib";
import React from "react";
import { CameraType } from "../../../data/cameras.type";
import SubSystems from "../../../data/subsystems.type";
import useNavCameraBandwidth from "../../../hooks/useNavCameraBandwidth";
import useRoverCameraBandwidth from "../../../hooks/useRoverCameraBandwidth";

/*
Author: Giovanni Ranieri and Matas Jones
Year: 2024
Description: Camera Modal. You can activate, deactivate each camera by sending a request. The button
is red if the camera is publishing. White button means nothing, the camera node for each camera is not
necessarily running. Check instead on the ROS panel. The data rate is also shown. 
*/

function dataRateDiv(
	cameraStates: any,
	camera: string,
	liveNavMbps: number | undefined,
	liveRoverMbps: number | undefined
) {
	let rate = 0;
	if (liveNavMbps !== undefined) {
		rate = Math.round(liveNavMbps * 10) / 10;
	} else if (liveRoverMbps !== undefined) {
		rate = Math.round(liveRoverMbps * 10) / 10;
	} else {
		const cameraState = cameraStates?.[camera];
		if (cameraState?.status) {
			rate = Math.round(Number(cameraState?.data_rate ?? 0) * 10) / 10;
		}
	}
	const unit = "Mbps";

	return (
		<div className={styles.dataRate}>
			{rate} {unit}
		</div>
	);
}


function CameraModal({
	ros,
	cameraStates,
	onClose,
	onClick,
	rgbOnClick,
	hdDepthOnClick,
}: {
	ros: ROSLIB.Ros | null;
	cameraStates: CameraType;
	onClose: () => void;
	onClick: (subsystem: string, mode: string, activated: boolean) => void;
	rgbOnClick: (subsystem: string, activate: boolean) => void; // NAV depth / RGB mode (and legacy HD RGB toggle if used)
	/** HD gripper depth: `/ROVER/req_camera_hd_0` then `/ROVER/depth_req_camera_hd_0` */
	hdDepthOnClick: (activate: boolean) => void;
}) {
	const navBwMbps = useNavCameraBandwidth(ros);
	const roverBwMbps = useRoverCameraBandwidth(ros);

	const [lastSeenByKey, setLastSeenByKey] = React.useState<Record<string, number>>({});
	const [, setTick] = React.useState(0);

	React.useEffect(() => {
		const id = setInterval(() => {
			setTick((value) => (value + 1) % 100000);
		}, 1000);
		return () => clearInterval(id);
	}, []);

	React.useEffect(() => {
		if (!ros) return;

		const listeners: ROSLIB.Topic<any>[] = [];
		const register = (subsystem: string, camera: string, topic: string) => {
			const key = `${subsystem}:${camera}`;
			const listener = new ROSLIB.Topic<any>({
				ros: ros,
				name: topic,
				messageType: "sensor_msgs/CompressedImage",
				compression: "jpeg",
				queue_length: 1,
				queue_size: 1,
			} as any);

			listener.subscribe(() => {
				const ts = Date.now();
				setLastSeenByKey((prev) => {
					if (prev[key] === ts) return prev;
					return { ...prev, [key]: ts };
				});
			});

			listeners.push(listener);
		};

		Object.entries(CAMERA_FEED_TOPICS).forEach(([subsystem, cameras]) => {
			Object.entries(cameras).forEach(([camera, topic]) => {
				register(subsystem, camera, topic);
			});
		});

		return () => {
			listeners.forEach((listener) => listener.unsubscribe());
		};
	}, [ros]);

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
										const localKey = `${subsystem}:${camera}`;
										const navIdx =
										subsystem === SubSystems.NAGIVATION
											? NAV_CAMERA_NAV_INDEX[camera]
											: undefined;
									const liveNavMbps =
										navIdx !== undefined ? navBwMbps[navIdx] : undefined;
									const liveRoverMbps =
										subsystem === SubSystems.ROVER ? roverBwMbps[0] : undefined;
										const lastSeen = lastSeenByKey[localKey];
										const recentlySeen =
											lastSeen !== undefined && Date.now() - lastSeen < 2000;
										const parsedRate = Number(cameraData["data_rate"] ?? 0);
										const hasDataRate = Number.isFinite(parsedRate) && parsedRate > 0;
										const hasNavBw =
											navIdx !== undefined && liveNavMbps !== undefined
												? liveNavMbps > 0
												: false;
										const isActive =
											recentlySeen || hasDataRate || hasNavBw || Boolean(cameraData["status"]);

									return (
									<React.Fragment key={camera}>
										<div className={styles.ChoiceWrapper}>
										<button
										className={`${styles.Choice} ${isActive ? styles.Selected : ""}`}
										onClick={() => {
											onClick(subsystem, camera, !isActive);
										}}
										>
											{camera}
										</button>
											{dataRateDiv(subsystemCameras ?? {}, camera, liveNavMbps, liveRoverMbps)}
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
											if (subsystem === SubSystems.HANDLING_DEVICE) {
												hdDepthOnClick(true);
											} else {
												rgbOnClick(subsystem, true);
											}
										} else {
											if (subsystem === SubSystems.HANDLING_DEVICE) {
												hdDepthOnClick(false);
											} else {
												rgbOnClick(subsystem, false);
											}
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