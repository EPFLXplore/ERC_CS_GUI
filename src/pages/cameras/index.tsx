import styles from "./styles.module.sass";
import logo from "../../assets/images/logos/logo_XPlore.png";
import CameraView from "../../components/data/CameraView";
import useRosBridge from "../../hooks/rosbridgeHooks";
import useAlert from "../../hooks/alertHooks";
import useRoverControls, { typeModal } from "../../hooks/roverControlsHooks";

/**
 * This has a particular format. Each Camera_i is a particular camera with index i. This index i
 * is the index in the list of newCameraHooks.ts representing a camera. Index i = 0 is the
 * /ROVER/feed_camera_cs_0, so the first camera of the CS. We have then the following convention:
 * 
 * i = 0: CS cam number 1
 * i = 1: CS cam number 2
 * i = 2: CS cam number 3
 * i = 3: NAV cam number 1
 * i = 4: HD cam number 1
 */
const CAMERA_CONFIGS = [
	["Camera_0"],
	["Camera_1"],
	["Camera_2"],
	["Camera_3"],
	["Camera_4"],
	["Camera_5"],
	["Camera_6"],
	["Camera_0", "Camera_1"],
];

const MAX_CAMERAS = 6;

const CamerasPage = () => {
	const [, showSnackbar] = useAlert();
	const [ros,] = useRosBridge(showSnackbar);
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
			</div>
			<div className={styles.control}>
				<div className={styles.visualization}>
					{display === "camera" ? (
						<CameraView
							currentVideo={currentVideo}
							images={images}
							currentCam={CAMERA_CONFIGS[currentVideo]}
							changeCam={(dir) => {
								setCurrentVideo((old) => {
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
