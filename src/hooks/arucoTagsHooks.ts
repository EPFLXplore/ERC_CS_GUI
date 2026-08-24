import { useCallback, useEffect, useState } from "react";
import * as ROSLIB from "roslib";
import { Topics } from "../data/topics.type";

/*
Author: Arno Laurie
Year: 2025
Description: Live view of the maintenance panel ArUco tags seen by maintenance_aruco_detector.

The detector only publishes on frames where it found at least one whitelisted tag, so a naive
"show the last message" readout would blank out the instant a tag leaves the frame. The panel
carries three of the four possible tags, and the camera rarely holds all three at once, so this
hook accumulates instead: every id keeps its own last-seen timestamp and the three most recently
seen survive. Sweeping the camera across the panel therefore fills the three slots one by one.
*/

/** Mirrors ArucoDetector.WHITELISTED_IDS in the detector node. */
export const ARUCO_POSSIBLE_IDS = [11, 13, 14, 15] as const;

/** Tags on the maintenance panel: three of the four ids above. */
export const ARUCO_SLOT_COUNT = 3;

/** Past this, the id is shown greyed out: it was seen, but not in the current view. */
export const ARUCO_STALE_AFTER_MS = 3000;

/**
 * How far lastSeen may lag behind reality before a repeat sighting is worth a re-render. Well
 * under ARUCO_STALE_AFTER_MS, so it cannot make a live tag read as stale.
 */
const ARUCO_SETTLED_MS = 500;

export interface ArucoSighting {
	id: number;
	/** Date.now() of the most recent frame this id appeared in. */
	lastSeen: number;
}

/** Extract the id list from an `std_msgs/Int32MultiArray`, dropping anything off the whitelist. */
function readArucoIds(message: unknown): number[] {
	if (message == null || typeof message !== "object") {
		return [];
	}
	const outer = message as Record<string, unknown>;
	// rosbridge hands the message straight through, but some bridge versions wrap it in `msg`.
	const inner = outer.msg != null && typeof outer.msg === "object" ? (outer.msg as Record<string, unknown>) : outer;
	const raw = inner.data;
	if (!Array.isArray(raw)) {
		return [];
	}

	const ids: number[] = [];
	for (const entry of raw) {
		const value = typeof entry === "string" ? Number(entry) : entry;
		if (typeof value !== "number" || !Number.isFinite(value)) {
			continue;
		}
		const id = Math.round(value);
		if (!(ARUCO_POSSIBLE_IDS as readonly number[]).includes(id) || ids.includes(id)) {
			continue;
		}
		ids.push(id);
	}
	return ids;
}

/**
 * The three most recently seen tag ids, a fourth evicting whichever of them is oldest.
 *
 * Returned sorted by id rather than by recency: the slots have to stay put on screen, otherwise
 * every frame that re-detects one tag would shuffle the three rows around.
 */
function useArucoTags(ros: ROSLIB.Ros | null) {
	const [sightings, setSightings] = useState<ArucoSighting[]>([]);

	useEffect(() => {
		if (!ros) {
			return;
		}

		// `messageType` omitted so rosbridge takes the type from the live publisher.
		const listener = new ROSLIB.Topic({
			ros,
			name: Topics.MAINTENANCE_ARUCO_ID,
			queue_length: 1,
			queue_size: 1,
		} as any);

		listener.subscribe((message: unknown) => {
			const ids = readArucoIds(message);
			if (ids.length === 0) {
				return;
			}

			const now = Date.now();
			setSightings((previous) => {
				const merged = new Map(previous.map((sighting) => [sighting.id, sighting.lastSeen]));
				ids.forEach((id) => merged.set(id, now));

				const next = Array.from(merged, ([id, lastSeen]) => ({ id, lastSeen }))
					// Keep the freshest ARUCO_SLOT_COUNT: a fourth id can only be a tag that is not
					// on the panel, or one the operator has since moved away from.
					.sort((a, b) => b.lastSeen - a.lastSeen)
					.slice(0, ARUCO_SLOT_COUNT)
					.sort((a, b) => a.id - b.id);

				// The detector publishes on every frame it finds a tag in, so holding the camera on
				// the panel would otherwise hand the page a new array — and a re-render — at camera
				// framerate. While the ids themselves are unchanged, the only thing moving is
				// lastSeen, and refreshing that is worth a render only against ARUCO_STALE_AFTER_MS.
				const settled =
					next.length === previous.length &&
					next.every(
						(sighting, index) =>
							sighting.id === previous[index].id &&
							sighting.lastSeen - previous[index].lastSeen < ARUCO_SETTLED_MS
					);

				return settled ? previous : next;
			});
		});

		return () => {
			listener.unsubscribe();
		};
	}, [ros]);

	/** Drops everything collected so far, for when the camera picked up a tag off the panel. */
	const reset = useCallback(() => setSightings([]), []);

	return { sightings, reset };
}

export default useArucoTags;
