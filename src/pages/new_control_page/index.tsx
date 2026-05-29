import styles from "./style.module.sass";
import Header from "../../components/ui/Header";
import Background from "../../components/ui/Background";
import QuickAction from "../../components/Controls/QuickAction";
import { useNavigate } from "react-router-dom";

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
import Science from "../../assets/images/icons/science.svg";
import Canceled from "../../assets/images/icons/cancelled.svg";
import ResetMotors from "../../assets/images/icons/motors.svg";
import Sensor from "../../assets/images/icons/sensor.svg";
import Screenshot from "../../assets/images/icons/screenshot.svg";
import PreviousIcon from "../../assets/images/icons/previous.svg";
import PauseIcon from "../../assets/images/icons/pause.svg";
import NextIcon from "../../assets/images/icons/next.svg";

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
import GifOverlay from "../../components/data/GifView/GifOverlay";

import SubSystems from "../../data/subsystems.type";
import States from "../../data/states.type";
import { InfoBox, ControllerInfoBox, InfoBoxButton } from "../../components/data/InfoBox";
import { Dvr } from "@mui/icons-material";
import {
	getCurrentPosition,
	getNetworkData,
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
	getNodes,
	getStateFSM,
	getCurrentHDTask,
	getCurrentHDCommand,
	getBatteryState,
	getTorqueGripper,
	getBatteryVoltage,
	getDustSensor,
	getMassDrillSensor,
	getMassArmSensor,
	getForInOneSensor,
	getCameraStates
	
} from "../../utils/roverStateParser";
import AlertSnackbar from "../../components/ui/Snackbar";
import useAlert from "../../hooks/alertHooks";
import useRoverControls, { typeModal } from "../../hooks/roverControlsHooks";
import { AlertColor } from "@mui/material";
import { ReactElement, useCallback, useEffect, useState } from "react";
import * as ROSLIB from "roslib";
import CameraModal from "../../components/modals/CameraModal";
import { startCamModeService, startHdDepthCameraService } from "../../utils/changeCameraMode";
import Gamepad from "../../components/Controls/Gamepad";
import RosDdsDevBanner from "../../components/ui/RosDdsDevBanner";
import {resetFaults, resetHome} from "../../utils/navigationActions";
import ScienceModal from "../../components/modals/ScienceModal";
import SuspensionModal from "../../components/modals/SuspensionModal";
import MicroscopeModal from "../../components/modals/MicroscopeModal";
import WheelConfiguration from "../../components/data/WheelConfiguration";
import { Sensors, SensorsType } from "../../data/sensors.types";
import { CameraType } from "../../data/cameras.type";
import axios from "axios";

const WIDGET_KEYS = [
	"drivingCurrents",
	"steeringCurrents",
	"jointsHdVelocity",
	"drillCurrents",
	"wheelsSpeed",
	"steeringAngles",
	"jointsHd",
	"wheelConfiguration",
	"dustSensors",
	"jetsonHd",
	"jetsonNav",
	"rosNodes",
	"hdData",
	"drillData",
	"currentPosition",
	"scienceSensors",
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
	drillCurrents: "Drill Currents",
	wheelsSpeed: "Wheels Speed",
	steeringAngles: "Steering Angles",
	jointsHd: "Joints HD",
	wheelConfiguration: "Wheel Configuration",
	dustSensors: "Dust Sensors",
	jetsonHd: "Jetson HD",
	jetsonNav: "Jetson NAV",
	rosNodes: "ROS Nodes",
	hdData: "HD Data",
	drillData: "Drill Data",
	currentPosition: "Current Position",
	scienceSensors: "Science Sensors",
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
		"rosNodes",
		"currentPosition",
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
		"rosNodes",
		"hdData",
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
		"rosNodes",
		"hdData",
	]),
	Sampling: buildVisibility([
		"drivingCurrents",
		"steeringCurrents",
		"jointsHdVelocity",
		"jointsHd",
		"drillCurrents",
		"drillData",
		"wheelsSpeed",
		"steeringAngles",
		"wheelConfiguration",
		"jetsonHd",
		"jetsonNav",
		"rosNodes",
		"hdData",
		"currentPosition",
	]),
	"Astro-Bio Exploration": buildVisibility([
		"drivingCurrents",
		"steeringCurrents",
		"jointsHdVelocity",
		"jointsHd",
		"drillCurrents",
		"drillData",
		"wheelsSpeed",
		"steeringAngles",
		"wheelConfiguration",
		"dustSensors",
		"jetsonHd",
		"jetsonNav",
		"rosNodes",
		"hdData",
		"scienceSensors",
	]),
	All: buildVisibility(WIDGET_KEYS as unknown as WidgetKey[]),
};

const NewControlPage = () => {
	const navigate = useNavigate();

	const [snackbar, showSnackbar] = useAlert();
	const [ros] = useRosBridge(showSnackbar);
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
		resetSensors,
		reset_leds,
		reset_motors,
		emergency_shutdown,
		recordSensors,
		setRecordSensors,
		displayGif,
		setDisplayGif,
		sendHdNamedPose,
		screenshotAllCameras,
		setSuspensionHeight,
		updateHdTaskCommand
  	] = roverControls;

	const recordSensorData = async (type_sensor: SensorsType, ...values: string[]) => {
    
		await axios.post('http://localhost:5000/sensor-record', {
			type_sensor: type_sensor, 
			timestamp: new Date().toISOString(),
			values: values
		})
		.then(async data => {
			
			console.log("Sensor data recorded successfully:", data);
			
		})
		.catch(error => {
			console.error("Error recording sensor data:", error);
		})
		
	}

	const recordMassAndEnvSensors = useCallback(() => {
		if (getMassArmSensor(roverState) === "NO DATA" || !recordSensors) return;
		recordSensorData(SensorsType.MASS_HD,
			getMassArmSensor(roverState).toString(),
			getMassDrillSensor(roverState).toString(),
			getForInOneSensor(roverState).temperature.toString(),
			getForInOneSensor(roverState).humidity.toString(),
			getForInOneSensor(roverState).conductivity.toString(),
			getForInOneSensor(roverState).ph.toString(),
			getDustSensor(roverState).pm1_0_std.toString(),
			getDustSensor(roverState).pm2_5_std.toString(),
			getDustSensor(roverState).pm10_std.toString(),
			getDustSensor(roverState).pm1_0_atm.toString(),
			getDustSensor(roverState).pm2_5_atm.toString(),
			getDustSensor(roverState).pm10_atm.toString(),
			getDustSensor(roverState).num_particles_0_3.toString(),
			getDustSensor(roverState).num_particles_0_5.toString(),
			getDustSensor(roverState).num_particles_1_0.toString(),
			getDustSensor(roverState).num_particles_2_5.toString(),
			getDustSensor(roverState).num_particles_5_0.toString(),
			getDustSensor(roverState).num_particles_10.toString());
	}, [roverState, recordSensors]);

	useEffect(() => {
		console.log("Rover state updated");
		const interval = setInterval(recordMassAndEnvSensors, 500);
		return () => clearInterval(interval);
	}, [recordMassAndEnvSensors]);

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
			} else if (system === "record_sensors") {
				setRecordSensors(!recordSensors);
				return newModalOpen;
			} else if (system === "screenshot") {
				screenshotAllCameras();
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
						resetSensors,
						reset_leds,
						sendHdNamedPose,
						ros,
						setSuspensionHeight,
						updateHdTaskCommand
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

	const widgetCards: { key: WidgetKey; content: ReactElement }[] = [
		{
			key: "drivingCurrents",
			content: (
				<ControllerInfoBox
					title="Driving Currents"
					infos={[
						{ info: { name: "FRONT_LEFT_DRIVE", value: getCurrentDriving(roverState)[0] }, connected: getDrivingState(roverState)[0] },
						{ info: { name: "FRONT_RIGHT_DRIVE", value: getCurrentDriving(roverState)[1] }, connected: getDrivingState(roverState)[1] },
						{ info: { name: "BACK_RIGHT_DRIVE", value: getCurrentDriving(roverState)[2] }, connected: getDrivingState(roverState)[2] },
						{ info: { name: "BACK_LEFT_DRIVE", value: getCurrentDriving(roverState)[3] }, connected: getDrivingState(roverState)[3] },
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
						{ info: { name: "FRONT_LEFT_STEER", value: getCurrentSteering(roverState)[0] }, connected: getSteeringState(roverState)[0] },
						{ info: { name: "FRONT_RIGHT_STEER", value: getCurrentSteering(roverState)[1] }, connected: getSteeringState(roverState)[1] },
						{ info: { name: "BACK_RIGHT_STEER", value: getCurrentSteering(roverState)[2] }, connected: getSteeringState(roverState)[2] },
						{ info: { name: "BACK_LEFT_STEER", value: getCurrentSteering(roverState)[3] }, connected: getSteeringState(roverState)[3] },
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
				/>
			),
		},
		{
			key: "drillCurrents",
			content: (
				<ControllerInfoBox
					title="Drill Currents"
					infos={[
						{ info: { name: "Motor", value: getMotorModule(roverState)["current"] }, connected: getMotorModule(roverState)["state"] },
						{ info: { name: "Drill", value: getMotorDrill(roverState)["current"] }, connected: getMotorDrill(roverState)["state"] },
					]}
					unit="mA"
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
			key: "dustSensors",
			content: (
				<InfoBox
					title="Sensors"
					infos={[
						{ name: "pm1_0_std", value: getDustSensor(roverState).pm1_0_std, unit: "ug/m3" },
						{ name: "pm2_5_std", value: getDustSensor(roverState).pm2_5_std, unit: "ug/m3" },
						{ name: "pm10_std", value: getDustSensor(roverState).pm10_std, unit: "ug/m3" },
						{ name: "pm1_0_atm", value: getDustSensor(roverState).pm1_0_atm, unit: "ug/m3" },
						{ name: "pm2_5_atm", value: getDustSensor(roverState).pm2_5_atm, unit: "ug/m3" },
						{ name: "pm10_atm", value: getDustSensor(roverState).pm10_atm, unit: "ug/m3" },
						{ name: "num_particles_0_3", value: getDustSensor(roverState).num_particles_0_3, unit: "p/L" },
						{ name: "num_particles_0_5", value: getDustSensor(roverState).num_particles_0_5, unit: "p/L" },
						{ name: "num_particles_1_0", value: getDustSensor(roverState).num_particles_1_0, unit: "p/L" },
						{ name: "num_particles_2_5", value: getDustSensor(roverState).num_particles_2_5, unit: "p/L" },
						{ name: "num_particles_5_0", value: getDustSensor(roverState).num_particles_5_0, unit: "p/L" },
						{ name: "num_particles_10", value: getDustSensor(roverState).num_particles_10, unit: "p/L" },
					]}
				/>
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
			key: "rosNodes",
			content:
				typeof getNodes(roverState) !== "string" ? (
					<InfoBoxButton
						title="ROS Nodes"
						infos={(() => {
							const getNodeSummary = (subsystemKey: string) => {
								const stateData = roverState as any;
								const subsystem = stateData?.[subsystemKey];
								const nodes = subsystem?.software?.nodes;
								const cameras = subsystem?.cameras;

								if ((!nodes || typeof nodes !== "object") && (!cameras || typeof cameras !== "object")) {
									return { hasData: false, running: 0, total: 0 };
								}

								const nodeEntries = nodes && typeof nodes === "object" ? Object.values(nodes as Record<string, any>) : [];
								const cameraEntries = cameras && typeof cameras === "object" ? Object.values(cameras as Record<string, any>) : [];
								const entries = [...nodeEntries, ...cameraEntries];
								if (entries.length === 0) {
									return { hasData: false, running: 0, total: 0 };
								}

								const running = entries.reduce((count, node) => (node?.status ? count + 1 : count), 0);
								return { hasData: true, running, total: entries.length };
							};

							const formatSubsystem = (
								label: string,
								subsystemKey: string,
								onClick: () => void
							) => {
								const summary = getNodeSummary(subsystemKey);

								if (!summary.hasData) {
									return {
										name: label,
										summary: "NO DATA",
										onClick,
										color: "#ff9fa6",
									};
								}

								const allRunning = summary.running === summary.total;
								const noneRunning = summary.running === 0;

								const color = allRunning
									? "#9be8a6"
									: noneRunning
										? "#ff9fa6"
										: "#ffc89e";

								return {
									name: label,
									summary: `${summary.running}/${summary.total}`,
									onClick,
									color,
								};
							};

							return [
								formatSubsystem("Navigation", "navigation", () => displayRosModal(SubSystems.NAGIVATION)),
								formatSubsystem("Rover", "rover", () => displayRosModal(SubSystems.ROVER)),
								formatSubsystem("HD", "handling_device", () => displayRosModal(SubSystems.HANDLING_DEVICE)),
								formatSubsystem("Science", "drill", () => displayRosModal(SubSystems.DRILL)),
								formatSubsystem("Avionics", "electronics", () => displayRosModal(SubSystems.EL)),
							];
						})()}
					/>
				) : (
					<InfoBox
						title="ROS Nodes"
						infos={[{ name: "No Nodes", value: "" }]}
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
							onClick={() => updateHdTaskCommand(2)}
							title="Previous Command"
						>
							<img src={PreviousIcon} alt="Previous" />
							<span>Previous</span>
						</button>
						<button
							type="button"
							className={styles.hdDataControlButton}
							onClick={() => updateHdTaskCommand(0)}
							title="Pause Task"
						>
							<img src={PauseIcon} alt="Pause" />
							<span>Pause</span>
						</button>
						<button
							type="button"
							className={styles.hdDataControlButton}
							onClick={() => updateHdTaskCommand(1)}
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
			key: "drillData",
			content: (
				<InfoBox
					title="Drill Data"
					infos={[
						{ name: "Height", value: getMotorModule(roverState).position, unit: "%" },
						{ name: "Velocity", value: getMotorDrill(roverState).speed, unit: "rpm" },
						{ name: "FSM State", value: getStateFSM(roverState) },
					]}
				/>
			),
		},
		{
			key: "currentPosition",
			content: (
				<InfoBox
					title="Current Position"
					infos={[
						{ name: "X", value: getCurrentPosition(roverState).x },
						{ name: "Y", value: getCurrentPosition(roverState).y },
					]}
				/>
			),
		},
		{
			key: "scienceSensors",
			content: (
				<InfoBox
					title="Sensors"
					infos={[
						{ name: "pH", value: getForInOneSensor(roverState).ph },
						{ name: "Temperature", value: getForInOneSensor(roverState).temperature, unit: "°C" },
						{ name: "Humidity", value: getForInOneSensor(roverState).humidity, unit: "%" },
						{ name: "Conductivity", value: getForInOneSensor(roverState).conductivity, unit: "us/cm" },
						{ name: "Mass Drill", value: getMassDrillSensor(roverState), unit: "g" },
						{ name: "Mass HD", value: getMassArmSensor(roverState), unit: "g" },
					]}
				/>
			),
		},
	];

	return (
		<div className={"page " + styles.mainPage}>
			<Background />
			<div className={styles.header}>
				<div className={styles.leftHeader}>
					<img src={logo} className={styles.logo} alt="Logo Xplore" />
					<div className={styles.powerHeader}>
						<span className={styles.powerItem}>I: {getCurrentOutput(roverState)} A</span>
						<span className={styles.powerItem}>V: {getBatteryVoltage(roverState)} V</span>
						<span className={styles.powerItem}>State: {getBatteryState(roverState)}</span>
					</div>
				</div>
				<div className={styles.systems}>
					<RosDdsDevBanner />
					<SystemMode
						system={"NAV"}
						currentMode={stateServices[SubSystems.NAGIVATION].service.state}
						modes={[States.AUTO, States.ACKERMANN, States.OMNI_DIRECTIONAL, States.OFF]}
						onSelect={(mode) => startService(SubSystems.NAGIVATION, mode, false)}
					/>
					<SystemMode
						system={"HD"}
						currentMode={stateServices[SubSystems.HANDLING_DEVICE].service.state}
						modes={[States.AUTO, States.MANUAL_DIRECT, States.MANUAL_INVERSE, States.OFF]}
						onSelect={(mode) => startService(SubSystems.HANDLING_DEVICE, mode, false)}
					/>
					<SystemMode
						system={"DRL"}
						currentMode={stateServices[SubSystems.DRILL].service.state}
						modes={[States.ON, States.OFF]}
						onSelect={(mode) => startService(SubSystems.DRILL, mode, false)}
					/>
				</div>
				<div className={styles.rightHeader}>
					<Dvr
						sx={{
							color: "white",
							fontSize: 30,
							marginX: 3,
							cursor: "pointer",
						}}
						onClick={() => navigate("/logs")}
					/>
					<Header
						//@ts-ignore
						wifiLevel={getNetworkData(roverState)}
					/>
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
						</div>
					)}

					<>
						{/*TODO REMOVE ME AFTER ERC 2025, IT WAS FOR A JOKE IN THE COMPETITION*/}
						{displayGif !== null && (
							<GifOverlay
								src={`gif/${qrCode}.gif`}
								durationMs={5000}
								onClose={() => setDisplayGif(null)}
							/>
						)}

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
						{widgetCards.map((widget) => (
							<div
								className={`${styles.widgetItem} ${visibleWidgets[widget.key] ? styles.widgetItemVisible : styles.widgetItemHidden}`}
								key={widget.key}
							>
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
								<QuickAction
									onClick={() => displaySystemModal("suspension")}
									selected={systemsModalOpen["suspension"]}
									running={States.OFF}
									icon={Suspension}
									tooltip={"Active Suspension"}
								/>
								<QuickAction
									onClick={() => displaySystemModal(SubSystems.SCIENCE)}
									selected={systemsModalOpen[SubSystems.SCIENCE]}
									running={States.OFF}
									icon={Science}
									tooltip={"Science"}
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
									onClick={() => displaySystemModal("record_sensors")}
									selected={false}
									running={recordSensors ? States.ON : States.OFF}
									icon={Sensor}
									tooltip={"Record Sensors"}
								/>
								<QuickAction
									onClick={() => displaySystemModal("screenshot")}
									selected={false}
									running={States.OFF}
									icon={Screenshot}
									tooltip={"Screenshot all Cameras"}
								/>
								<QuickAction
									onClick={() => displaySystemModal("microscope")}
									selected={Boolean(systemsModalOpen["microscope"])}
									running={States.OFF}
									icon={CameraIcon}
									tooltip={"Microscope"}
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
		</div>
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
	resetSensors: (name: Sensors) => void,
	reset_leds: () => void,
	sendHdNamedPose: (poseName: string) => void,
	ros: ROSLIB.Ros | null,
	setSuspensionHeight: (value: number) => void,
	updateHdTaskCommand: (mode: 0 | 1 | 2) => void
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

		case SubSystems.SCIENCE:
			return (
				<ScienceModal
					onClose={() => {
						setModal(<></>);
						setSystemsModalOpen((old: typeModal) => {
							const newModalOpen = { ...old };
							newModalOpen[SubSystems.SCIENCE] = false;
							return newModalOpen;
						});
					}}
					snackBar={showSnackbar}
					resetSensors={resetSensors}
				/>
			);
		case "microscope":
			return (
				<MicroscopeModal
					onClose={() => {
						setModal(<></>);
						setSystemsModalOpen((old: typeModal) => {
							const newModalOpen = { ...old };
							newModalOpen["microscope"] = false;
							return newModalOpen;
						});
					}}
					ros={ros}
					snackBar={showSnackbar}
				/>
			);

		case "suspension":
			return (
				<SuspensionModal
					onClose={() => {
						setModal(<></>);
						setSystemsModalOpen((old: typeModal) => {
							const newModalOpen = { ...old };
							newModalOpen["suspension"] = false;
							return newModalOpen;
						});
					}}
					onSetHeight={setSuspensionHeight}
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
