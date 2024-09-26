import styles from "./style.module.sass";
import Timer from "../../components/ui/Timer";
import ExpandButton from "../../components/Controls/ExpandButton";
import Gamepad from "../../components/Controls/Gamepad";
import QuickAction from "../../components/Controls/QuickAction";
import { useNavigate } from "react-router-dom";

import NavIcon from "../../assets/images/icons/nav_logo.png";
import HDIcon from "../../assets/images/icons/handling_device_logo.png";
import Stop from "../../assets/images/icons/stop.png";
import Drill from "../../assets/images/icons/drill.png";
import SystemMode from "../../components/Controls/SystemMode";
import Simulation from "../../components/data/Simulation";
import RoverData from "../../components/data/RoverData";

import logo from "../../assets/images/logos/logo_XPlore.png";
import CameraView from "../../components/data/CameraView";
import useRosBridge from "../../hooks/rosbridgeHooks";
import NavigationGoalModal from "../../components/modals/NavigationGoalModal";
import ArmGoalModal from "../../components/modals/ArmGoalModal";
import DrillGoalModal from "../../components/modals/DrillGoalModal";

import SubSystems from "../../data/subsystems.type";
import States from "../../data/states.type";
import InfoBox from "../../components/data/InfoBox";
import { Dvr, Settings } from "@mui/icons-material";
import { Status } from "../../data/status.type";
import {
	getCurrentOrientation,
	getCurrentPosition,
	getdBm,
	getJointsPositions,
	getPivotAngle,
	getSteeringAngles,
	getTrajectory,
	getDrillModule,
	getWheelsDrivingValue,
	getDrillState,
	getDrillScrewRotation
} from "../../utils/roverStateParser";
import AlertSnackbar from "../../components/ui/Snackbar";
import useAlert from "../../hooks/alertHooks";
import useRoverControls, { typeModal } from "../../hooks/roverControlsHooks";
import { AlertColor } from "@mui/material";
import { ReactElement, useState } from "react";
import SettingsModal from "../../components/modals/SettingsModal";
import ROSLIB from "roslib";

const CAMERA_CONFIGS = [
	["camera_0"],
	["camera_1"],
	["camera_2"],
	["camera_3"],
	["camera_0", "camera_1"],
];
const MAX_CAMERAS = 5;

const NewControlPage = () => {
	const navigate = useNavigate();
	const [snackbar, showSnackbar] = useAlert();
	const [ros, active, hdConfirmation] = useRosBridge(showSnackbar);
	const [
		roverState,
		images,
		rotateCams,
		currentVideo,
		setCurrentVideo,
		dataOpen,
		setDataOpen,
		display,
		setDisplay,
		stateServices,
		stateActions,
		setStateActions,
		systemsModalOpen,
		setSystemsModalOpen,
		manualMode,
		modal,
		volumetric,
		setModal,
		dataFocus,
		cancelAction,
		cancelAllActions,
		launchAction,
		startService,
		changeMode,
		triggerDataFocus,
		point,
		setPoint,
		sentAction,
		setSendAction,
		setVolumetric,
	] = useRoverControls(ros, showSnackbar);

	/**
	 * Function handling the windows of actions at the bottom of the page
	 * @param system the subsystem or empty string for the button cancel all actions
	 * @param cancel if we use the cancel button or not
	 */
	const displaySystemModal = (system: SubSystems | "", cancel: boolean) => {
		setSystemsModalOpen((old) => {
			let newModalOpen = { ...old };

			if (cancel) {
				cancelAllActions();
				return newModalOpen;
			} else {
				// @ts-ignore
				newModalOpen[system] = true;
				setModal(
					selectModal(
						roverState,
						system,
						point,
						setModal,
						setSystemsModalOpen,
						launchAction,
						cancelAction,
						showSnackbar
					)
				);

				return newModalOpen;
			}
		});
	};

	return (
		<div className={"page " + styles.mainPage}>
			<div className={styles.header}>
				<img src={logo} className={styles.logo} alt="Logo Xplore" />
				<div className={styles.systems}>
					<SystemMode
						system={"Navigation"}
						currentMode={stateServices[SubSystems.NAGIVATION].service.state}
						modes={["Auto", "Manual", "Off"]}
						onSelect={(mode) => startService(SubSystems.NAGIVATION, mode)}
					/>
					<SystemMode
						system={"Handling Device"}
						currentMode={stateServices[SubSystems.HANDLING_DEVICE].service.state}
						modes={["Auto", "Manual Direct", "Manual Inverse", "Off"]}
						onSelect={(mode) => startService(SubSystems.HANDLING_DEVICE, mode)}
					/>
					<SystemMode
						system={"Cameras"}
						currentMode={stateServices[SubSystems.CAMERA].service.state}
						modes={["Stream", "Off"]}
						onSelect={(mode) => startService(SubSystems.CAMERA, mode)}
					/>
					<SystemMode
						system={"Drill"}
						currentMode={stateServices[SubSystems.DRILL].service.state}
						modes={["On", "Off"]}
						onSelect={(mode) => startService(SubSystems.DRILL, mode)}
					/>
				</div>
				<Dvr
					sx={{
						color: "white",
						fontSize: 30,
						marginX: 3,
						cursor: "pointer",
					}}
					onClick={() => navigate("/logs")}
				/>
				<Settings
					sx={{
						color: "white",
						opacity: 0.5,
						fontSize: 30,
						marginX: 3,
						// cursor: "pointer",
					}}
					onClick={() =>
						setModal(
							<SettingsModal
								title="Settings"
								volumetric={volumetric}
								setVolumetric={setVolumetric}
								onClose={() => setModal(<></>)}
							/>
						)
					}
				/>
				<Timer
					status={active ? Status.RUNNING : Status.NOT_STARTED} // @ts-ignore
					wifiLevel={getdBm(roverState)}
				/>
			</div>
			<div className={styles.control}>
				<div
					className={styles.data}
					style={{ width: dataOpen ? "18%" : 0, marginLeft: dataOpen ? 20 : 0 }}
				>
					{dataOpen && <h1>Rover Data</h1>}
					{
						// @ts-ignore
						dataOpen && !roverState["rover"] && <p>No data yet</p>
					}
					{
						// @ts-ignore
						dataOpen && roverState["rover"] && (
							<RoverData
								json={roverState}
								triggerDataFocus={triggerDataFocus}
								focusedData={dataFocus}
							/>
						)
					}
				</div>
				<div className={styles.visualization}>
					<div className={styles.expand}>
						<ExpandButton
							onClick={() => setDataOpen((old) => !old)}
							expanded={dataOpen}
						/>
					</div>
					{display === "camera" &&
					stateServices[SubSystems.CAMERA].service.state !== "Off" ? (
						<CameraView
							images={images}
							rotate={rotateCams}
							setRotateCams={() => {}}
							currentCam={CAMERA_CONFIGS[currentVideo]}
							changeCam={(dir) => {
								setCurrentVideo((old) => {
									console.log("change 1");
									if (dir === 1) {
										return (old + 1) % MAX_CAMERAS;
									} else {
										return (old - 1 + MAX_CAMERAS) % MAX_CAMERAS;
									}
								});
							}}
						/>
					) : (
						<Simulation
							drill_value={getDrillModule(roverState)}
							armJointAngles={getJointsPositions(roverState)}
							wheelsSteeringAngle={getSteeringAngles(roverState)}
							wheelsDrivingValue={getWheelsDrivingValue(roverState)}
							pivotAngle={getPivotAngle(roverState)}
							point={point}
							setPoint={setPoint}
							roverPosition={getCurrentPosition(roverState)}
							roverRotation={getCurrentOrientation(roverState)}
							plannedPath={getTrajectory(roverState)}
							volumetric={volumetric}
						/>
					)}
					{hdConfirmation !== null && (
						<div className={styles.confirm}>
							<p>Handling Device Confirmation</p>
							<div className={styles.confirmation}>
								<button onClick={() => hdConfirmation(true)}>Confirm</button>
								<button onClick={() => hdConfirmation(false)}>Cancel</button>
							</div>
						</div>
					)}
					<div className={styles.infosRight}>
						{stateServices[SubSystems.NAGIVATION].service.state !== "Off" && (
							<>
								<InfoBox
									title="Current position"
									infos={[
										{ name: "X coordinate", value: 0 },
										{ name: "Y coordinate", value: 0 },
										{ name: "Z coordinate", value: 0 },
									]}
								/>
								<InfoBox
									title="Current orientation"
									infos={[
										{ name: "Roll", value: 0 },
										{ name: "Pitch", value: 0 },
										{ name: "Yaw", value: 0 },
									]}
								/>
							</>
						)}
					</div>
					<div className={styles.infosLeft}>
						{stateServices[SubSystems.HANDLING_DEVICE].service.state !== "Off" && (
							<InfoBox
								title="Joints Currents"
								infos={[
									{ name: "Joint 1", value: 0 },
									{ name: "Joint 2", value: 0 },
									{ name: "Joint 3", value: 0 },
									{ name: "Joint 4", value: 0 },
									{ name: "Joint 5", value: 0 },
									{ name: "Joint 6", value: 0 },
								]}
								unit="mA"
							/>
						)}
						{stateServices[SubSystems.NAGIVATION].service.state !== "Off" && (
							<InfoBox
								title="Wheels Currents"
								infos={[
									{ name: "Wheels 1", value: 0 },
									{ name: "Wheels 2", value: 0 },
									{ name: "Wheels 3", value: 0 },
									{ name: "Wheels 4", value: 0 },
								]}
								unit="mA"
							/>
						)}
						{stateServices[SubSystems.DRILL].service.state !== "Off" && (
							<InfoBox
								title="Drill Module Position"
								infos={[
									{
										name: "Encoder",
										// @ts-ignore
										value: getDrillModule(roverState)
									},
									{
										name: "Velocity",
										value: getDrillScrewRotation(roverState)
									}
								]}
							/>
						)}
					</div>
					<div className={styles.previews}>
						<Gamepad
							mode={manualMode}
							submode={
								stateServices[SubSystems.HANDLING_DEVICE].service.state ===
								States.MANUAL_DIRECT
									? States.MANUAL_DIRECT
									: stateServices[SubSystems.HANDLING_DEVICE].service.state ===
									  States.MANUAL_INVERSE
									? States.MANUAL_INVERSE
									: States.MANUAL
							}
							selectorCallback={changeMode}
							changeCam={(dir) => {
								setCurrentVideo((old) => {
									console.log("change 2");
									if (dir === 1) {
										return (old + 1) % MAX_CAMERAS;
									} else {
										return (old - 1 + MAX_CAMERAS) % MAX_CAMERAS;
									}
								});
							}}
							visible={
								stateServices[SubSystems.NAGIVATION].service.state ===
									States.MANUAL ||
								stateServices[SubSystems.HANDLING_DEVICE].service.state ===
									States.MANUAL_DIRECT ||
								stateServices[SubSystems.HANDLING_DEVICE].service.state ===
									States.MANUAL_INVERSE
							}
							ros={ros}
						/>
						{stateServices[SubSystems.CAMERA].service.state !== "Off" && (
							<div
								className={styles.simulation}
								onDoubleClick={(e) => {
									e.stopPropagation();
									setDisplay((old) =>
										old === "camera" ? "simulation" : "camera"
									);
								}}
							>
								{display !== "camera" &&
								stateServices[SubSystems.CAMERA].service.state !== "Off" ? (
									<CameraView
										images={images}
										rotate={rotateCams}
										setRotateCams={() => {}}
										currentCam={CAMERA_CONFIGS[currentVideo]}
										changeCam={(dir) => {
											setCurrentVideo((old) => {
												console.log("change 3");
												if (dir === 1) {
													return (old + 1) % MAX_CAMERAS;
												} else {
													return (old - 1 + MAX_CAMERAS) % MAX_CAMERAS;
												}
											});
										}}
										small
									/>
								) : (
									<Simulation
										drill_value={getDrillModule(roverState)}
										armJointAngles={getJointsPositions(roverState)}
										wheelsSteeringAngle={getSteeringAngles(roverState)}
										wheelsDrivingValue={getWheelsDrivingValue(roverState)}
										pivotAngle={getPivotAngle(roverState)}
										point={point}
										setPoint={setPoint}
										roverPosition={getCurrentPosition(roverState)}
										roverRotation={getCurrentOrientation(roverState)}
										plannedPath={getTrajectory(roverState)}
									/>
								)}
							</div>
						)}
					</div>
					<div className={styles.actions}>
						<QuickAction
							onClick={() => displaySystemModal(SubSystems.NAGIVATION, false)}
							selected={systemsModalOpen[SubSystems.NAGIVATION]}
							running={stateActions[SubSystems.NAGIVATION].action.state}
							icon={NavIcon}
						/>
						<QuickAction
							onClick={() => displaySystemModal(SubSystems.HANDLING_DEVICE, false)}
							selected={systemsModalOpen[SubSystems.HANDLING_DEVICE]}
							running={stateActions[SubSystems.HANDLING_DEVICE].action.state}
							icon={HDIcon}
						/>
						<QuickAction
							onClick={() => displaySystemModal(SubSystems.DRILL, false)}
							selected={systemsModalOpen[SubSystems.DRILL]}
							running={stateActions[SubSystems.DRILL].action.state}
							icon={Drill}
						/>
						<QuickAction
							onClick={() => displaySystemModal("", true)}
							selected={false}
							running={States.OFF}
							icon={Stop}
						/>
					</div>
					{modal}
					<AlertSnackbar alertMessage={snackbar} />
				</div>
			</div>
		</div>
	);
};

const selectModal = (
	roverState: object,
	system: SubSystems | "",
	pointOnMap: { x: number; y: number },
	setModal: (modal: ReactElement | null) => void,
	setSystemsModalOpen: (modals: any) => void,
	launchAction: (system: string, goal: any) => void,
	cancelAction: (system: string) => void,
	showSnackbar: (severity: AlertColor, message: string) => void
) => {
	switch (system) {
		case SubSystems.NAGIVATION:
			return (
				<NavigationGoalModal
					onClose={() => {
						setModal(<></>);
						setSystemsModalOpen((old: typeModal) => {
							const newModalOpen = { ...old };
							newModalOpen[SubSystems.NAGIVATION] = false;
							return newModalOpen;
						});
					}}
					onSetGoal={launchAction}
					onCancelGoal={cancelAction}
					pointOnMap={pointOnMap}
				/>
			);
		case SubSystems.HANDLING_DEVICE:
			return (
				<ArmGoalModal
					onClose={() => {
						setModal(<></>);
						setSystemsModalOpen((old: typeModal) => {
							const newModalOpen = { ...old };
							newModalOpen[SubSystems.HANDLING_DEVICE] = false;
							return newModalOpen;
						});
					}}
					onSetGoal={launchAction}
					onCancelGoal={cancelAction}
					snackBar={showSnackbar}
				/>
			);
		case SubSystems.DRILL:
			return (
				<DrillGoalModal
					onClose={() => {
						setModal(<></>);
						setSystemsModalOpen((old: typeModal) => {
							const newModalOpen = { ...old };
							newModalOpen[SubSystems.DRILL] = false;
							return newModalOpen;
						});
					}}
					onSetGoal={launchAction}
					onCancelGoal={cancelAction}
					snackBar={showSnackbar}
					feedback={getDrillState(roverState)}
				/>
			);
		default:
			return <></>;
	}
};

export default NewControlPage;
