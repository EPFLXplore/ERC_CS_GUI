import styles from "./style.module.sass";
import DefaultImage from "../../../assets/images/NoCam.png";

const CameraView = ({
	images,
	rotate = [false],
	changeCam,
	setRotateCams,
	currentCam,
}: {
	images: Array<string>;
	rotate?: boolean[];
	changeCam: (dir: number) => void;
	setRotateCams: (rotate: boolean[]) => void;
	currentCam: Array<string>;
}) => {

	if(currentCam.length == 1) {

		return (
			<div className={styles.Container}>
				<CameraSelector
					currentCam={currentCam[0] ?? "No Camera"}
					changeCam={changeCam}
				/>
				<img
					src={images[0] && images[0].length > 0 ? images[0] : DefaultImage}
					alt="Camera"
					className={`${styles.Image} ${rotate[0] ? styles.Rotate180 : ""}`}
					onDoubleClick={() => {
						const newRotation = !rotate[0];
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

	} else if (currentCam?.length === 3) {
		return (
			<div className={styles.Container}>
				<CameraSelector currentCam={"Multi Cam"} changeCam={changeCam} />

				<div className={styles.LeftHalf}>
					<img
						src={images[0] && images[0].length > 0 ? images[0] : DefaultImage}
						alt="Camera"
						className={`${styles.FullImage} ${rotate[0] ? styles.Rotate180 : ""}`}
						onDoubleClick={() => {
							setRotateCams([!rotate[0], rotate[1], rotate[2]]);
						}}
					/>
				</div>

				<div className={styles.RightHalf}>
					<div className={styles.TopHalf}>
						<img
							src={images[1] && images[1].length > 0 ? images[1] : DefaultImage}
							alt="Camera"
							className={`${styles.HalfImage} ${rotate[1] ? styles.Rotate180 : ""}`}
							onDoubleClick={() => {
								setRotateCams([rotate[0], !rotate[1], rotate[2]]);
							}}
						/>
					</div>
					<div className={styles.BottomHalf}>
						<img
							src={images[2] && images[2].length > 0 ? images[2] : DefaultImage}
							alt="Camera"
							className={`${styles.HalfImage} ${rotate[2] ? styles.Rotate180 : ""}`}
							onDoubleClick={() => {
								setRotateCams([rotate[0], rotate[1], !rotate[2]]);
							}}
						/>
					</div>
				</div>
			</div>
		);
	} else if (currentCam.length === 4) {
		return (
			<div className={styles.Container}>
				{<CameraSelector currentCam={"Multi Cam"} changeCam={changeCam} />}
				<img
					src={images[0] && images[0].length > 0 ? images[0] : DefaultImage}
					alt="Camera"
					className={rotate[0] ? styles.RotatedQuarter : styles.Quarter}
					onDoubleClick={() => {
						if (setRotateCams) {
							setRotateCams([!rotate[0], rotate[1], rotate[2], rotate[3]]);
						}
					}}
				/>
				<img
					src={images[1] && images[1].length > 0 ? images[1] : DefaultImage}
					alt="Camera"
					className={rotate[1] ? styles.RotatedQuarter : styles.Quarter}
					onDoubleClick={() => {
						if (setRotateCams) {
							setRotateCams([rotate[0], !rotate[1], rotate[2], rotate[3]]);
						}
					}}
				/>
				<img
					src={images[2] && images[2].length > 0 ? images[2] : DefaultImage}
					alt="Camera"
					className={rotate[2] ? styles.RotatedQuarter : styles.Quarter}
					onDoubleClick={() => {
						if (setRotateCams) {
							setRotateCams([rotate[0], rotate[1], !rotate[2], rotate[3]]);
						}
					}}
				/>
				<img
					src={images[3] && images[3].length > 0 ? images[3] : DefaultImage}
					alt="Camera"
					className={rotate[3] ? styles.RotatedQuarter : styles.Quarter}
					onDoubleClick={() => {
						if (setRotateCams) {
							setRotateCams([rotate[0], rotate[1], rotate[2], !rotate[3]]);
						}
					}}
				/>
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
