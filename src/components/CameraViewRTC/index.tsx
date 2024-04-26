import styles from "./style.module.sass";
import DefaultImage from "../../assets/images/NoCam.png";
import { useEffect, useRef } from "react";

const CameraViewRTC = ({
	src,
	rotate = false,
	setRotateCams,
}: {
	src: MediaStream | null;
	rotate?: boolean;
	setRotateCams?: (rotate: boolean) => void;
}) => {
	const refVideo = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		if (!refVideo.current) return;
		if (!src) {
			//alert("No video tracks found");
			console.log("No video tracks found");
		} else {
			refVideo.current.srcObject = src;
		}
	}, [src, refVideo]);

	return (
		<div className={styles.Container}>
			<video
				id="video"
				autoPlay={true}
				playsInline={true}
				ref={refVideo}
				className={rotate ? styles.RotatedImage : styles.Image}
				onDoubleClick={() => {
					if (setRotateCams) {
						setRotateCams(!rotate);
					}
				}}
			/>
			<img src={DefaultImage} alt="Camera" className={styles.Placeholder} />
		</div>
	);
};

export default CameraViewRTC;
