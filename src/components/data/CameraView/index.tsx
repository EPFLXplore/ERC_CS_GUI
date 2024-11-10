import styles from "./style.module.sass";
import DefaultImage from "../../../assets/images/NoCam.png";

const CameraView = ({
	currentVideo,
	images,
	rotate = [false],
	changeCam,
	currentCam,
	small = false,
}: {
	currentVideo: number;
	images: Array<string>;
	rotate?: boolean[];
	changeCam: (dir: number) => void;
	currentCam: Array<string>;
	small?: boolean;
}) => {
	const processNameCam = (name: string | null) => {
		if (name) {
			const names = name.split("_");
			return (
				names[0].charAt(0).toUpperCase() +
				names[0].slice(1) +
				" " +
				(parseInt(names[1]) + 1)
			);
		} else {
			return name;
		}
	};

	return (
		<div className={styles.Container}>
			{!small && (
				<CameraSelector
					currentCam={currentCam[0] ?? "No Camera"}
					changeCam={changeCam}
				/>
			)}
			<img
				src={images[currentVideo] && images[currentVideo].length > 0 ? images[currentVideo] : DefaultImage}
				alt="Camera"
				className={rotate[0] ? styles.RotatedImage : styles.Image}
			/>
		</div>
	);
};


const CameraSelector = ({
	currentCam,
	changeCam,
}: {
	currentCam: string;
	changeCam?: (dir: number) => void;
}) => {
	return (
		<div className={styles.CameraSelector}>
			<button
				className={styles.CameraSelectorButton}
				onClick={() => {
					if (changeCam) changeCam(-1);
				}}
			>
				{"◄"}
			</button>
			<p>{currentCam}</p>
			<button
				className={styles.CameraSelectorButton}
				onClick={() => {
					if (changeCam) changeCam(1);
				}}
			>
				{"►"}
			</button>
		</div>
	);
};

export default CameraView;
