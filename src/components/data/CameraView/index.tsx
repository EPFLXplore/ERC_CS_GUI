import { memo, useState } from "react";
import styles from "./style.module.sass";
import DefaultImage from "../../../assets/images/NoCam.png";
import MseVideo from "./MseVideo";
import ZoomableFeed from "./ZoomableFeed";

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
	feedIds = [],
	forceGrid = false,
	navigationPanoramaLayout = false,
	probingPanoramaLayout = false,
	verticalStack = false,
	showSelector = true,
	showRemoveButton = false,
	onRemoveCam,
	streamKinds = [],
	registerVideoEl,
	registerImgEl,
	alignOverlays = [],
}: {
	images: Array<string>;
	rotate?: number[];
	changeCam: (dir: number) => void;
	setRotateCams: React.Dispatch<React.SetStateAction<number[]>>;
	currentCam: Array<string>;
	topicNames?: Array<string>;
	topicPaths?: Array<string>;
	/** Stable per-cell identity for zoom reset (e.g. a camera id), independent of `topicPaths` —
	 *  which can embed live bandwidth text and must never be used for that purpose. */
	feedIds?: Array<string>;
	/** Positionally parallel to `images`: which entries are fragmented-MP4 streams needing a
	 *  <video>/MSE player rather than an <img>. Absent entries default to "img". */
	streamKinds?: Array<"img" | "video">;
	/** Lets the page reach a live <video> element, which screenshots have to draw from — an MSE
	 *  stream cannot be re-fetched into an Image() the way an MJPEG URL can. */
	registerVideoEl?: (index: number, el: HTMLVideoElement | null) => void;
	/** Same idea for the <img> feeds: the on-screen element is already decoding the MJPEG stream, so
	 *  screenshots draw from it rather than opening a second connection to the camera. Only wired for
	 *  the grid layout (the cameras page), which is the only place screenshots are taken. */
	registerImgEl?: (index: number, el: HTMLImageElement | null) => void;
	forceGrid?: boolean;
	/** Top Left + Top Right on top row; Back + Front on bottom row (cameras page Navigation preset). */
	navigationPanoramaLayout?: boolean;
	/** Five feeds in two full-width rows: two on top, three below, in `images` order (cameras page
	 *  Probing preset). */
	probingPanoramaLayout?: boolean;
	/** Force a single-column layout (feeds stacked top to bottom in `images` order) regardless of the
	 *  camera count. Used by the cameras page Probing HDS preset. */
	verticalStack?: boolean;
	showSelector?: boolean;
	showRemoveButton?: boolean;
	onRemoveCam?: (index: number) => void;
	/** Positionally parallel to `images`: the alignment wireframe a feed can overlay, if it has one.
	 *  Entries that are null get no "Maintenance align" button. */
	alignOverlays?: Array<string | null>;
}) => {
	// Keyed by overlay source, not cell index: removing a camera reshuffles the indices, and the
	// operator's toggle should follow the feed rather than the slot it happened to occupy.
	const [alignOverlayShown, setAlignOverlayShown] = useState<Record<string, boolean>>({});
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

	const toggleAlignOverlay = (overlay: string) =>
		setAlignOverlayShown((previous) => ({ ...previous, [overlay]: !previous[overlay] }));

	// The wireframe is drawn on top of the feed it annotates, so it lives *inside* the zoom layer and
	// scales with it; its toggle is a normal control and stays outside, at a fixed size.
	const renderAlignOverlayImage = (idx: number) => {
		const overlay = alignOverlays[idx];
		if (!overlay || !(alignOverlayShown[overlay] ?? false)) return null;
		return <img src={overlay} alt="" aria-hidden className={styles.AlignOverlayImage} />;
	};

	const renderAlignOverlayButton = (idx: number) => {
		const overlay = alignOverlays[idx];
		if (!overlay) return null;
		const shown = alignOverlayShown[overlay] ?? false;
		return (
			<button
				type="button"
				className={`${styles.AlignOverlayButton} ${shown ? styles.AlignOverlayButtonActive : ""}`}
				onClick={() => toggleAlignOverlay(overlay)}
			>
				Maintenance align
			</button>
		);
	};

	/** What the zoom of a cell is tied to: reshuffling the cameras must not hand one feed's zoom to
	 *  whichever one takes over its slot. `topicPaths` can embed live bandwidth text that changes
	 *  every second, so it's only a fallback — `feedIds` is the stable identity when available. */
	const feedKey = (idx: number) => feedIds[idx] ?? topicPaths[idx] ?? topicNames[idx] ?? String(idx);

	const bump = (idx: number) => {
		// make sure we have one rotation entry per image
		const r = ensureLen(rotate as number[], images.length);
		r[idx] = next90(r[idx]);
		setRotateCams(r);
	};

	if (forceGrid && cameraCount > 0) {
		const useNavPanorama =
			navigationPanoramaLayout && (cameraCount === 3 || cameraCount === 4);
		const useProbingPanorama = probingPanoramaLayout && cameraCount === 5;
		// Probing: 6-column grid, row 1 = two cells of 3 cols, row 2 = three cells of 2 cols.
		const probingCellStyles: React.CSSProperties[] = [
			{ gridColumn: "1 / 4", gridRow: "1" },
			{ gridColumn: "4 / 7", gridRow: "1" },
			{ gridColumn: "1 / 3", gridRow: "2" },
			{ gridColumn: "3 / 5", gridRow: "2" },
			{ gridColumn: "5 / 7", gridRow: "2" },
		];
		const cellStyle = (i: number): React.CSSProperties | undefined => {
			if (navigationPanoramaLayout && cameraCount === 3 && i === 2) {
				return { gridColumn: "1 / -1" };
			}
			if (useProbingPanorama) return probingCellStyles[i];
			return undefined;
		};

		const gridCell = (i: number) => (
			<div
				key={i}
				className={styles.GridItem}
				style={cellStyle(i)}
			>
				<div className={styles.GridImageWrapper}>
					<ZoomableFeed resetKey={feedKey(i)}>
						{streamKinds[i] === "video" && images[i] ? (
							<MseVideo
								src={images[i]}
								className={styles.GridImage}
								rotation={rotate[i] ?? 0}
								onDoubleClick={() => bump(i)}
								registerEl={(el) => registerVideoEl?.(i, el)}
							/>
						) : (
							/* crossOrigin: the stream server sends CORS headers (app-wide cors()), so a
							   screenshot can draw from this live element without tainting the canvas. */
							<img
								src={images[i] && images[i].length > 0 ? images[i] : DefaultImage}
								alt={`Camera ${i + 1}`}
								className={styles.GridImage}
								draggable={false}
								crossOrigin="anonymous"
								ref={(el) => {
									registerImgEl?.(i, el);
								}}
								style={{ transform: `rotate(${rotate[i] ?? 0}deg)` }}
								onDoubleClick={() => bump(i)}
							/>
						)}
						{renderAlignOverlayImage(i)}
					</ZoomableFeed>
					{showRemoveButton && (
						<button
							type="button"
							className={styles.RemoveCamButton}
							onClick={() => onRemoveCam?.(i)}
						>
							×
						</button>
					)}
					{renderAlignOverlayButton(i)}
					{renderTopicMeta(i, styles.GridTopicMeta)}
				</div>
			</div>
		);

		const effectiveLayout = verticalStack
			? { cols: 1, rows: cameraCount }
			: gridLayout;

		return (
			<div className={styles.Container}>
				{renderSelector()}
				<div
					className={
						useNavPanorama
							? styles.NavPanoramaGrid
							: useProbingPanorama
								? styles.ProbingPanoramaGrid
								: styles.GridWrapper
					}
					style={
						useNavPanorama || useProbingPanorama
							? undefined
							: {
									gridTemplateColumns: `repeat(${effectiveLayout.cols}, minmax(0, 1fr))`,
									gridTemplateRows: `repeat(${effectiveLayout.rows}, minmax(0, 1fr))`,
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
					<ZoomableFeed resetKey={feedKey(0)}>
						<img
							src={images[0] && images[0].length > 0 ? images[0] : DefaultImage}
							alt="Camera"
							className={`${styles.Image} ${rotate[0] ? styles.Rotate180 : ""}`}
							draggable={false}
							style={{ transform: `rotate(${rotate[0] ?? 0}deg)` }}
							onDoubleClick={() => setRotateCams([next90(rotate[0] ?? 0)])}
						/>
					</ZoomableFeed>
					{renderTopicMeta(0, styles.TopicMeta)}
				</div>
			</div>
		);

	} else if (cameraCount === 2) {
		return (
			<div className={styles.Container}>
				{renderSelector()}

				<div className={styles.HalfWrapper}>
					<ZoomableFeed resetKey={feedKey(0)}>
						<img
							src={images[0] && images[0].length > 0 ? images[0] : DefaultImage}
							alt="Camera"
							className={`${styles.HalfImage}`}
							draggable={false}
							style={{ transform: `rotate(${rotate[0] ?? 0}deg)` }}
							onDoubleClick={() => bump(0)}
						/>
					</ZoomableFeed>
					{renderTopicMeta(0, styles.TopicMeta)}
				</div>
				<div className={styles.HalfWrapper}>
					<ZoomableFeed resetKey={feedKey(1)}>
						<img
							src={images[1] && images[1].length > 0 ? images[1] : DefaultImage}
							alt="Camera"
							className={`${styles.HalfImage}`}
							draggable={false}
							style={{ transform: `rotate(${rotate[1] ?? 0}deg)`}}
							onDoubleClick={() => bump(1)}
						/>
					</ZoomableFeed>
					{renderTopicMeta(1, styles.TopicMeta)}
				</div>
			</div>
		);

	} else if (cameraCount === 3) {
		return (
			<div className={styles.Container}>
				{renderSelector()}

				<div className={styles.LeftHalf}>
					<ZoomableFeed resetKey={feedKey(0)}>
						<img
							src={images[0] && images[0].length > 0 ? images[0] : DefaultImage}
							alt="Camera"
							className={`${styles.FullImage}`}
							draggable={false}
							style={{ transform: `rotate(${rotate[0] ?? 0}deg)` }}
							onDoubleClick={() => bump(0)}
						/>
					</ZoomableFeed>
					{renderTopicMeta(0, styles.TopicMeta)}
				</div>

				<div className={styles.RightHalf}>
					<div className={styles.TopHalf}>
						<ZoomableFeed resetKey={feedKey(1)}>
							<img
								src={images[1] && images[1].length > 0 ? images[1] : DefaultImage}
								alt="Camera"
								className={`${styles.HalfImage}`}
								draggable={false}
								style={{ transform: `rotate(${rotate[0] ?? 0}deg)` }}
								onDoubleClick={() => bump(1)}
							/>
						</ZoomableFeed>
						{renderTopicMeta(1, styles.TopicMeta)}
					</div>
					<div className={styles.BottomHalf}>
						<ZoomableFeed resetKey={feedKey(2)}>
							<img
								src={images[2] && images[2].length > 0 ? images[2] : DefaultImage}
								alt="Camera"
								className={`${styles.HalfImage}`}
								draggable={false}
								style={{ transform: `rotate(${rotate[0] ?? 0}deg)` }}
								onDoubleClick={() => bump(2)}
							/>
						</ZoomableFeed>
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
					<ZoomableFeed resetKey={feedKey(i)}>
						<img
							src={images[i] && images[i].length > 0 ? images[i] : DefaultImage}
							alt="Camera"
							className={styles.Quarter}
							draggable={false}
							style={{ transform: `rotate(${rotate[i] ?? 0}deg)` }}
							onDoubleClick={() => {
								setRotateCams((old: number[]) => {
									const r = Array.from({ length: 4 }, (_, k) => old?.[k] ?? 0);
									const next = r.slice();
									next[i] = ((next[i] ?? 0) + 180) % 360;
									return next;
								});
							}}
						/>
					</ZoomableFeed>
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
								<ZoomableFeed resetKey={feedKey(i)}>
									<img
										src={images[i] && images[i].length > 0 ? images[i] : DefaultImage}
										alt={`Camera ${i + 1}`}
										className={styles.GridImage}
										draggable={false}
										style={{ transform: `rotate(${rotate[i] ?? 0}deg)` }}
										onDoubleClick={() => bump(i)}
									/>
								</ZoomableFeed>
								{renderTopicMeta(i, styles.GridTopicMeta)}
							</div>
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
