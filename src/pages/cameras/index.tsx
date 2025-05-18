import styles from "./styles.module.sass";
import logo from "../../assets/images/logos/logo_XPlore.png";
import CameraView from "../../components/data/CameraView";
import { useRoverContext } from "../../roverControlsContext";
import useCamera from "../../hooks/cameraHooks";

/**
 * This has a particular format. Each Camera_i is a particular camera with index i. This index i
 * is the index in the list of newCameraHooks.ts representing a camera. Index i = 0 is the
 * /ROVER/feed_camera_cs_0, so the first camera of the CS.
 */
const CAMERA_CONFIGS = [
	["Front Cam"],
	["Aruco Left"],
	["Aruco Right"],
	["Drill Cam"],
	["Behind Cam"],
	["Gripper Cam"],
	["Left", "Right"],
	["Aruco Left", "Aruco Right"],
];

const MAX_IMAGES = 8;

const CamerasPage = () => {
	const { ros, active, hdConfirmation, snackbar, showSnackbar, roverControls } = useRoverContext();
	
	const [
		roverState,
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
		emergency_shutdown
	] = roverControls;

	// Cameras
	const [rotateCams, setRotateCams, images, currentVideo, setCurrentVideo] = useCamera(ros, roverState);

	// useEffect(() => {
	// 	localStorage.setItem("cameraTabOpen", "true");

	// 	return () => {
	// 		localStorage.setItem("cameraTabOpen", "false");
	// 	};
	// }, []);

	return (
		<div className={"page " + styles.mainPage}>
			<div className={styles.header}>
				<img src={logo} className={styles.logo} alt="Logo Xplore" />
			</div>
			<div className={styles.control}>
				<div className={styles.visualization}>
					<CameraView
						images={images}
						rotate={rotateCams}
						setRotateCams={setRotateCams}
						currentCam={CAMERA_CONFIGS[currentVideo]}
						changeCam={(dir) => {
							setCurrentVideo((old: number) => {
								if (dir === 1) {
									return (old + 1) % MAX_IMAGES;
								} else {
									return (old - 1 + MAX_IMAGES) % MAX_IMAGES;
								}
							});
						}}
					/>
				</div>
			</div>
		</div>
	);
};

export default CamerasPage;
