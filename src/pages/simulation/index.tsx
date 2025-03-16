import styles from "./styles.module.sass";
import Gamepad from "../../components/Controls/Gamepad";
import { useNavigate } from "react-router-dom";

import Simulation from "../../components/data/Simulation";

import logo from "../../assets/images/logos/logo_XPlore.png";
import useRosBridge from "../../hooks/rosbridgeHooks";

import SubSystems from "../../data/subsystems.type";
import States from "../../data/states.type";
import { Dvr, Settings } from "@mui/icons-material";
import {
	getCurrentOrientation,
	getCurrentPosition,
	getJointsPositions,
	getMotorModule,
	getPivotAngle,
	getSteeringAngles,
	getTrajectory,
	getWheelsDrivingValue
} from "../../utils/roverStateParser";
import useAlert from "../../hooks/alertHooks";
import useRoverControls, { typeModal } from "../../hooks/roverControlsHooks";
import SettingsModal from "../../components/modals/SettingsModal";


const SimulationPage = () => {
	const navigate = useNavigate();
	const [snackbar, showSnackbar] = useAlert();
	const [ros, active, hdConfirmation] = useRosBridge(showSnackbar);
	const [
		roverState,
		cameraStates,
		images,
		currentVideo,
		setCurrentVideo,
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
		setVolumetric,
		rosModalOpen,
		setRosModalOpen,
		modalRosNodes,
		setModalRosNodes,
	] = useRoverControls(ros, showSnackbar);


	return (
		<div className={"page " + styles.mainPage}>
			<div className={styles.header}>
				<img src={logo} className={styles.logo} alt="Logo Xplore" />

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
						marginX: 3
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
			</div>
			<div className={styles.control}>
				<div className={styles.visualization}>
					<Simulation
						drill_value={getMotorModule(roverState)['position']}
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
		</div>
	);
};


export default SimulationPage;
