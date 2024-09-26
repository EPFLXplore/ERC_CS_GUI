import styles from "./styles.module.sass";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/images/logos/logo_XPlore.png";
import CameraView from "../../components/data/CameraView";
import useRosBridge from "../../hooks/rosbridgeHooks";
import SubSystems from "../../data/subsystems.type";
import useAlert from "../../hooks/alertHooks";
import useRoverControls, { typeModal } from "../../hooks/roverControlsHooks";

const CAMERA_CONFIGS = [
	["camera_0"],
	["camera_1"],
	["camera_2"],
	["camera_3"],
	["camera_0", "camera_1"],
];
const MAX_CAMERAS = 5;

const CamerasPage = () => {
	const [, showSnackbar] = useAlert();
	const [ros,] = useRosBridge(showSnackbar);
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

	return (
		<div className={"page " + styles.mainPage}>
			<div className={styles.header}>
				<img src={logo} className={styles.logo} alt="Logo Xplore" />
			</div>
			<div className={styles.control}>
				<div className={styles.visualization}>
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
						<></>
					)}
				</div>
			</div>
		</div>
	);
};

export default CamerasPage;
