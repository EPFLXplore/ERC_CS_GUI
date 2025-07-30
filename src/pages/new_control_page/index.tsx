import styles from "./style.module.sass";
import Header from "../../components/ui/Header";
import QuickAction from "../../components/Controls/QuickAction";
import { useNavigate } from "react-router-dom";

import NavIcon from "../../assets/images/icons/nav_logo.png";
import CameraIcon from "../../assets/images/icons/camera.png"
import HDIcon from "../../assets/images/icons/handling_device_logo.png";
import Stop from "../../assets/images/icons/stop.png";
import CommandsIcon from "../../assets/images/icons/setting.png";
import Drill from "../../assets/images/icons/drill.png";
import SystemMode from "../../components/Controls/SystemMode";
import Science from "../../assets/images/icons/microscope.png";
import Canceled from "../../assets/images/icons/cancelled.png";
import ResetMotors from "../../assets/images/icons/pitstop.png";
import Sensor from "../../assets/images/icons/sensor.png";

import logo from "../../assets/images/logos/logo_XPlore.png";
import useRosBridge from "../../hooks/rosbridgeHooks";
import NavigationGoalModal from "../../components/modals/NavigationGoalModal";
import ArmGoalModal from "../../components/modals/ArmGoalModal";
import DrillGoalModal from "../../components/modals/DrillGoalModal";
import ControlModal from "../../components/modals/ControlModal";
import NodeModal from "../../components/modals/NodeModal";
import ImageRockDisplay from "../../components/data/RockImageSelection";

import SubSystems from "../../data/subsystems.type";
import States from "../../data/states.type";
import { InfoBox, ControllerInfoBox, InfoBoxButton } from "../../components/data/InfoBox";
import { Dvr } from "@mui/icons-material";
import {
	getCurrentOrientation,
	getCurrentPosition,
	getNetworkData,
	getJointsPositions,
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
	getJetsonStatsHD,
	getJetsonStatsNAV,
	getNodes,
	getLinearVelocity,
	getAngularVelocity,
	getStateFSM,
	getCurrentHDTask,
	getCurrentHDCommand,
	getTotalJointsCurrent,
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
import { ReactElement, useEffect } from "react";
import ROSLIB from "roslib";
import CameraModal from "../../components/modals/CameraModal";
import { startCamModeService } from "../../utils/changeCameraMode";
import Gamepad from "../../components/Controls/Gamepad";
import {resetFaults, resetHome} from "../../utils/navigationActions";
import ScienceModal from "../../components/modals/ScienceModal";
import { Sensors, SensorsType } from "../../data/sensors.types";
import { CameraType } from "../../data/cameras.type";
import { useRoverContext } from "../../roverControlsContext";
import axios from "axios";

const NewControlPage = () => {
	const navigate = useNavigate();

	const [snackbar, showSnackbar] = useAlert();
	const [ros, active] = useRosBridge(showSnackbar);
	const roverControls = useRoverControls(ros, showSnackbar);

	//const { ros, active, hdConfirmation, snackbar, showSnackbar, roverControls } = useRoverContext();

  	// Destructure like before:
  	const [
		roverState,
		qrCode,
		setQrCode,
		hdStackLaunched,
		hdConfirmation,
		hdConfirmationRocks,
		imageRock,
		setImageRock,
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
		setVolumetric,
		rosModalOpen,
		setRosModalOpen,
		modalRosNodes,
		setModalRosNodes,
		changeSpeedRover,
		resetNodes,
		resetSensors,
		reset_motors,
		emergency_shutdown,
		recordSensors,
		setRecordSensors
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

	const test = () => {
		if(getMassArmSensor(roverState) === "NO DATA" || !recordSensors) return;
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
			getDustSensor(roverState).num_particles_10.toString())
	}

	useEffect(() => {
		console.log("Rover state updated");
		const interval = setInterval(test, 2000);
    	return () => clearInterval(interval);

	}, [roverState])

	/**
	 * Function handling the windows of actions at the bottom of the page
	 * @param system the subsystem or empty string for the button cancel all actions
	 * @param cancel if we use the cancel button or not
	 */
	const displaySystemModal = (system: SubSystems | string) => {
		setSystemsModalOpen((old: typeModal) => {
			let newModalOpen = { ...old };

			if (system == "cancel_all_actions") {
				cancelAllActions();
				return newModalOpen;
			} else if (system == "reset_motors") {
				reset_motors();
				return newModalOpen;
			} else if (system == "emergency_shutdown") {
				emergency_shutdown();
				return newModalOpen;
			} else if (system == "record_sensors") {
				setRecordSensors(!recordSensors);
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
						resetNodes,
						resetSensors,
						ros
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

	return (
		<div className={"page " + styles.mainPage}>
			<div className={styles.header}>
				<img src={logo} className={styles.logo} alt="Logo Xplore" />
				<div className={styles.systems}>
					<SystemMode
						system={"Navigation"}
						currentMode={stateServices[SubSystems.NAGIVATION].service.state}
						modes={[States.AUTO, States.ACKERMANN, States.OMNI_DIRECTIONAL, States.OFF]}
						onSelect={(mode) => startService(SubSystems.NAGIVATION, mode, false)}
					/>
					<SystemMode
						system={"Handling Device"}
						currentMode={stateServices[SubSystems.HANDLING_DEVICE].service.state}
						modes={[States.AUTO, States.MANUAL_DIRECT, States.MANUAL_INVERSE, States.OFF]}
						onSelect={(mode) => startService(SubSystems.HANDLING_DEVICE, mode, false)}
					/>
					<SystemMode
						system={"Drill"}
						currentMode={stateServices[SubSystems.DRILL].service.state}
						modes={[States.ON, States.OFF]}
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
				<Header
					//@ts-ignore
					wifiLevel={getNetworkData(roverState)}
				/>
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

					{hdConfirmationRocks !== null && (
						<div>
						{imageRock && <ImageRockDisplay imageData={imageRock} 
						 setCoordinates={(x: number, y: number) => hdConfirmationRocks(x, y)}
						 onClose={() => setImageRock(null)} />}
					  </div>
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
					<div className={styles.infosLeft}>
						<ControllerInfoBox
							title="Driving Currents"
							infos={[
								{ info: { name: "Front Left", value: getCurrentDriving(roverState)[0] }, connected: getDrivingState(roverState)[0] },
								{ info: { name: "Front Right", value: getCurrentDriving(roverState)[1] }, connected: getDrivingState(roverState)[1] },
								{ info: { name: "Back Right", value: getCurrentDriving(roverState)[2] }, connected: getDrivingState(roverState)[2] },
								{ info: { name: "Back Left", value: getCurrentDriving(roverState)[3] }, connected: getDrivingState(roverState)[3] },
							]}
							unit="mA"
						/>

						<ControllerInfoBox
							title="Steering Currents"
							infos={[
								{ info: { name: "Front Left", value: getCurrentSteering(roverState)[0] }, connected: getDrivingState(roverState)[0] },
								{ info: { name: "Front Right", value: getCurrentSteering(roverState)[1] }, connected: getDrivingState(roverState)[1] },
								{ info: { name: "Back Right", value: getCurrentSteering(roverState)[2] }, connected: getDrivingState(roverState)[2] },
								{ info: { name: "Back Left", value: getCurrentSteering(roverState)[3] }, connected: getDrivingState(roverState)[3] },
							]}
							unit="mA"
						/>

						<ControllerInfoBox
							title="Joints Currents"
							infos={[
								{ info: { name: "Joint 1", value: getJointsCurrent(roverState)[0] }, connected: getJointsStates(roverState)[0] },
								{ info: { name: "Joint 2", value: getJointsCurrent(roverState)[1] }, connected: getJointsStates(roverState)[1] },
								{ info: { name: "Joint 3", value: getJointsCurrent(roverState)[2] }, connected: getJointsStates(roverState)[2] },
								{ info: { name: "Joint 4", value: getJointsCurrent(roverState)[3] }, connected: getJointsStates(roverState)[3] },
								{ info: { name: "Joint 5", value: getJointsCurrent(roverState)[4] }, connected: getJointsStates(roverState)[4] },
								{ info: { name: "Joint 6", value: getJointsCurrent(roverState)[5] }, connected: getJointsStates(roverState)[5] },
								{ info: { name: "Total", value: getTotalJointsCurrent(roverState) }, connected: null },
							]}
							unit="A"
						/>
						<ControllerInfoBox
							title="Drill Currents"
							infos={[
								{ info: { name: "Motor", value: getMotorModule(roverState)['current'] }, connected: getMotorModule(roverState)['state'] },
								{ info: { name: "Drill", value: getMotorDrill(roverState)['current'] }, connected: getMotorDrill(roverState)['state'] },
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
								{ name: "Back Left", value: getWheelsDrivingValue(roverState)[3]},
							]}
							unit="m/s"
						/>
						<InfoBox
							title="Steering Angles"
							infos={[
								{ name: "Front Left", value: getSteeringAngles(roverState)[0]},
								{ name: "Front Right", value: getSteeringAngles(roverState)[1]},
								{ name: "Back Right", value: getSteeringAngles(roverState)[2]},
								{ name: "Back Left", value: getSteeringAngles(roverState)[3]},
							]}
							unit="°"
						/>
						<InfoBox
							title="Joints HD"
							infos={[
								{ name: "Joint 1", value: getJointsPositions(roverState)[0], unit:"°" },
								{ name: "Joint 2", value: getJointsPositions(roverState)[1], unit:"°" },
								{ name: "Joint 3", value: getJointsPositions(roverState)[2], unit:"°" },
								{ name: "Joint 4", value: getJointsPositions(roverState)[3], unit:"°" },
								{ name: "Joint 5", value: getJointsPositions(roverState)[4], unit:"°" },
								{ name: "Joint 6", value: getJointsPositions(roverState)[5], unit:"°" },
								{ name: "Gripper", value: getTorqueGripper(roverState), unit: "Nm"},
							]}
						/>
					</div>
					<div className={styles.infosMidLeft2}>
						<InfoBox
							title="Power Consumption"
							infos={[
								{ name: "Current", value: getCurrentOutput(roverState), unit: "A"},
								{ name: "Battery Level", value: getBatteryVoltage(roverState), unit: "V"},
								{ name: "Battery State", value: getBatteryState(roverState)},
							]}
						/>
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
					</div>

					<div className={styles.infosMidRight2}>
						<InfoBox
							title="Jetson HD"
							infos={[
								{ name: "RAM", value: getJetsonStatsHD(roverState).ram, unit: "GB"},
								{ name: "GPU", value: getJetsonStatsHD(roverState).load_gpu, unit: "%"},
								{ name: "Power", value: getJetsonStatsHD(roverState).power_tot, unit: "W"},
								{ name: "Fan", value: getJetsonStatsHD(roverState).fan_rpm, unit: 'rpm'},
								{ name: "CPU Temp", value: getJetsonStatsHD(roverState).temp_cpu, unit: '°C'},
								{ name: "GPU Temp", value: getJetsonStatsHD(roverState).temp_gpu, unit: '°C'},
							]}
							usages={ getJetsonStatsHD(roverState).cpu_usage }
						/>

						<InfoBox
							title="Jetson NAV"
							infos={[
								{ name: "RAM", value: getJetsonStatsNAV(roverState).ram, unit: "GB"},
								{ name: "GPU", value: getJetsonStatsNAV(roverState).load_gpu, unit: "%"},
								{ name: "Power", value: getJetsonStatsNAV(roverState).power_tot, unit: "W"},
								{ name: "Fan", value: getJetsonStatsNAV(roverState).fan_rpm, unit: 'rpm'},
								{ name: "CPU Temp", value: getJetsonStatsNAV(roverState).temp_cpu, unit: '°C'},
								{ name: "GPU Temp", value: getJetsonStatsNAV(roverState).temp_gpu, unit: '°C'}
							]}
							usages={ getJetsonStatsNAV(roverState).cpu_usage }
						/>
					</div>
					

					<div className={styles.infosMidRight}>
						{typeof getNodes(roverState) !== "string" ?

							<InfoBoxButton
								title="ROS Nodes"
								infos={[
									{
										name: "Navigation",
										onClick: () => displayRosModal(SubSystems.NAGIVATION),
										icon: CommandsIcon
									},
									{
										name: "Rover",
										onClick: () => displayRosModal(SubSystems.ROVER),
										icon: CommandsIcon
									},
									{
										name: "HD",
										onClick: () => displayRosModal(SubSystems.HANDLING_DEVICE),
										icon: CommandsIcon
									},
									{
										name: "Science",
										onClick: () => displayRosModal(SubSystems.DRILL),
										icon: CommandsIcon
									},
									{
										name: "Avionics",
										onClick: () => displayRosModal(SubSystems.EL),
										icon: CommandsIcon
									}
								]}
							/> :
							<InfoBox
								title="ROS Nodes"
								infos={[
									{ name: "No Nodes", value: "" },
								]}
							/>
						}
						<InfoBox
								title="HD Data"
								infos={[
									{ name: "Task", value: getCurrentHDTask(roverState) },
									{ name: "Command", value: getCurrentHDCommand(roverState) },
								]}
							/>
						<InfoBox
							title="Drill Data"
							infos={[
								{
									name: "Height",
									value: getMotorModule(roverState).position,
									unit: "%"
								},
								{
									name: "Velocity",
									value: getMotorDrill(roverState).speed,
									unit: "rpm"
								},
								{
									name: "FSM State",
									value: getStateFSM(roverState),
								}
							]}
						/>

					</div>
					<div className={styles.infosRight}>
						<InfoBox
							title="Current Position"
							infos={[
								{ name: "X", value: getCurrentPosition(roverState).x },
								{ name: "Y", value: getCurrentPosition(roverState).y }
							]}
						/>
						<InfoBox
							title="Sensors"
							infos={[
								{ name: "pH", value: getForInOneSensor(roverState).ph },
								{ name: "Temperature", value: getForInOneSensor(roverState).temperature, unit: '°C' },
								{ name: "Humidity", value: getForInOneSensor(roverState).humidity, unit: '%' },
								{ name: "Conductivity", value: getForInOneSensor(roverState).conductivity, unit: 'us/cm' },
								{ name: "Mass Drill", value: getMassDrillSensor(roverState), unit: "g" },
								{ name: "Mass HD", value: getMassArmSensor(roverState), unit: 'g' }
							]}
						/>
					</div>

					<div className={styles.actions}>
						<QuickAction
							onClick={() => displaySystemModal(SubSystems.CAMERA)}
							selected={systemsModalOpen[SubSystems.CAMERA]}
							running={"Off"}
							icon={CameraIcon}
							tooltip={"Camera"}
						/>
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
						/>
						<QuickAction
							onClick={() => displaySystemModal(SubSystems.SCIENCE)}
							selected={systemsModalOpen[SubSystems.SCIENCE]}
							running={States.OFF}
							icon={Science}
							tooltip={"Science"}
						/>
						<QuickAction
							onClick={() => displaySystemModal("commands")}
							selected={false}
							running={States.OFF}
							icon={CommandsIcon}
							tooltip={"Dockers"}
						/>
						<QuickAction
							onClick={() => displaySystemModal("cancel_all_actions")}
							selected={false}
							running={States.OFF}
							icon={Canceled}
							tooltip={"Cancel All Actions"}
						/>
						<QuickAction
							onClick={() => displaySystemModal("record_sensors")}
							selected={false}
							running={recordSensors ? States.ON : States.OFF}
							icon={Sensor}
							tooltip={"Record Sensors"}
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
					{modal}
					{modalRosNodes}
					<AlertSnackbar alertMessage={snackbar} />
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
								: States.ACKERMANN
						}
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
	resetNodes: () => void,
	resetSensors: (name: Sensors) => void,
	ros: ROSLIB.Ros | null
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
				/>
			)

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
					cameraStates={cameraStates}
					onClick={(subsystem, mode, activated) => startService(subsystem, mode, true, activated)}
					rgbOnClick={(subsystem, activate) => startCamModeService(subsystem, activate, ros, showSnackbar)}
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
					resetNodes={resetNodes}
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
