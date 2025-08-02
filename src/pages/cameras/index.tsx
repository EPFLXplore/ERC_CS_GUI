import styles from "./styles.module.sass";
import CameraView from "../../components/data/CameraView";
import useCamera from "../../hooks/cameraHooks";
import useAlert from "../../hooks/alertHooks";
import useRosBridge from "../../hooks/rosbridgeHooks";

const CAMERA_CONFIGS = [
	["Front Cam"],
	["Gripper Cam"],
	["ST", "ST", "DR", "BH"],
	["Front", "ST", "ST"],
	['LEFT', 'RIGHT'], // Tests for Nav
	['Other1', 'Other2'], // Astrio-Bio and Deep Sampling
	['SL', 'SR'] // Maintenance
];

const MAX_IMAGES = CAMERA_CONFIGS.length;

const CamerasPage = () => {
	
	const [snackbar, showSnackbar] = useAlert();
  	const [ros, active] = useRosBridge(showSnackbar);

	const [rotateCams, setRotateCams, images, currentVideo, setCurrentVideo] = useCamera(ros);

	return (
		<div className={"page " + styles.mainPage}>
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
