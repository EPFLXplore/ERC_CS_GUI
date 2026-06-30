import { useEffect, useState } from "react";
import * as ROSLIB from "roslib";
import { Topics } from "../data/topics.type";

const ROVER_BW_TOPICS = [
	Topics.ROVER_BW_CAMERA_CS_TOP,
	Topics.ROVER_BW_CAMERA_CS_RIGHT_STEER,
	Topics.ROVER_BW_CAMERA_CS_LEFT_STEER,
] as const;

function readStdMsgsFloat(message: unknown): number | null {
	if (message == null || typeof message !== "object") {
		return null;
	}
	const o = message as Record<string, unknown>;
	const inner = o.msg != null && typeof o.msg === "object" ? (o.msg as Record<string, unknown>) : o;
	const raw = inner.data;
	if (typeof raw === "number") {
		return Number.isFinite(raw) ? raw : null;
	}
	if (typeof raw === "string") {
		const n = Number(raw);
		return Number.isFinite(n) ? n : null;
	}
	return null;
}

/** Live rover camera bandwidth from `/ROVER/bw_camera_cs_{top,right_steer,left_steer}`. */
function useRoverCameraBandwidth(ros: ROSLIB.Ros | null): readonly [number, number, number] {
	const [mbps, setMbps] = useState<readonly [number, number, number]>([0, 0, 0]);

	useEffect(() => {
		if (!ros) {
			return;
		}

		const listeners = ROVER_BW_TOPICS.map((name, idx) => {
			const topic = new ROSLIB.Topic({
				ros,
				name,
				queue_length: 1,
				queue_size: 1,
			} as any);

			topic.subscribe((message: unknown) => {
				const v = readStdMsgsFloat(message);
				if (v == null) {
					return;
				}
				setMbps((prev) => {
					if (prev[idx] === v) {
						return prev;
					}
					const next: [number, number, number] = [prev[0], prev[1], prev[2]];
					next[idx] = v;
					return next;
				});
			});

			return topic;
		});

		return () => {
			listeners.forEach((t) => t.unsubscribe());
		};
	}, [ros]);

	return mbps;
}

export default useRoverCameraBandwidth;
