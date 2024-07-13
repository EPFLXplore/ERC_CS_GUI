import styles from "./style.module.sass";
import DefaultImage from "../../assets/images/NoCam.png";

const CameraView = ({
	images,
	rotate = [false],
	setRotateCams,
	changeCam,
	currentCam,
	small = false,
}: {
	images: Array<string>;
	rotate?: boolean[];
	setRotateCams?: (rotate: boolean[]) => void;
	changeCam?: (dir: number) => void;
	currentCam?: Array<string>;
	small?: boolean;
}) => {
	console.assert(images.length <= 4, "Only 4 images max are supported");

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

	if (currentCam?.length === 0) {
		return (
			<div className={styles.Container}>
				{!small && <CameraSelector currentCam={"No Camera"} changeCam={changeCam} />}
				<img
					src={DefaultImage}
					alt="Camera"
					className={rotate[0] ? styles.RotatedImage : styles.Image}
					onDoubleClick={() => {
						if (setRotateCams) {
							setRotateCams([!rotate[0]]);
						}
					}}
				/>
			</div>
		);
	} else if (currentCam?.length === 1) {
		return (
			<div className={styles.Container}>
				{!small && (
					<CameraSelector
						currentCam={processNameCam(currentCam?.[0]) ?? "No Camera"}
						changeCam={changeCam}
					/>
				)}
				<img
					src={images[0] && images[0].length > 0 ? images[0] : DefaultImage}
					alt="Camera"
					className={rotate[0] ? styles.RotatedImage : styles.Image}
					// onContextMenu={(e) => {
					// 	e.preventDefault();
					// 	const a = document.createElement("a");

					// 	a.setAttribute("download", "reactflow.png");
					// 	a.setAttribute("href", images[0] ?? DefaultImage);
					// 	a.click();
					// 	console.log("Saved!");
					// }}
					onDoubleClick={() => {
						console.log("Clicked");
						if (setRotateCams) {
							setRotateCams([!rotate[0]]);
						}
					}}
				/>
			</div>
		);
	} else if (currentCam?.length === 2) {
		return (
			<div className={styles.Container}>
				{!small && <CameraSelector currentCam={"Multi Cam"} changeCam={changeCam} />}
				<img
					src={images[0] && images[0].length > 0 ? images[0] : DefaultImage}
					alt="Camera"
					className={rotate[0] ? styles.RotatedHalf : styles.Half}
					onContextMenu={(e) => {
						e.preventDefault();
						const a = document.createElement("a");

						a.setAttribute("download", "reactflow.png");
						a.setAttribute("href", images[0] ?? DefaultImage);
						a.click();
						console.log("Saved!");
					}}
					onDoubleClick={() => {
						if (setRotateCams) {
							setRotateCams([!rotate[0], rotate[1]]);
						}
					}}
				/>
				<img
					src={images[1] && images[1].length > 0 ? images[1] : DefaultImage}
					alt="Camera"
					className={rotate[1] ? styles.RotatedHalf : styles.Half}
					onContextMenu={(e) => {
						e.preventDefault();
						const a = document.createElement("a");

						a.setAttribute("download", "reactflow.png");
						a.setAttribute("href", images[1] ?? DefaultImage);
						a.click();
						console.log("Saved!");
					}}
					onDoubleClick={() => {
						if (setRotateCams) {
							setRotateCams([rotate[0], !rotate[1]]);
						}
					}}
				/>
			</div>
		);
	} else if (currentCam?.length === 3) {
		return (
			<div className={styles.Container}>
				{!small && <CameraSelector currentCam={"Multi Cam"} changeCam={changeCam} />}
				<img
					src={images[0] ?? DefaultImage}
					alt="Camera"
					className={rotate[0] ? styles.RotatedQuarter : styles.Quarter}
					onContextMenu={(e) => {
						e.preventDefault();
						const a = document.createElement("a");

						a.setAttribute("download", "reactflow.png");
						a.setAttribute("href", images[0] ?? DefaultImage);
						a.click();
						console.log("Saved!");
					}}
					onDoubleClick={() => {
						if (setRotateCams) {
							setRotateCams([!rotate[0], rotate[1], rotate[2]]);
						}
					}}
				/>
				<img
					src={images[1] ?? DefaultImage}
					alt="Camera"
					className={rotate[1] ? styles.RotatedQuarter : styles.Quarter}
					onContextMenu={(e) => {
						e.preventDefault();
						const a = document.createElement("a");

						a.setAttribute("download", "reactflow.png");
						a.setAttribute("href", images[1] ?? DefaultImage);
						a.click();
						console.log("Saved!");
					}}
					onDoubleClick={() => {
						if (setRotateCams) {
							setRotateCams([rotate[0], !rotate[1], rotate[2]]);
						}
					}}
				/>
				<img
					src={images[2] ?? DefaultImage}
					alt="Camera"
					className={rotate[2] ? styles.RotatedQuarter : styles.Quarter}
					onContextMenu={(e) => {
						e.preventDefault();
						const a = document.createElement("a");

						a.setAttribute("download", "reactflow.png");
						a.setAttribute("href", images[2] ?? DefaultImage);
						a.click();
						console.log("Saved!");
					}}
					onDoubleClick={() => {
						if (setRotateCams) {
							setRotateCams([rotate[0], rotate[1], !rotate[2]]);
						}
					}}
				/>
			</div>
		);
	} else if (images.length >= 4) {
		return (
			<div className={styles.Container}>
				{!small && <CameraSelector currentCam={"Multi Cam"} changeCam={changeCam} />}
				<img
					src={images[0] ?? DefaultImage}
					alt="Camera"
					className={rotate[0] ? styles.RotatedQuarter : styles.Quarter}
					onDoubleClick={() => {
						if (setRotateCams) {
							setRotateCams([!rotate[0], rotate[1], rotate[2], rotate[3]]);
						}
					}}
				/>
				<img
					src={images[1] ?? DefaultImage}
					alt="Camera"
					className={rotate[1] ? styles.RotatedQuarter : styles.Quarter}
					onDoubleClick={() => {
						if (setRotateCams) {
							setRotateCams([rotate[0], !rotate[1], rotate[2], rotate[3]]);
						}
					}}
				/>
				<img
					src={images[2] ?? DefaultImage}
					alt="Camera"
					className={rotate[2] ? styles.RotatedQuarter : styles.Quarter}
					onDoubleClick={() => {
						if (setRotateCams) {
							setRotateCams([rotate[0], rotate[1], !rotate[2], rotate[3]]);
						}
					}}
				/>
				<img
					src={images[3] ?? DefaultImage}
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
	}

	return (
		<div className={styles.Container}>
			{!small && <CameraSelector currentCam={"No Camera"} changeCam={changeCam} />}
			<img src={DefaultImage} alt="Camera" className={styles.Image} />
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
