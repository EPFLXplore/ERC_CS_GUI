import React, { useEffect, useState } from "react";
import styles from "./style.module.sass";
import {
	ARUCO_POSSIBLE_IDS,
	ARUCO_SLOT_COUNT,
	ARUCO_STALE_AFTER_MS,
	ArucoSighting,
} from "../../../hooks/arucoTagsHooks";

/*
Author: Arno Laurie
Year: 2025
Description: Maintenance panel ArUco tags. The panel carries three tags out of the four ids the
detector whitelists, so the widget shows three slots and which of the four possibilities landed in
each. A slot dims once its tag has not been seen for a few seconds — the tag is remembered, but it
is no longer in the camera's view.
*/

interface ArucoTagsProps {
	sightings: ArucoSighting[];
	onReset: () => void;
}

const secondsAgo = (lastSeen: number) => Math.max(0, Math.round((Date.now() - lastSeen) / 1000));

const ArucoTags: React.FC<ArucoTagsProps> = ({ sightings, onReset }) => {
	// A tag that leaves the camera's view stops being published, so nothing else would re-render
	// this card and its slot would stay marked live for as long as the operator looks away. The
	// tick lives here rather than in the hook because the parent memoizes this element on
	// `sightings` alone — only the component's own state can force it to re-read the clock.
	const [, setTick] = useState(0);
	useEffect(() => {
		const timer = window.setInterval(() => setTick((t) => t + 1), 1000);
		return () => window.clearInterval(timer);
	}, []);

	const slots = Array.from({ length: ARUCO_SLOT_COUNT }, (_, index) => sightings[index] ?? null);

	return (
		<div className={styles.arucoBox}>
			<div className={styles.headerRow}>
				<h3 className={styles.title}>Maintenance ArUco Tags</h3>
				<button type="button" className={styles.resetButton} onClick={onReset}>
					Reset
				</button>
			</div>

			<div className={styles.slots}>
				{slots.map((sighting, index) => {
					const stale = sighting !== null && Date.now() - sighting.lastSeen > ARUCO_STALE_AFTER_MS;
					return (
						<div
							className={`${styles.slot} ${sighting === null ? styles.slotEmpty : ""} ${
								stale ? styles.slotStale : ""
							}`}
							key={index}
						>
							<p className={styles.slotLabel}>Tag {index + 1}</p>
							<p className={styles.slotId}>{sighting === null ? "—" : sighting.id}</p>
							<p className={styles.slotAge}>
								{sighting === null
									? "not seen"
									: stale
										? `${secondsAgo(sighting.lastSeen)} s ago`
										: "live"}
							</p>
						</div>
					);
				})}
			</div>

			<p className={styles.footnote}>
				Possible ids: {ARUCO_POSSIBLE_IDS.join(", ")}
			</p>
		</div>
	);
};

export default ArucoTags;
