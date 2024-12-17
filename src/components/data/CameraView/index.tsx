import styles from "./style.module.sass";
import DefaultImage from "../../../assets/images/NoCam.png";

/*
#TODO
*/

const CameraView = ({
	currentVideo,
	images,
	changeCam,
	currentCam,
}: {
	currentVideo: number;
	images: Array<string>;
	changeCam: (dir: number) => void;
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
					className={styles.Image}
				/>
			</div>
		);

	} else if (currentCam.length === 2) {
		return (
			<div className={styles.Container}>
				{<CameraSelector currentCam={"Multi Cam"} changeCam={changeCam} />}
				<img
					src={images[0] && images[0].length > 0 ? images[0] : DefaultImage}
					alt="Camera"
					className={styles.Half}
					// onContextMenu={(e) => {
					// 	e.preventDefault();
					// 	const a = document.createElement("a");
					// 	a.setAttribute("download", "reactflow.png");
					// 	a.setAttribute("href", images[0] ?? DefaultImage);
					// 	a.click();
					// 	console.log("Saved!");
					// }}
				/>
				<img
					src={images[1] && images[1].length > 0 ? images[1] : DefaultImage}
					alt="Camera"
					className={styles.Half}
					// onContextMenu={(e) => {
					// 	e.preventDefault();
					// 	const a = document.createElement("a");
					// 	a.setAttribute("download", "reactflow.png");
					// 	a.setAttribute("href", images[1] ?? DefaultImage);
					// 	a.click();
					// 	console.log("Saved!");
					// }}
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
