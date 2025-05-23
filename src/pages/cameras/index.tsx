import styles from "./styles.module.sass";
import CameraView from "../../components/data/CameraView";
import { useRoverContext } from "../../roverControlsContext";
import useCamera from "../../hooks/cameraHooks";

const CAMERA_CONFIGS = [
	["Front Cam"],
	["Gripper Cam"],
	["ST", "ST", "DR", "BH"],
	["Front", "ST", "ST"]
];

const MAX_IMAGES = CAMERA_CONFIGS.length;

const CamerasPage = () => {
	const { ros } = useRoverContext();

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
