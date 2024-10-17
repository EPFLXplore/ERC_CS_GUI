import styles from "./style.module.sass";
import Timer from "../../components/ui/Timer";
import QuickAction from "../../components/Controls/QuickAction";
import { useNavigate } from "react-router-dom";

import NavIcon from "../../assets/images/icons/nav_logo.png";
import HDIcon from "../../assets/images/icons/handling_device_logo.png";
import Stop from "../../assets/images/icons/stop.png";
import Drill from "../../assets/images/icons/drill.png";
import SystemMode from "../../components/Controls/SystemMode";

import logo from "../../assets/images/logos/logo_XPlore.png";
import useRosBridge from "../../hooks/rosbridgeHooks";
import NavigationGoalModal from "../../components/modals/NavigationGoalModal";
import ArmGoalModal from "../../components/modals/ArmGoalModal";
import DrillGoalModal from "../../components/modals/DrillGoalModal";

import SubSystems from "../../data/subsystems.type";
import States from "../../data/states.type";
import {InfoBox, ControllerInfoBox} from "../../components/data/InfoBox";
import { Dvr, Settings, StoreMallDirectorySharp } from "@mui/icons-material";
import { Status } from "../../data/status.type";
import { CameraType } from "../../data/cameras.type";
import {
	getCurrentOrientation,
	getCurrentPosition,
	getNetworkData,
	getJointsPositions,
	getPivotAngle,
	getSteeringAngles,
	getTrajectory,
	getMotorDrill,
	getMotorModule,
	getWheelsDrivingValue,
	getBatteryLevel,
	getDrivingState,
	getJointsStates,
	getJointsCurrent,
	getCurrentDriving,
	getCurrentSteering,
	getCurrentOutput,
	getMainProcesses,
	getNodes,
	getLinearVelocity,
	getAngularVelocity,
	getDistanceToGoal
} from "../../utils/roverStateParser";
import AlertSnackbar from "../../components/ui/Snackbar";
import useAlert from "../../hooks/alertHooks";
import useRoverControls, { typeModal } from "../../hooks/roverControlsHooks";
import { AlertColor } from "@mui/material";
import { ReactElement } from "react";
import ROSLIB from "roslib";
import CameraModal from "../../components/modals/CameraModal";
import { start } from "repl";

const NewControlPage = () => {
	const navigate = useNavigate();
	const [snackbar, showSnackbar] = useAlert();
	const [ros, active, hdConfirmation] = useRosBridge(showSnackbar);
	const [
		roverState,
		cameraStates,
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
						showSnackbar,
						startService,
						ros
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
						onSelect={(mode) => startService(SubSystems.NAGIVATION, mode, false)}
					/>
					<SystemMode
						system={"Handling Device"}
						currentMode={stateServices[SubSystems.HANDLING_DEVICE].service.state}
						modes={["Auto", "Manual Direct", "Manual Inverse", "Off"]}
						onSelect={(mode) => startService(SubSystems.HANDLING_DEVICE, mode, false)}
					/>
					<SystemMode
						system={"Drill"}
						currentMode={stateServices[SubSystems.DRILL].service.state}
						modes={["On", "Off"]}
						onSelect={(mode) => startService(SubSystems.DRILL, mode, false)}
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
				<Timer
					status={active ? Status.RUNNING : Status.NOT_STARTED} // @ts-ignore
					wifiLevel={getNetworkData(roverState)[2]}
					battery={getBatteryLevel(roverState)}
				/>
			</div>
			<div className={styles.control}>
				<div className={styles.visualization}>
					{hdConfirmation !== null && (
						<div className={styles.confirm}>
							<p>Handling Device Confirmation</p>
							<div className={styles.confirmation}>
								<button onClick={() => hdConfirmation(true)}>Confirm</button>
								<button onClick={() => hdConfirmation(false)}>Cancel</button>
							</div>
						</div>
					)}
					<div className={styles.infosLeft}>
						<ControllerInfoBox
							title="Driving Currents"
							infos={[
								{ info: {name: "Front Left", value: getCurrentDriving(roverState)[0]}, connected: getDrivingState(roverState)[0] },
								{ info: {name: "Front Right", value: getCurrentDriving(roverState)[1]}, connected: getDrivingState(roverState)[1] },
								{ info: {name: "Back Right", value: getCurrentDriving(roverState)[2]}, connected: getDrivingState(roverState)[2] },
								{ info: {name: "Back Left", value: getCurrentDriving(roverState)[3]}, connected: getDrivingState(roverState)[3] },
							]}
							unit="mA"
						/>
					
						<ControllerInfoBox
							title="Steering Currents"
							infos={[
								{ info: {name: "Front Left", value: getCurrentSteering(roverState)[0]}, connected: getDrivingState(roverState)[0] },
								{ info: {name: "Front Right", value: getCurrentSteering(roverState)[1]}, connected: getDrivingState(roverState)[1] },
								{ info: {name: "Back Right", value: getCurrentSteering(roverState)[2]}, connected: getDrivingState(roverState)[2] },
								{ info: {name: "Back Left", value: getCurrentSteering(roverState)[3]}, connected: getDrivingState(roverState)[3] },
							]}
							unit="mA"
						/>
					
						<ControllerInfoBox
							title="Joints Currents"
							infos={[
								{ info: { name: "Joint 1", value: getJointsCurrent(roverState)[0]}, connected: getJointsStates(roverState)[0] },
								{ info: { name: "Joint 2", value: getJointsCurrent(roverState)[1]}, connected: getJointsStates(roverState)[1] },
								{ info: { name: "Joint 3", value: getJointsCurrent(roverState)[2]}, connected: getJointsStates(roverState)[2] },
								{ info: { name: "Joint 4", value: getJointsCurrent(roverState)[3]}, connected: getJointsStates(roverState)[3] },
								{ info: { name: "Joint 5", value: getJointsCurrent(roverState)[4]}, connected: getJointsStates(roverState)[4] },
								{ info: { name: "Joint 6", value: getJointsCurrent(roverState)[5]}, connected: getJointsStates(roverState)[5] },
							]}
							unit="mA"
						/>
						<ControllerInfoBox
							title="Drill Currents"
							infos={[
								{ info: { name: "Motor", value: getMotorModule(roverState)['current']}, connected: getMotorModule(roverState)['state'] },
								{ info: { name: "Drill", value: getMotorDrill(roverState)['current']}, connected: getMotorDrill(roverState)['state'] },
							]}
							unit="mA"
						/>
					</div>
					<div className={styles.infosMidLeft}>
						<InfoBox
							title="Wheels Speed"
							infos={[
								{ name: "Front Left", value: getWheelsDrivingValue(roverState)[0]},
								{ name: "Front Right", value: getWheelsDrivingValue(roverState)[1]},
								{ name: "Back Right", value: getWheelsDrivingValue(roverState)[2]},
								{ name: "Bsck Left", value: getWheelsDrivingValue(roverState)[3]},
							]}
							unit="m/s"
						/>
						<InfoBox
							title="Steering Angles"
							infos={[
								{ name: "Front Left", value: getSteeringAngles(roverState)[0]},
								{ name: "Front Right", value: getSteeringAngles(roverState)[1]},
								{ name: "Back Right", value: getSteeringAngles(roverState)[2]},
								{ name: "Bsck Left", value: getSteeringAngles(roverState)[3]},
							]}
							unit="°"
						/>
						<InfoBox
							title="Joints Angles"
							infos={[
								{ name: "Joint 1", value: getJointsPositions(roverState)[0]},
								{ name: "Joint 2", value: getJointsPositions(roverState)[1]},
								{ name: "Joint 3", value: getJointsPositions(roverState)[2]},
								{ name: "Joint 4", value: getJointsPositions(roverState)[3]},
								{ name: "Joint 5", value: getJointsPositions(roverState)[4]},
								{ name: "Joint 6", value: getJointsPositions(roverState)[5]},
							]}
							unit="°"
						/>
						<InfoBox
							title="Drill Data"
							infos={[
								{
									name: "Encoder",
									value: getMotorModule(roverState)['position'],
								},
								{
									name: "Velocity",
									value: getMotorDrill(roverState)['speed'],
									unit: "rpm"
								}
							]}
						/>
					</div>
					<div className={styles.infosMidLeft2}>
						<InfoBox
							title="Power Consumption"
							infos={[
								{ name: "Current", value: getCurrentOutput(roverState), unit: "A"},
								{ name: "Battery Level", value: getWheelsDrivingValue(roverState)[1], unit: "V"},
							]}
						/>
						<InfoBox
							title="Science Sensors"
							infos={[
								{ name: "Sensor 1", value: "NO DATA"},
								{ name: "Sensor 2", value: "NO DATA"},
							]}
						/>
						<InfoBox
							title="Pivot Angle"
							infos={[
								{ name: "Left", value: getPivotAngle(roverState)},
								{ name: "Right", value: getPivotAngle(roverState)},
							]}
							unit="°"
						/>
					</div>
					<div className={styles.infosMidRight}>
						{typeof getMainProcesses(roverState) !== "string" ? <ControllerInfoBox
							title="Main Processes"
							infos={[
								{ info: { name: getMainProcesses(roverState)[0]['name'], 
									value: getMainProcesses(roverState)[0]['cpu_usage']}, connected: getMainProcesses(roverState)[0]['status'] },
							]}
						/> : 
						<InfoBox
							title="Main Processes"
							infos={[
								{ name: "No Processes", value: ""},
							]}
						/>
						}
						{typeof getNodes(roverState) !== "string" ? <InfoBox
							title="ROS Nodes"
							infos={[
								{ name: getNodes(roverState)[0]['name'], 
									value: getNodes(roverState)[0]['status']}
							]}
						/> : 
						<InfoBox
							title="ROS Nodes"
							infos={[
								{ name: "No Nodes", value: ""},
							]}
						/>
						}
					</div>
					<div className={styles.infosRight}>
						<InfoBox
							title="Current Position"
							infos={[
								{ name: "X", value: getCurrentPosition(roverState).x },
								{ name: "Y", value: getCurrentPosition(roverState).y },
							]}
						/>
						<InfoBox
							title="Linear Velocity"
							infos={[
								{ name: "X", value: getLinearVelocity(roverState).x },
								{ name: "Y", value: getLinearVelocity(roverState).y },
							]}
						/>
						<InfoBox
							title="Current Orientation"
							infos={[
								{ name: "Roll", value: getCurrentOrientation(roverState).x },
								{ name: "Pitch", value: getCurrentOrientation(roverState).y },
								{ name: "Yaw", value: getCurrentOrientation(roverState).z },
							]}
						/>
						<InfoBox
							title="Angular Velocity"
							infos={[
								{ name: "Roll", value: getAngularVelocity(roverState).x },
								{ name: "Pitch", value: getAngularVelocity(roverState).y },
								{ name: "Yaw", value: getAngularVelocity(roverState).y },
							]}
						/>
						<InfoBox
							title="Distance to Goal"
							infos={[
								{ name: "Distance", value: getDistanceToGoal(roverState), unit: "m" },
							]}
						/>
					</div>
					<div className={styles.actions}>
						<QuickAction
							onClick={() => displaySystemModal(SubSystems.CAMERA, false)}
							selected={systemsModalOpen[SubSystems.CAMERA]}
							running={"false"}
							icon={NavIcon}
						/>
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
	showSnackbar: (severity: AlertColor, message: string) => void,
	startService: (system: string, mode: string, isCamera: boolean, active: boolean) => void,
	ros: ROSLIB.Ros | null
) => {
	switch (system) {
		case SubSystems.CAMERA:
			return (
				<CameraModal
					onClose={() => {
						setModal(<></>);
						setSystemsModalOpen((old: typeModal) => {
							const newModalOpen = { ...old };
							newModalOpen[SubSystems.CAMERA] = false;
							return newModalOpen;
						});
					}}
					ros={ros}
					onClick={(subsystem, mode, activated) => startService(subsystem, mode, true, activated)}
			/>
			);

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
				/>
			);
		default:
			return <></>;
	}
};

export default NewControlPage;
