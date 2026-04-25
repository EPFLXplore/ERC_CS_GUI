import styles from "./style.module.sass";
import { AlertColor } from "@mui/material";
import * as ROSLIB from "roslib";
import DefaultImage from "../../../assets/images/NoCam.png";
import useCamera from "../../../hooks/cameraHooks";

const MICROSCOPE_TOPIC = "/SC/microscope";
const MICROSCOPE_NODE = "/science_microscope";

function MicroscopeModal({
	onClose,
	ros,
	snackBar,
}: {
	onClose: () => void;
	ros: ROSLIB.Ros | null;
	snackBar: (severity: AlertColor, message: string) => void;
}) {
	const [imagesByTopic] = useCamera(ros, [MICROSCOPE_TOPIC]);
	const microscopeImage = imagesByTopic[MICROSCOPE_TOPIC] ?? "";

	const takeScreenshot = () => {
		if (!microscopeImage) {
			snackBar("warning", "No microscope frame available yet.");
			return;
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const link = document.createElement("a");
		link.href = microscopeImage;
		link.download = `microscope_${timestamp}.jpg`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		snackBar("success", "Microscope screenshot saved.");
	};

	return (
		<div className={styles.Background} onClick={onClose}>
			<div
				className={styles.Modal}
				onClick={(e) => {
					e.stopPropagation();
				}}
			>
				<div className={styles.ModalHeader}>
					<h1>Microscope</h1>
					<p>
						Node: <span>{MICROSCOPE_NODE}</span> | Topic: <span>{MICROSCOPE_TOPIC}</span>
					</p>
				</div>

				<div className={styles.ModalContent}>
					<div className={styles.FeedWrapper}>
						<img
							src={microscopeImage && microscopeImage.length > 0 ? microscopeImage : DefaultImage}
							alt="Microscope feed"
							className={styles.FeedImage}
						/>
					</div>
					<div className={styles.Actions}>
						<button type="button" className={styles.ActionButton} onClick={takeScreenshot}>
							Screenshot
						</button>
						<button type="button" className={styles.SecondaryButton} onClick={onClose}>
							Close
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default MicroscopeModal;
