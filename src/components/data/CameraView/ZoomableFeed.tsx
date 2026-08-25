import { ReactNode } from "react";
import styles from "./style.module.sass";
import useZoomPan from "../../../hooks/useZoomPan";

/*
Description: Wraps one camera cell's media so the wheel zooms it around the cursor and dragging pans
it. Purely visual — screenshots are captured from the stream, not from what is laid out here, so
they stay full-frame whatever the operator is zoomed into.

Only the media (and any overlay locked to it) goes inside; the cell's buttons and topic label stay
outside as siblings so they keep their fixed size and position.
*/

const ZoomableFeed = ({
	children,
	resetKey,
}: {
	children: ReactNode;
	/** Identity of the feed in this slot. Cells are keyed by slot index, so removing a camera
	 *  reshuffles them; changing this drops the zoom rather than handing it to the next feed. */
	resetKey?: string;
}) => {
	const { containerRef, transform, isPanning, isZoomed, reset, onPointerDown } = useZoomPan(resetKey);

	return (
		<div
			ref={containerRef}
			className={`${styles.ZoomContainer} ${isZoomed ? styles.ZoomContainerZoomed : ""} ${
				isPanning ? styles.ZoomContainerPanning : ""
			}`}
			onPointerDown={onPointerDown}
		>
			<div
				className={styles.ZoomLayer}
				style={{
					transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
				}}
			>
				{children}
			</div>
			{isZoomed && (
				<div className={styles.ZoomControls}>
					<div className={styles.ZoomBadge}>{transform.scale.toFixed(1)}x</div>
					<button
						type="button"
						className={styles.ZoomResetButton}
						title="Reset zoom (Esc)"
						onClick={reset}
					>
						⟲
					</button>
				</div>
			)}
		</div>
	);
};

export default ZoomableFeed;
