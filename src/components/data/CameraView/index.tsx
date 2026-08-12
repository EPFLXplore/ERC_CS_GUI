import { memo, useEffect, useRef, useState } from "react";
import styles from "./style.module.sass";
import DefaultImage from "../../../assets/images/NoCam.png";

/**
 * One <img> for every camera tile, with retry.
 *
 * The GStreamer feeds are `multipart/x-mixed-replace` connections, not files: the backend can drop
 * one (gst crash, restart, network blip) and a plain <img> never re-requests a src it already has,
 * so the tile would sit on the browser's broken-image glyph until someone reloads the page. Retrying
 * with a cache-busting suffix is what makes a feed come back on its own.
 */
const CameraImage = ({
	src,
	alt,
	className,
	rotation = 0,
	onDoubleClick,
}: {
	src?: string;
	alt: string;
	className: string;
	rotation?: number;
	onDoubleClick?: () => void;
}) => {
	const [attempt, setAttempt] = useState(0);
	const failures = useRef(0);
	const retryTimer = useRef<number | null>(null);
	const hasSrc = Boolean(src && src.length > 0);

	useEffect(() => {
		failures.current = 0;
		setAttempt(0);
		return () => {
			if (retryTimer.current !== null) {
				window.clearTimeout(retryTimer.current);
				retryTimer.current = null;
			}
		};
	}, [src]);

	// attempt is never reset on success: bumping it back to 0 would change the src and force a
	// pointless reconnect on a stream that just started working.
	const resolved = !hasSrc
		? DefaultImage
		: attempt === 0
			? (src as string)
			: `${src}${(src as string).includes("?") ? "&" : "?"}r=${attempt}`;

	return (
		<img
			src={resolved}
			alt={alt}
			className={className}
			style={{ transform: `rotate(${rotation}deg)` }}
			onDoubleClick={onDoubleClick}
			onLoad={() => {
				failures.current = 0;
			}}
			onError={() => {
				if (!hasSrc || retryTimer.current !== null) return;
				const delay = Math.min(10000, 1000 * 2 ** Math.min(failures.current, 4));
				failures.current += 1;
				retryTimer.current = window.setTimeout(() => {
					retryTimer.current = null;
					setAttempt((n) => n + 1);
				}, delay);
			}}
		/>
	);
};

/*
Author: Ugo Balducci and Giovanni Ranieri
Year: 2024-25
Description: Camera View component for displaying the different cameras. The idea is depending on the number of cameras,
we display them in a different manner. When you double click on a camera feed, you rotate it by 90° except when we have the 4 cameras,
where we rotate them by 180° for visibility.
*/

const CameraView = ({
	images,
	rotate = [0],
	changeCam,
	setRotateCams,
	currentCam,
	topicNames = [],
	topicPaths = [],
	forceGrid = false,
	navigationPanoramaLayout = false,
	showSelector = true,
	showRemoveButton = false,
	onRemoveCam,
}: {
	images: Array<string>;
	rotate?: number[];
	changeCam: (dir: number) => void;
	setRotateCams: React.Dispatch<React.SetStateAction<number[]>>;
	currentCam: Array<string>;
	topicNames?: Array<string>;
	topicPaths?: Array<string>;
	forceGrid?: boolean;
	/** Top Left + Top Right on top row; Back + Front on bottom row (cameras page Navigation preset). */
	navigationPanoramaLayout?: boolean;
	showSelector?: boolean;
	showRemoveButton?: boolean;
	onRemoveCam?: (index: number) => void;
}) => {
	const getGridDimensions = (count: number): { cols: number; rows: number } => {
		if (count <= 1) return { cols: 1, rows: 1 };
		if (count === 2) return { cols: 2, rows: 1 };
		if (count <= 4) return { cols: 2, rows: 2 };
		if (count <= 6) return { cols: 3, rows: 2 };
		if (count <= 9) return { cols: 3, rows: 3 };
		return { cols: 4, rows: Math.ceil(count / 4) };
	};

	const next90 = (deg: number) => ((deg ?? 0) + 90) % 360;
	const ensureLen = (arr: number[], n: number) =>
  		Array.from({ length: n }, (_, i) => (arr?.[i] ?? 0));
	const cameraCount = Math.max(images.length, topicNames.length, topicPaths.length, currentCam.length);
	const gridLayout = getGridDimensions(cameraCount);
	const selectorLabel = currentCam.length === 1 ? currentCam[0] ?? "No Camera" : "Multi Cam";
	const renderSelector = () =>
		showSelector ? <CameraSelector currentCam={selectorLabel} changeCam={changeCam} /> : null;
	const renderTopicMeta = (idx: number, className: string) => {
		const name = topicNames[idx];
		const path = topicPaths[idx];
		if (!name && !path) return null;
		return (
			<div className={className}>
				{name ? <div className={styles.TopicMetaLabel}>{name}</div> : null}
				{path ? <div className={styles.TopicMetaPath}>{path}</div> : null}
			</div>
		);
	};

	const bump = (idx: number) => {
		// make sure we have one rotation entry per image
		const r = ensureLen(rotate as number[], images.length);
		r[idx] = next90(r[idx]);
		setRotateCams(r);
	};

	if (forceGrid && cameraCount > 0) {
		const gridCell = (i: number) => (
			<div
				key={i}
				className={styles.GridItem}
				style={
					navigationPanoramaLayout && cameraCount === 3 && i === 2
						? { gridColumn: "1 / -1" }
						: undefined
				}
			>
				<div className={styles.GridImageWrapper}>
					<CameraImage
						src={images[i]}
						alt={`Camera ${i + 1}`}
						className={styles.GridImage}
						rotation={rotate[i] ?? 0}
						onDoubleClick={() => bump(i)}
					/>
					{showRemoveButton && (
						<button
							type="button"
							className={styles.RemoveCamButton}
							onClick={() => onRemoveCam?.(i)}
						>
							×
						</button>
					)}
				</div>
				{renderTopicMeta(i, styles.GridTopicMeta)}
			</div>
		);

		const useNavPanorama =
			navigationPanoramaLayout && (cameraCount === 3 || cameraCount === 4);

		return (
			<div className={styles.Container}>
				{renderSelector()}
				<div
					className={useNavPanorama ? styles.NavPanoramaGrid : styles.GridWrapper}
					style={
						useNavPanorama
							? undefined
							: {
									gridTemplateColumns: `repeat(${gridLayout.cols}, minmax(0, 1fr))`,
									gridTemplateRows: `repeat(${gridLayout.rows}, minmax(0, 1fr))`,
								}
					}
				>
					{Array.from({ length: cameraCount }, (_, i) => gridCell(i))}
				</div>
			</div>
		);
	}

	if(cameraCount === 1) {

		return (
			<div className={styles.Container}>
				{renderSelector()}
				<div className={styles.ImageWrapper}>
					<CameraImage
						src={images[0]}
						alt="Camera"
						className={`${styles.Image} ${rotate[0] ? styles.Rotate180 : ""}`}
						rotation={rotate[0] ?? 0}
						onDoubleClick={() => setRotateCams([next90(rotate[0] ?? 0)])}
					/>
					{renderTopicMeta(0, styles.TopicMeta)}
				</div>
			</div>
		);

	} else if (cameraCount === 2) {
		return (
			<div className={styles.Container}>
				{renderSelector()}

				<div className={styles.HalfWrapper}>
					<CameraImage
						src={images[0]}
						alt="Camera"
						className={styles.HalfImage}
						rotation={rotate[0] ?? 0}
						onDoubleClick={() => bump(0)}
					/>
					{renderTopicMeta(0, styles.TopicMeta)}
				</div>
				<div className={styles.HalfWrapper}>
					<CameraImage
						src={images[1]}
						alt="Camera"
						className={styles.HalfImage}
						rotation={rotate[1] ?? 0}
						onDoubleClick={() => bump(1)}
					/>
					{renderTopicMeta(1, styles.TopicMeta)}
				</div>
			</div>
		);

	} else if (cameraCount === 3) {
		return (
			<div className={styles.Container}>
				{renderSelector()}

				<div className={styles.LeftHalf}>
					<CameraImage
						src={images[0]}
						alt="Camera"
						className={styles.FullImage}
						rotation={rotate[0] ?? 0}
						onDoubleClick={() => bump(0)}
					/>
					{renderTopicMeta(0, styles.TopicMeta)}
				</div>

				<div className={styles.RightHalf}>
					<div className={styles.TopHalf}>
						<CameraImage
							src={images[1]}
							alt="Camera"
							className={styles.HalfImage}
							rotation={rotate[0] ?? 0}
							onDoubleClick={() => bump(1)}
						/>
						{renderTopicMeta(1, styles.TopicMeta)}
					</div>
					<div className={styles.BottomHalf}>
						<CameraImage
							src={images[2]}
							alt="Camera"
							className={styles.HalfImage}
							rotation={rotate[0] ?? 0}
							onDoubleClick={() => bump(2)}
						/>
						{renderTopicMeta(2, styles.TopicMeta)}
					</div>
				</div>
			</div>
		);
	} else if (cameraCount === 4) {
		return (
			<div className={styles.Container}>
				{renderSelector()}
				{[0, 1, 2, 3].map((i) => (
				<div key={i} className={styles.QuarterWrapper}>
					<CameraImage
						src={images[i]}
						alt="Camera"
						className={styles.Quarter}
						rotation={rotate[i] ?? 0}
						onDoubleClick={() => {
							setRotateCams((old: number[]) => {
								const r = Array.from({ length: 4 }, (_, k) => old?.[k] ?? 0);
								const next = r.slice();
								next[i] = ((next[i] ?? 0) + 180) % 360;
								return next;
							});
						}}
					/>
					{renderTopicMeta(i, styles.TopicMeta)}
				</div>
				))}
			</div>
		);
	} else if (cameraCount > 4) {
		return (
			<div className={styles.Container}>
				{renderSelector()}
				<div
					className={styles.GridWrapper}
					style={{
						gridTemplateColumns: `repeat(${gridLayout.cols}, minmax(0, 1fr))`,
						gridTemplateRows: `repeat(${gridLayout.rows}, minmax(0, 1fr))`,
					}}
				>
					{Array.from({ length: cameraCount }, (_, i) => (
						<div key={i} className={styles.GridItem}>
							<div className={styles.GridImageWrapper}>
								<CameraImage
									src={images[i]}
									alt={`Camera ${i + 1}`}
									className={styles.GridImage}
									rotation={rotate[i] ?? 0}
									onDoubleClick={() => bump(i)}
								/>
							</div>
							{renderTopicMeta(i, styles.GridTopicMeta)}
						</div>
					))}
				</div>
			</div>
		);
	} else {
		return (
		<div className={styles.Container}>
			{showSelector && <CameraSelector currentCam={"No Camera"} changeCam={changeCam} />}
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

export default memo(CameraView);
