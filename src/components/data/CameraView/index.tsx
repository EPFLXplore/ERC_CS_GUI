import styles from "./style.module.sass";
import DefaultImage from "../../../assets/images/NoCam.png";

const CameraView = ({
	currentVideo,
	images,
	rotate = [0],
	changeCam,
	setRotateCams,
	currentCam,
}: {
	currentVideo: number;
	images: Array<string>;
	rotate?: number[];
	changeCam: (dir: number) => void;
	setRotateCams: (rotate: number[]) => void;
	currentCam: Array<string>;
}) => {

	if(currentCam.length == 1) {

		return (
			<div className={styles.Container}>
				{(
					<CameraSelector
						currentCam={currentCam[0] ?? "No Camera"}
						changeCam={changeCam}
					/>
				)}
				<img
					src={images[0] && images[0].length > 0 ? images[0] : DefaultImage}
					alt="Camera"
					className={`${styles.Image} ${styles[`Rotate${rotate[0]}`]}`}
					onDoubleClick={() => {
						const newRotation = ((rotate[0]) + 90) % 360;
						setRotateCams([newRotation]);
					}}
					
				/>
			</div>
		);

	} else if (currentCam.length === 2) {
		return (
			<div className={styles.Container}>
				{<CameraSelector currentCam={"Multi Cam"} changeCam={changeCam} />}

				<div className={styles.HalfWrapper}>
					<img
						src={images[0] && images[0].length > 0 ? images[0] : DefaultImage}
						alt="Camera"
						className={styles.HalfImage}
					/>
				</div>
				<div className={styles.HalfWrapper}>
					<img
						src={images[1] && images[1].length > 0 ? images[1] : DefaultImage}
						alt="Camera"
						className={styles.HalfImage}
					/>
				</div>
			</div>
		);
	} else {
		return (
		<div className={styles.Container}>
			{<CameraSelector currentCam={"No Camera"} changeCam={changeCam} />}
			<img src={DefaultImage} alt="Camera" className={styles.Image} />
		</div>
		)
	}
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

/**
 *     -webkit-transform:rotate(90deg)
    -moz-transform: rotate(90deg)
    -ms-transform: rotate(90deg)
    -o-transform: rotate(90deg)
    transform: rotate(90deg)
 */
