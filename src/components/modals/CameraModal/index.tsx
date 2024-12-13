import React, { useEffect } from "react";
import styles from "./style.module.sass";
import { CameraType } from "../../../data/cameras.type";
import SubSystems from "../../../data/subsystems.type";
import { CameraCS, CameraHD, CameraNAV, CameraSC, CameraHD_RGB } from "../../../data/cameras.type";
import useNewCamera from "../../../hooks/newCameraHooks";
import ROSLIB from "roslib";
import useRoverState from "../../../hooks/roverStateHooks";

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
	const [cameraStates, images, rotateCams, currentVideo, setCurrentVideo] =
		useNewCamera(ros, roverState)

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
								<div className={styles.ChoiceContainer}>
									<button
										className={`${styles.Choice} ${
											//@ts-ignore
											cameraStates[SubSystems.CS][camera]['status'] ? styles.Selected : ""
											}`}
										onClick={() => {
											//@ts-ignore
											if (!cameraStates[SubSystems.CS][camera]['status']) {
												onClick(SubSystems.CS, camera, true)
											} else {
												onClick(SubSystems.CS, camera, false)
											}
										}}
									>
										{camera}
									</button>
									{dataRateDiv(cameraStates[SubSystems.CS], camera)}
								</div>
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
								<div className={styles.ChoiceContainer}>
									<button
										className={`${styles.Choice} ${
											//@ts-ignore
											cameraStates[SubSystems.HANDLING_DEVICE][camera]['status'] ? styles.Selected : ""
											}`}
										onClick={() => {
											//@ts-ignore
											if (!cameraStates[SubSystems.HANDLING_DEVICE][camera]['status']) {
												onClick(SubSystems.HANDLING_DEVICE, camera, true)
											} else {
												onClick(SubSystems.HANDLING_DEVICE, camera, false)
											}
										}}
									>
										{camera}
									</button>
									{dataRateDiv(cameraStates[SubSystems.HANDLING_DEVICE], camera)}
								</div>
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
								<div className={styles.ChoiceContainer}>
									<button
										className={`${styles.Choice} ${
											//@ts-ignore
											cameraStates[SubSystems.NAGIVATION][camera]['status'] ? styles.Selected : ""
											}`}
										onClick={() => {
											//@ts-ignore
											if (!cameraStates[SubSystems.NAGIVATION][camera]['status']) {
												onClick(SubSystems.NAGIVATION, camera, true)
											} else {
												onClick(SubSystems.NAGIVATION, camera, false)
											}
										}}
									>
										{camera}
									</button>
									{dataRateDiv(cameraStates[SubSystems.NAGIVATION], camera)}
								</div>
							)) : <p>NO DATA</p>}
					</div>
				</div>
				<div className={styles.ModalHeader}>
					<h1>Camera HD RGB/RGBD</h1>
				</div>
				<div className={styles.ModalContent}>

					<div className={styles.ChoiceGroup}>
						{cameraStates[SubSystems.HANDLING_DEVICE] != null ?

							Object.values(CameraHD_RGB).map((camera: string) => (
								<button
									className={`${styles.Choice} ${
										//@ts-ignore
										roverState[SubSystems.HANDLING_DEVICE]['state']['rgbd'] ? styles.Selected : ""
										}`}
									onClick={() => {
										//@ts-ignore
										if (!roverState[SubSystems.HANDLING_DEVICE]['state']['rgbd']) {
											rgbOnClick(SubSystems.HANDLING_DEVICE, true)
										}
										else {
											rgbOnClick(SubSystems.HANDLING_DEVICE, false)
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