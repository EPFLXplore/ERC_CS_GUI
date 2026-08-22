import styles from "./style.module.sass";
import Header from "../../components/ui/Header";
import Background from "../../components/ui/Background";
import QuickAction from "../../components/Controls/QuickAction";

import NavIcon from "../../assets/images/icons/nav.svg";
import CameraIcon from "../../assets/images/icons/camera.svg"
import HDIcon from "../../assets/images/icons/handling_device.svg";
import Stop from "../../assets/images/icons/stop.svg";
import CommandsIcon from "../../assets/images/icons/setting.svg";
import Drill from "../../assets/images/icons/drill.svg";
import ParametersIcon from "../../assets/images/icons/parameters.svg";
import BindingsIcon from "../../assets/images/icons/bindings.svg";
import Suspension from "../../assets/images/icons/suspension.svg";
import SystemMode from "../../components/Controls/SystemMode";
import Canceled from "../../assets/images/icons/cancelled.svg";
import ResetMotors from "../../assets/images/icons/motors.svg";
import Sensor from "../../assets/images/icons/sensor.svg";
import PreviousIcon from "../../assets/images/icons/previous.svg";
import PauseIcon from "../../assets/images/icons/pause.svg";
import NextIcon from "../../assets/images/icons/next.svg";
import AvionicsIcon from "../../assets/images/icons/avionics.svg";

import logo from "../../assets/images/logos/logo_XPlore.png";
import useRosBridge from "../../hooks/rosbridgeHooks";
import NavigationGoalModal from "../../components/modals/NavigationGoalModal";
import ArmGoalModal from "../../components/modals/ArmGoalModal";
import DrillGoalModal from "../../components/modals/DrillGoalModal";
import ControlModal from "../../components/modals/ControlModal";
import ParametersModal from "../../components/modals/ParametersModal";
import BindingsModal from "../../components/modals/BindingsModal";
import NodeModal from "../../components/modals/NodeModal";
import ImageSelection from "../../components/data/ImageSelection";

import SubSystems from "../../data/subsystems.type";
import States from "../../data/states.type";
import { InfoBox, ControllerInfoBox } from "../../components/data/InfoBox";
import {
	getCurrentPosition,
	getCurrentOrientation,
	getJointsPositions,
	getSteeringAngles,
	getMotorDrill,
	getMotorModule,
	getWheelsDrivingValue,
	getDrivingState,
	getSteeringState,
	getJointsStates,
	getJointsCurrent,
	getCurrentDriving,
	getCurrentSteering,
	getCurrentOutput,
	getJetsonStatsHD,
	getJetsonStatsNAV,
	getStateFSM,
	getCurrentHDTask,
	getCurrentHDCommand,
	getBatteryState,
	getTorqueGripper,
	getBatteryVoltage,
	isBatteryLow,
	getDustSensor,
	getMassDrillSensor,
	getMassArmSensor,
	getForInOneSensor,
	getPH,
	getAvionicsAlive,
	getCameraStates
	
} from "../../utils/roverStateParser";
import AlertSnackbar from "../../components/ui/Snackbar";
import useAlert from "../../hooks/alertHooks";
import useRoverControls, { typeModal, HDS_REFRESH_WARNING } from "../../hooks/roverControlsHooks";
import useCameraServo, { CameraServoProvider } from "../../hooks/cameraServoHooks";
import useHdGamepadMode from "../../hooks/hdGamepadModeHooks";
import {
	MANUAL_SLOW_FACTOR_EVENT,
	MANUAL_SPEED_EVENT,
	ManualSlowFactor,
	ManualSpeed,
	loadManualSlowFactor,
	loadManualSpeed,
	saveManualSlowFactor,
	saveManualSpeed,
	stepManualSlowFactor,
} from "../../utils/hdSpeedConfig";
import { AlertColor } from "@mui/material";
import { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as ROSLIB from "roslib";
import CameraModal from "../../components/modals/CameraModal";
import { startCamModeService, startHdDepthCameraService } from "../../utils/changeCameraMode";
import Gamepad from "../../components/Controls/Gamepad";
import RosDdsDevBanner from "../../components/ui/RosDdsDevBanner";
import {resetFaults, resetHome, requestQrCodeScan} from "../../utils/navigationActions";
import AvionicsModal from "../../components/modals/AvionicsModal";
import WheelConfiguration from "../../components/data/WheelConfiguration";
import { CameraType } from "../../data/cameras.type";

const WIDGET_KEYS = [
	"drivingCurrents",
	"steeringCurrents",
	"jointsHdVelocity",
	"drill",
	"wheelsSpeed",
	"steeringAngles",
	"jointsHd",
	"wheelConfiguration",
	"jetsonHd",
	"jetsonNav",
	"hdData",
	"currentPosition",
	"avionicsSensors",
	"qrCodeScanner",
] as const;

type WidgetKey = (typeof WIDGET_KEYS)[number];
type TaskPreset =
	| "Navigation"
	| "Manipulation"
	| "Probing"
	| "Sampling"
	| "Astro-Bio Exploration"
	| "All";

const TASK_PRESETS: TaskPreset[] = [
	"Navigation",
	"Manipulation",
	"Probing",
	"Sampling",
	"Astro-Bio Exploration",
	"All",
];

const WIDGET_LABELS: Record<WidgetKey, string> = {
	drivingCurrents: "Driving Currents",
	steeringCurrents: "Steering Currents",
	jointsHdVelocity: "Joints HD Velocity",
	drill: "Drill",
	wheelsSpeed: "Wheels Speed",
	steeringAngles: "Steering Angles",
	jointsHd: "Joints HD",
	wheelConfiguration: "Wheel Configuration",
	jetsonHd: "Jetson HD",
	jetsonNav: "Jetson NAV",
	hdData: "HD Data",
	currentPosition: "Current Position",
	avionicsSensors: "Avionics Sensors",
	qrCodeScanner: "QR Code Scanner",
};

const buildVisibility = (enabledKeys: WidgetKey[]): Record<WidgetKey, boolean> => {
	return WIDGET_KEYS.reduce((acc, key) => {
		acc[key] = enabledKeys.includes(key);
		return acc;
	}, {} as Record<WidgetKey, boolean>);
};

const PRESET_VISIBILITY: Record<TaskPreset, Record<WidgetKey, boolean>> = {
	Navigation: buildVisibility([
		"drivingCurrents",
		"steeringCurrents",
		"wheelsSpeed",
		"steeringAngles",
		"wheelConfiguration",
		"jetsonHd",
		"jetsonNav",
		"drill",
		"currentPosition",
		"qrCodeScanner",
	]),
	Manipulation: buildVisibility([
		"drivingCurrents",
		"steeringCurrents",
		"jointsHdVelocity",
		"jointsHd",
		"wheelsSpeed",
		"steeringAngles",
		"wheelConfiguration",
		"jetsonHd",
		"jetsonNav",
		"hdData",
		"drill",
		"currentPosition",
	]),
	Probing: buildVisibility([
		"drivingCurrents",
		"steeringCurrents",
		"jointsHdVelocity",
		"jointsHd",
		"wheelsSpeed",
		"steeringAngles",
		"wheelConfiguration",
		"jetsonHd",
		"jetsonNav",
		"hdData",
		"drill",
	]),
	Sampling: buildVisibility([
		"drivingCurrents",
		"steeringCurrents",
		"jointsHdVelocity",
		"jointsHd",
		"drill",
		"wheelsSpeed",
		"steeringAngles",
		"wheelConfiguration",
		"jetsonHd",
		"jetsonNav",
		"hdData",
		"currentPosition",
	]),
	"Astro-Bio Exploration": buildVisibility([
		"drivingCurrents",
		"steeringCurrents",
		"jointsHdVelocity",
		"jointsHd",
		"drill",
		"wheelsSpeed",
		"steeringAngles",
		"wheelConfiguration",
		"jetsonHd",
		"jetsonNav",
		"hdData",
		"avionicsSensors",
	]),
	All: buildVisibility(WIDGET_KEYS as unknown as WidgetKey[]),
};

/**
 * The two service-backed prompts send their answer back over the rosbridge websocket, which a
 * reload destroys, and the rover does not re-issue the request. The browser's own beforeunload
 * dialog cannot carry custom wording, so the operator has to read it here.
 */
const RefreshWarning = () => (
	<div className={styles.refreshWarning}>
		<p className={styles.refreshWarningText}>{HDS_REFRESH_WARNING}</p>
	</div>
);

const NewControlPage = () => {
	const [snackbar, showSnackbar] = useAlert();
	const [ros, rosConnected] = useRosBridge(showSnackbar);
	const roverControls = useRoverControls(ros, showSnackbar);

  	// Destructure:
  	const [
		roverState,
		qrCode,
		setQrCode,
		hdStackLaunched,
		hdConfirmation,
		hdConfirmationSelectElements,
		numberElementToSelect,
		imageToSelect,
		setImageToSelect,
		stateServices,
		stateActions,
		,
		systemsModalOpen,
		setSystemsModalOpen,
		manualMode,
		modal,
		,
		setModal,
		,
		cancelAction,
		cancelAllActions,
		launchAction,
		startService,
		changeMode,
		,
		point,
		,
		,
		,
		setRosModalOpen,
		modalRosNodes,
		setModalRosNodes,
		changeSpeedRover,
		,
		reset_leds,
		reset_motors,
		emergency_shutdown,
		sendHdNamedPose,
		updateHdTaskCommand,
		stateTopicDiagnostics
  	] = roverControls;

	// Owns the ZED front-camera servo angle and binds the gamepad D-pad to it. Lives here rather
	// than in the Avionics modal because the D-pad has to keep working while that modal is closed.
	const cameraServo = useCameraServo(ros, manualMode);
	useHdGamepadMode(
		manualMode,
		stateServices[SubSystems.HANDLING_DEVICE].service.state,
		startService
	);

	const roverStateRef = useRef(roverState);
	roverStateRef.current = roverState;

	/**
	 * Function handling the windows of actions at the bottom of the page
	 * @param system the subsystem or empty string for the button cancel all actions
	 * @param cancel if we use the cancel button or not
	 */
	const displaySystemModal = (system: SubSystems | string) => {
		setSystemsModalOpen((old: typeModal) => {
			let newModalOpen = { ...old };

			if (system === "cancel_all_actions") {
				cancelAllActions();
				return newModalOpen;
			} else if (system === "reset_motors") {
				reset_motors();
				return newModalOpen;
			} else if (system === "emergency_shutdown") {
				emergency_shutdown();
				return newModalOpen;
			} else {
				// @ts-ignore
				newModalOpen[system] = true;
				setModal(
					selectModal(
						getCameraStates(roverState),
						system,
						point,
						setModal,
						setSystemsModalOpen,
						launchAction,
						cancelAction,
						showSnackbar,
						startService,
						hdConfirmation,
						changeSpeedRover,
						reset_leds,
						sendHdNamedPose,
						ros,
						updateHdTaskCommand,
						handleQrCodeScan
					)
				);

				return newModalOpen;
			}
		});
	};

	const displayRosModal = (system: SubSystems) => {
		setRosModalOpen((old: typeModal) => {
			let newModalOpen = { ...old };

			// @ts-ignore
			newModalOpen[system] = true;
			setModalRosNodes(
				selectModalRos(
					roverState,
					system,
					setModalRosNodes,
					setRosModalOpen,
					ros
				)
			);

			return newModalOpen;
		});
	};

	const [isWidgetMenuOpen, setIsWidgetMenuOpen] = useState(false);
	const [activePreset, setActivePreset] = useState<TaskPreset | "Custom">("All");
	const [manualSpeed, setManualSpeed] = useState<ManualSpeed>(() => loadManualSpeed());
	const [manualSlowFactor, setManualSlowFactor] = useState<ManualSlowFactor>(() =>
		loadManualSlowFactor()
	);
	const [qrCodeMessage, setQrCodeMessage] = useState<string>("NO DATA");

	const handleQrCodeScan = useCallback(
		(rosInstance: ROSLIB.Ros | null, snackBar: (severity: AlertColor, message: string) => void) => {
			requestQrCodeScan(rosInstance, snackBar, setQrCodeMessage);
		},
		[],
	);

	const toggleManualSpeed = useCallback(() => {
		// Computed outside the updater: saveManualSpeed dispatches an event, and side effects must
		// not run inside a setState updater.
		const next: ManualSpeed = manualSpeed === "slow" ? "fast" : "slow";
		setManualSpeed(next);
		saveManualSpeed(next);
	}, [manualSpeed]);

	// Only sets the factor — never arms slow mode. A stray click in the header must not slow the arm.
	const selectManualSlowFactor = useCallback((factor: ManualSlowFactor) => {
		setManualSlowFactor(factor);
		saveManualSlowFactor(factor);
	}, []);

	useEffect(() => {
		const syncManualSettings = () => {
			setManualSpeed(loadManualSpeed());
			setManualSlowFactor(loadManualSlowFactor());
		};

		window.addEventListener(MANUAL_SPEED_EVENT, syncManualSettings as EventListener);
		window.addEventListener(MANUAL_SLOW_FACTOR_EVENT, syncManualSettings as EventListener);
		window.addEventListener("storage", syncManualSettings);

		return () => {
			window.removeEventListener(MANUAL_SPEED_EVENT, syncManualSettings as EventListener);
			window.removeEventListener(MANUAL_SLOW_FACTOR_EVENT, syncManualSettings as EventListener);
			window.removeEventListener("storage", syncManualSettings);
		};
	}, []);
	const [visibleWidgets, setVisibleWidgets] = useState<Record<WidgetKey, boolean>>(() => {
		return WIDGET_KEYS.reduce((acc, key) => {
			acc[key] = true;
			return acc;
		}, {} as Record<WidgetKey, boolean>);
	});

	const applyPreset = (preset: TaskPreset) => {
		setVisibleWidgets(PRESET_VISIBILITY[preset]);
		setActivePreset(preset);
	};

	const toggleWidgetVisibility = (key: WidgetKey) => {
		setActivePreset("Custom");
		setVisibleWidgets((previous) => ({
			...previous,
			[key]: !previous[key],
		}));
	};

	const displayRosModalRef = useRef(displayRosModal);
	displayRosModalRef.current = displayRosModal;
	const updateHdTaskCommandRef = useRef(updateHdTaskCommand);
	updateHdTaskCommandRef.current = updateHdTaskCommand;

	const widgetCards = useMemo((): { key: WidgetKey; content: ReactElement }[] => {
	const drillModule = getMotorModule(roverState);
	const drillMotor = getMotorDrill(roverState);
	const drillFsm = getStateFSM(roverState);
	const drillMode =
		roverState?.drill?.state?.mode != null ? String(roverState.drill.state.mode) : "NO DATA";
	return [
		{
			key: "drivingCurrents",
			content: (
				<ControllerInfoBox
					title="Driving Currents"
					infos={[
						{ info: { name: "FRONT LEFT DRIVE", value: getCurrentDriving(roverState)[0] }, connected: getDrivingState(roverState)[0] },
						{ info: { name: "FRONT RIGHT DRIVE", value: getCurrentDriving(roverState)[1] }, connected: getDrivingState(roverState)[1] },
						{ info: { name: "BACK RIGHT DRIVE", value: getCurrentDriving(roverState)[2] }, connected: getDrivingState(roverState)[2] },
						{ info: { name: "BACK LEFT DRIVE", value: getCurrentDriving(roverState)[3] }, connected: getDrivingState(roverState)[3] },
					]}
					unit="mA"
				/>
			),
		},
		{
			key: "steeringCurrents",
			content: (
				<ControllerInfoBox
					title="Steering Currents"
					infos={[
						{ info: { name: "FRONT LEFT STEER", value: getCurrentSteering(roverState)[0] }, connected: getSteeringState(roverState)[0] },
						{ info: { name: "FRONT RIGHT STEER", value: getCurrentSteering(roverState)[1] }, connected: getSteeringState(roverState)[1] },
						{ info: { name: "BACK RIGHT STEER", value: getCurrentSteering(roverState)[2] }, connected: getSteeringState(roverState)[2] },
						{ info: { name: "BACK LEFT STEER", value: getCurrentSteering(roverState)[3] }, connected: getSteeringState(roverState)[3] },
					]}
					unit="mA"
				/>
			),
		},
		{
			key: "jointsHdVelocity",
			content: (
				<ControllerInfoBox
					title="Joints HD Velocity"
					infos={[
						{ info: { name: "Joint 1", value: getJointsCurrent(roverState)[0] }, connected: getJointsStates(roverState)[0] },
						{ info: { name: "Joint 2", value: getJointsCurrent(roverState)[1] }, connected: getJointsStates(roverState)[1] },
						{ info: { name: "Joint 3", value: getJointsCurrent(roverState)[2] }, connected: getJointsStates(roverState)[2] },
						{ info: { name: "Joint 4", value: getJointsCurrent(roverState)[3] }, connected: getJointsStates(roverState)[3] },
						{ info: { name: "Joint 5", value: getJointsCurrent(roverState)[4] }, connected: getJointsStates(roverState)[4] },
						{ info: { name: "Joint 6", value: getJointsCurrent(roverState)[5] }, connected: getJointsStates(roverState)[5] },
						{ info: { name: "Gripper", value: getJointsCurrent(roverState)[6] }, connected: getJointsStates(roverState)[6] },
					]}
					unit="rad/s"
					decimals={3}
				/>
			),
		},
		{
			key: "drill",
			content: (
				<ControllerInfoBox
					title="Drill"
					infos={[
						{
							info: { name: "Position", value: drillModule.position, unit: "cm" },
							connected: drillModule.homed,
						},
						{ info: { name: "FSM State", value: drillFsm }, connected: drillMode },
						{
							info: { name: "Translation", value: drillModule.current, unit: "mA" },
							connected: drillModule.state,
						},
						{
							info: { name: "Drill", value: drillMotor.current, unit: "mA" },
							connected: drillMotor.state,
						},
						{
							info: { name: "Velocity", value: drillMotor.speed, unit: "rpm" },
							connected: drillMotor.state,
						},
					]}
				/>
			),
		},
		{
			key: "wheelsSpeed",
			content: (
				<InfoBox
					title="Wheels Speed"
					infos={[
						{ name: "Front Left", value: getWheelsDrivingValue(roverState)[0] },
						{ name: "Front Right", value: getWheelsDrivingValue(roverState)[1] },
						{ name: "Back Right", value: getWheelsDrivingValue(roverState)[2] },
						{ name: "Back Left", value: getWheelsDrivingValue(roverState)[3] },
					]}
					unit="m/s"
				/>
			),
		},
		{
			key: "steeringAngles",
			content: (
				<InfoBox
					title="Steering Angles"
					infos={[
						{ name: "Front Left", value: getSteeringAngles(roverState)[0] },
						{ name: "Front Right", value: getSteeringAngles(roverState)[1] },
						{ name: "Back Right", value: getSteeringAngles(roverState)[2] },
						{ name: "Back Left", value: getSteeringAngles(roverState)[3] },
					]}
					unit="°"
				/>
			),
		},
		{
			key: "jointsHd",
			content: (
				<InfoBox
					title="Joints HD"
					infos={[
						{ name: "Joint 1", value: getJointsPositions(roverState)[0], unit: "°" },
						{ name: "Joint 2", value: getJointsPositions(roverState)[1], unit: "°" },
						{ name: "Joint 3", value: getJointsPositions(roverState)[2], unit: "°" },
						{ name: "Joint 4", value: getJointsPositions(roverState)[3], unit: "°" },
						{ name: "Joint 5", value: getJointsPositions(roverState)[4], unit: "°" },
						{ name: "Joint 6", value: getJointsPositions(roverState)[5], unit: "°" },
						{ name: "Gripper", value: getTorqueGripper(roverState), unit: "Nm" },
					]}
					warning={true}
					triggerWarning={(x: number) => x > 300 || x < -300}
				/>
			),
		},
		{
			key: "wheelConfiguration",
			content: (
				<div className={styles.WheelConfigBox}>
					<WheelConfiguration
						steeringAngles={getSteeringAngles(roverState)}
						wheelSpeeds={getWheelsDrivingValue(roverState)}
					/>
				</div>
			),
		},
		{
			key: "jetsonHd",
			content: (
				<InfoBox
					title="Jetson HD"
					infos={[
						{ name: "RAM", value: getJetsonStatsHD(roverState).ram, unit: "GB" },
						{ name: "GPU", value: getJetsonStatsHD(roverState).load_gpu, unit: "%" },
						{ name: "Power", value: getJetsonStatsHD(roverState).power_tot, unit: "W" },
						{ name: "Fan", value: getJetsonStatsHD(roverState).fan_rpm, unit: "rpm" },
						{ name: "CPU Temp", value: getJetsonStatsHD(roverState).temp_cpu, unit: "°C" },
						{ name: "GPU Temp", value: getJetsonStatsHD(roverState).temp_gpu, unit: "°C" },
					]}
					usages={getJetsonStatsHD(roverState).cpu_usage}
				/>
			),
		},
		{
			key: "jetsonNav",
			content: (
				<InfoBox
					title="Jetson NAV"
					infos={[
						{ name: "RAM", value: getJetsonStatsNAV(roverState).ram, unit: "GB" },
						{ name: "GPU", value: getJetsonStatsNAV(roverState).load_gpu, unit: "%" },
						{ name: "Power", value: getJetsonStatsNAV(roverState).power_tot, unit: "W" },
						{ name: "Fan", value: getJetsonStatsNAV(roverState).fan_rpm, unit: "rpm" },
						{ name: "CPU Temp", value: getJetsonStatsNAV(roverState).temp_cpu, unit: "°C" },
						{ name: "GPU Temp", value: getJetsonStatsNAV(roverState).temp_gpu, unit: "°C" },
					]}
					usages={getJetsonStatsNAV(roverState).cpu_usage}
				/>
			),
		},
		{
			key: "hdData",
			content: (
				<div className={styles.hdDataWidget}>
					<InfoBox
						title="HD Data"
						infos={[
							{ name: "Task", value: getCurrentHDTask(roverState) },
							{ name: "Command", value: getCurrentHDCommand(roverState) },
						]}
					/>
					<div className={styles.hdDataControls}>
						<button
							type="button"
							className={styles.hdDataControlButton}
							onClick={() => updateHdTaskCommandRef.current(2)}
							title="Previous Command"
						>
							<img src={PreviousIcon} alt="Previous" />
							<span>Previous</span>
						</button>
						<button
							type="button"
							className={styles.hdDataControlButton}
							onClick={() => updateHdTaskCommandRef.current(0)}
							title="Pause Task"
						>
							<img src={PauseIcon} alt="Pause" />
							<span>Pause</span>
						</button>
						<button
							type="button"
							className={styles.hdDataControlButton}
							onClick={() => updateHdTaskCommandRef.current(1)}
							title="Next Command"
						>
							<img src={NextIcon} alt="Next" />
							<span>Next</span>
						</button>
					</div>
				</div>
			),
		},
		{
			key: "currentPosition",
			content: (
				<InfoBox
					title="ERC Map Frame Position"
					infos={[
						{ name: "X", value: getCurrentPosition(roverState).x },
						{ name: "Y", value: getCurrentPosition(roverState).y },
						{ name: "Yaw", value: getCurrentOrientation(roverState).z, unit: "°" },
					]}
				/>
			),
		},
		{
			key: "avionicsSensors",
			content: (
				<InfoBox
					title="Avionics Sensors"
					infos={[
						{ name: "pH", value: getPH(roverState) },
						{ name: "Mass Drill", value: getMassDrillSensor(roverState), unit: "g" },
						{ name: "Mass HD", value: getMassArmSensor(roverState), unit: "g" },
					]}
				/>
			),
		},
		{
			key: "qrCodeScanner",
			content: (
				<InfoBox
					title="QR Code Scanner"
					infos={[
						{ name: "Result", value: qrCodeMessage },
					]}
				/>
			),
		},
	];
	}, [roverState, qrCodeMessage]); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<CameraServoProvider value={cameraServo}>
		<div className={"page " + styles.mainPage}>
			<Background />
			<div className={styles.header}>
				<div className={styles.leftHeader}>
					<img src={logo} className={styles.logo} alt="Logo Xplore" />
					<div className={styles.powerHeader}>
						<span className={styles.powerItem}>I: {getCurrentOutput(roverState)} A</span>
						<div className={styles.voltageCell}>
							<span className={styles.powerItem}>V: {getBatteryVoltage(roverState)} V</span>
							{isBatteryLow(roverState) && (
								<span className={styles.batteryWarning} role="alert">
									⚠ WARNING BATTERY LOW
								</span>
							)}
						</div>
						<span className={styles.powerItem}>State: {getBatteryState(roverState)}</span>
						<span className={styles.powerItem} style={{ color: getAvionicsAlive(roverState) ? "#4caf50" : "#f44336" }}>
							● Avionics {getAvionicsAlive(roverState) ? "Alive" : "Dead"}
						</span>
					</div>
					<RosDdsDevBanner
						rosConnected={rosConnected}
						stateTopics={stateTopicDiagnostics}
					/>
					<SystemMode
						system={"NAV"}
						currentMode={stateServices[SubSystems.NAGIVATION].service.state}
						modes={[States.AUTO, States.ACKERMANN, States.OMNI_DIRECTIONAL, States.OFF]}
						onSelect={(mode) => startService(SubSystems.NAGIVATION, mode, false)}
					/>
					<div className={styles.hdModeGroup}>
						<SystemMode
							system={"HD"}
							currentMode={stateServices[SubSystems.HANDLING_DEVICE].service.state}
							modes={[States.AUTO, States.MANUAL_DIRECT, States.MANUAL_INVERSE, States.OFF]}
							onSelect={(mode) => startService(SubSystems.HANDLING_DEVICE, mode, false)}
						/>
						<button
							type="button"
							className={`${styles.manualSpeedToggle} ${
								manualSpeed === "slow" ? styles.manualSpeedToggleSlow : ""
							} ${
								stateServices[SubSystems.HANDLING_DEVICE].service.state === States.MANUAL_DIRECT
									? ""
									: styles.manualSpeedToggleIdle
							}`}
							onClick={toggleManualSpeed}
							aria-pressed={manualSpeed === "slow"}
							title={`Manual Direct joint speed. Slow applies a ${manualSlowFactor}·x⁴ curve to J1–J6 for maintenance work, with J1 scaled by another 0.5x. Full deflection is capped at ${Math.round(
								manualSlowFactor * 100
							)}% speed before the J1 scale. The gripper is unaffected. Step the factor with D-pad LEFT/RIGHT or the SLOW controls next to DRL.`}
						>
							{manualSpeed === "slow" ? `Slow: maintenance (${manualSlowFactor})` : "Fast"}
						</button>
					</div>
					<SystemMode
						system={"DRL"}
						currentMode={stateServices[SubSystems.DRILL].service.state}
						modes={[States.ON, States.OFF]}
						onSelect={(mode) => startService(SubSystems.DRILL, mode, false)}
					/>
					<div
						className={styles.slowFactorGroup}
						title="Ceiling of the Manual Direct slow curve: full stick deflection commands this fraction of full joint speed, with J1 scaled by another 0.5x. Only takes effect while the HD toggle is on Slow. D-pad LEFT/RIGHT steps this value."
					>
						<span className={styles.slowFactorLabel}>SLOW ×</span>
						<div className={styles.slowFactorButtons}>
							<button
								type="button"
								className={`${styles.slowFactorButton} ${
									stateServices[SubSystems.HANDLING_DEVICE].service.state === States.MANUAL_DIRECT
										? ""
										: styles.slowFactorButtonIdle
								}`}
								onClick={() => selectManualSlowFactor(stepManualSlowFactor(manualSlowFactor, -1))}
								aria-label="Decrease manual slow factor"
							>
								-
							</button>
							<span className={styles.slowFactorValue}>{manualSlowFactor}</span>
							<button
								type="button"
								className={`${styles.slowFactorButton} ${
									stateServices[SubSystems.HANDLING_DEVICE].service.state === States.MANUAL_DIRECT
										? ""
										: styles.slowFactorButtonIdle
								}`}
								onClick={() => selectManualSlowFactor(stepManualSlowFactor(manualSlowFactor, 1))}
								aria-label="Increase manual slow factor"
							>
								+
							</button>
						</div>
					</div>
				</div>
			</div>
			<div className={styles.control}>
				<div className={styles.visualization}>

					{hdStackLaunched !== null && (
						<div className={styles.confirm}>
						<div className={styles.confirmBox}>
							<p>Handling Device Started</p>
							<div className={styles.confirmation}>
								<button className={styles.confirmBtn} onClick={() => hdStackLaunched(true)}>Acknowledge</button>
							</div>
							<RefreshWarning />
						</div>
					</div>
					)}

					{hdConfirmationSelectElements !== null && imageToSelect && (
						<div className={styles.confirm} role="dialog" aria-modal="true" aria-label="Handling device image selection">
							<ImageSelection
								imageData={imageToSelect}
								number_element_to_select={numberElementToSelect}
								setCoordinates={(x: number[], y: number[]) => hdConfirmationSelectElements(x, y)}
								onClose={() => setImageToSelect(null)}
							/>
							<RefreshWarning />
						</div>
					)}
					<>
						{hdConfirmation !== null && (
							<div className={styles.confirm}>
							<div className={styles.confirmBox}>
								<p>Handling Device Confirmation</p>
								<p>Data: {qrCode}</p>
								<div className={styles.confirmation}>
									<button className={styles.confirmBtn} onClick={() => {
										hdConfirmation(true)
										setQrCode(null)
									}}>Confirm</button>
									<button className={styles.confirmBtn} onClick={() => {
										hdConfirmation(false)
										setQrCode(null)
									}}>Cancel</button>
								</div>
								<RefreshWarning />
							</div>
						</div>
						)}
					</>
					<div className={`${styles.widgetSidebar} ${isWidgetMenuOpen ? styles.widgetSidebarExpanded : styles.widgetSidebarCollapsed}`}>
						<button
							type="button"
							className={styles.widgetSidebarToggle}
							onClick={() => setIsWidgetMenuOpen((previous) => !previous)}
						>
							{isWidgetMenuOpen ? "Hide Widgets" : "Widgets"}
						</button>
						<div className={`${styles.widgetSidebarPanel} ${isWidgetMenuOpen ? styles.widgetSidebarPanelOpen : styles.widgetSidebarPanelClosed}`}>
								<div className={styles.presetHeader}>Task Presets</div>
								<div className={styles.presetGrid}>
									{TASK_PRESETS.map((preset) => (
										<button
											type="button"
											key={preset}
											className={`${styles.presetButton} ${activePreset === preset ? styles.presetButtonActive : ""}`}
											onClick={() => applyPreset(preset)}
										>
											{preset}
										</button>
									))}
								</div>
								<div className={styles.presetHeader}>Widgets</div>
								{WIDGET_KEYS.map((key) => (
									<label className={styles.widgetOption} key={key}>
										<input
											type="checkbox"
											checked={visibleWidgets[key]}
											onChange={() => toggleWidgetVisibility(key)}
										/>
										<span>{WIDGET_LABELS[key]}</span>
									</label>
								))}
						</div>
					</div>

					<div className={`${styles.widgetsGrid} ${isWidgetMenuOpen ? styles.widgetsGridShifted : ""}`}>
						{widgetCards
							.filter((widget) => visibleWidgets[widget.key])
							.map((widget) => (
								<div className={styles.widgetItem} key={widget.key}>
									{widget.content}
								</div>
							))}
					</div>

					<div className={styles.actions}>
						<div className={styles.dockGroup}>
							<div className={styles.dockGroupTitle}>SUBSYSTEMS</div>

							<div className={styles.restActionsGroup}>
								<QuickAction
									onClick={() => displaySystemModal(SubSystems.NAGIVATION)}
									selected={systemsModalOpen[SubSystems.NAGIVATION]}
									running={stateActions[SubSystems.NAGIVATION].action.state}
									icon={NavIcon}
									tooltip={"Navigation"}
								/>
								<QuickAction
									onClick={() => displaySystemModal(SubSystems.HANDLING_DEVICE)}
									selected={systemsModalOpen[SubSystems.HANDLING_DEVICE]}
									running={stateActions[SubSystems.HANDLING_DEVICE].action.state}
									icon={HDIcon}
									tooltip={"Handling Device"}
								/>
								<QuickAction
									onClick={() => displaySystemModal(SubSystems.DRILL)}
									selected={systemsModalOpen[SubSystems.DRILL]}
									running={stateActions[SubSystems.DRILL].action.state}
									icon={Drill}
									tooltip={"Drill"}
									className={styles.drillAction}
								/>
							</div>
						</div>

						<div className={styles.dockGroup}>
							<div className={styles.dockGroupTitle}>UTILITIES</div>
							<div className={styles.utilityActionsGroup}>
								<QuickAction
									onClick={() => displaySystemModal(SubSystems.CAMERA)}
									selected={systemsModalOpen[SubSystems.CAMERA]}
									running={"Off"}
									icon={CameraIcon}
									tooltip={"Camera"}
								/>
								<QuickAction
									onClick={() => displaySystemModal("commands")}
									selected={false}
									running={States.OFF}
									icon={CommandsIcon}
									tooltip={"Dockers"}
								/>
								<QuickAction
									onClick={() => displaySystemModal("parameters")}
									selected={Boolean(systemsModalOpen["parameters"])}
									running={States.OFF}
									icon={ParametersIcon}
									tooltip={"Parameters"}
								/>
								<QuickAction
									onClick={() => displaySystemModal("bindings")}
									selected={Boolean(systemsModalOpen["bindings"])}
									running={States.OFF}
									icon={BindingsIcon}
									tooltip={"Bindings"}
								/>
								<QuickAction
									onClick={() => displaySystemModal("avionics")}
									selected={Boolean(systemsModalOpen["avionics"])}
									running={States.OFF}
									icon={AvionicsIcon}
									tooltip={"Avionics"}
								/>
							</div>
						</div>

						<div className={styles.dockGroup}>
							<div className={styles.dockGroupTitle}>REQUESTS</div>

							<div className={styles.criticalActionsGroup}>
								<QuickAction
									onClick={() => displaySystemModal("cancel_all_actions")}
									selected={false}
									running={States.OFF}
									icon={Canceled}
									tooltip={"Cancel All Actions"}
								/>
								<QuickAction
									onClick={() => displaySystemModal("reset_motors")}
									selected={false}
									running={States.OFF}
									icon={ResetMotors}
									tooltip={"Reset Motors Requested"}
								/>
								<QuickAction
									onClick={() => displaySystemModal("emergency_shutdown")}
									selected={false}
									running={States.OFF}
									icon={Stop}
									tooltip={"Emergency Shutdown Requested"}
								/>
							</div>
						</div>
					</div>
					{modal}
					{modalRosNodes}
					<AlertSnackbar alertMessage={snackbar} />
				</div>
				<div className={styles.previews}>
					<Gamepad
						mode={manualMode}
						submode={[stateServices[SubSystems.NAGIVATION].service.state, stateServices[SubSystems.HANDLING_DEVICE].service.state]}
						selectorCallback={changeMode}
						visible={
							stateServices[SubSystems.NAGIVATION].service.state ===
								States.ACKERMANN || 
								stateServices[SubSystems.NAGIVATION].service.state ===
								States.OFF ||
							stateServices[SubSystems.NAGIVATION].service.state ===
								States.OMNI_DIRECTIONAL ||
							stateServices[SubSystems.HANDLING_DEVICE].service.state ===
								States.MANUAL_DIRECT ||
							stateServices[SubSystems.HANDLING_DEVICE].service.state ===
								States.MANUAL_INVERSE
						}
						ros={ros}
					/>
				</div>
			</div>
			<div className={styles.networkFooter}>
				<Header />
			</div>
		</div>
		</CameraServoProvider>
	);
};

const selectModal = (
	cameraStates: CameraType,
	system: SubSystems | string,
	pointOnMap: { x: number; y: number },
	setModal: (modal: ReactElement | null) => void,
	setSystemsModalOpen: (modals: any) => void,
	launchAction: (system: string, goal: any) => void,
	cancelAction: (system: string) => void,
	showSnackbar: (severity: AlertColor, message: string) => void,
	startService: (system: string, mode: string, isCamera: boolean, active: boolean) => void,
	resetHdConfirmation: ((value: boolean) => void) | null,
	changeSpeedRover: (value: number) => void,
	reset_leds: () => void,
	sendHdNamedPose: (poseName: string) => void,
	ros: ROSLIB.Ros | null,
	updateHdTaskCommand: (mode: 0 | 1 | 2) => void,
	onQrCodeScan: (ros: ROSLIB.Ros | null, snackBar: (severity: AlertColor, message: string) => void) => void,
) => {
	switch (system) {
		case "commands":
			return (
				<ControlModal
					onClose={() => {
						setModal(<></>);
						setSystemsModalOpen((old: typeModal) => {
							const newModalOpen = { ...old };
							newModalOpen["commands"] = false;
							return newModalOpen;
						})
					}}
					snackBar={showSnackbar}
					resetLeds={reset_leds}
				/>
			);

		case "parameters":
			return (
				<ParametersModal
					ros={ros}
					onClose={() => {
						setModal(<></>);
						setSystemsModalOpen((old: typeModal) => {
							const newModalOpen = { ...old };
							newModalOpen["parameters"] = false;
							return newModalOpen;
						});
					}}
					snackBar={showSnackbar}
				/>
			);

		case "bindings":
			return (
				<BindingsModal
					onClose={() => {
						setModal(<></>);
						setSystemsModalOpen((old: typeModal) => {
							const newModalOpen = { ...old };
							newModalOpen["bindings"] = false;
							return newModalOpen;
						});
					}}
					snackBar={showSnackbar}
				/>
			);

		case SubSystems.CAMERA:
			return (
				<CameraModal
					ros={ros}
					onClose={() => {
						setModal(<></>);
						setSystemsModalOpen((old: typeModal) => {
							const newModalOpen = { ...old };
							newModalOpen[SubSystems.CAMERA] = false;
							return newModalOpen;
						});
					}}
					cameraStates={cameraStates}
					onClick={(subsystem, mode, activated) => startService(subsystem, mode, true, activated)}
					rgbOnClick={(subsystem, activate) => startCamModeService(subsystem, activate, ros, showSnackbar)}
					hdDepthOnClick={(activate) => startHdDepthCameraService(ros, activate, showSnackbar)}
				/>
			);

		case SubSystems.NAGIVATION:
			return (
				<NavigationGoalModal
					ros={ros}
					setSpeedRoverService={changeSpeedRover}
					snackBar={showSnackbar}
					onResetFaults={resetFaults}
					onResetHome={resetHome}
					onQrCodeScan={onQrCodeScan}
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
					resetHdConfirmation={resetHdConfirmation}
					onSendNamedPose={sendHdNamedPose}
					onUpdateTaskCommand={updateHdTaskCommand}
				/>
			);
		case SubSystems.DRILL:
			return (
				<DrillGoalModal
					ros={ros}
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

		case "avionics":
			return (
				<AvionicsModal
					onClose={() => {
						setModal(<></>);
						setSystemsModalOpen((old: typeModal) => {
							const newModalOpen = { ...old };
							newModalOpen["avionics"] = false;
							return newModalOpen;
						});
					}}
					ros={ros}
					snackBar={showSnackbar}
				/>
			);
		default:
			return <></>;
	}
};

const selectModalRos = (
	roverState: any,
	system: SubSystems,
	setModal: (modal: ReactElement | null) => void,
	setRosModalOpen: (modals: any) => void,
	ros: ROSLIB.Ros | null
) => {
	return (
		<NodeModal
			roverState={roverState}
			name={system}
			onClose={() => {
				setModal(<></>);
				setRosModalOpen((old: typeModal) => {
					const newModalOpen = { ...old };
					newModalOpen[system] = false;
					return newModalOpen;
				});
			}}
		/>
	)
};

export default NewControlPage;
