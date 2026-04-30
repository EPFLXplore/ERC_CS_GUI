import { useEffect, useState } from "react";
import * as ROSLIB from "roslib";
import { Topics } from "../data/topics.type";

const NAV_BW_TOPICS = [
	Topics.NAV_BW_CAMERA_NAV_0,
	Topics.NAV_BW_CAMERA_NAV_1,
	Topics.NAV_BW_CAMERA_NAV_2,
] as const;

/**
 * ROS 2 + rosbridge: use `std_msgs/msg/Float64` or `std_msgs/msg/Float32`.
 * If the declared type does not match the topic, some bridges never deliver messages.
 * We omit `messageType` so rosbridge can infer the type from the existing publisher.
 */
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

/** Live NAV camera bandwidth from `/NAV/bw_camera_nav_{0,1,2}` (same index order as CameraNAV). */
function useNavCameraBandwidth(ros: ROSLIB.Ros | null): readonly [number, number, number] {
	const [mbps, setMbps] = useState<readonly [number, number, number]>([0, 0, 0]);

	useEffect(() => {
		if (!ros) {
			return;
		}

		const listeners = NAV_BW_TOPICS.map((name, idx) => {
			// Omit `messageType` so rosbridge matches the topic’s real std_msgs Float32/Float64 type.
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
					const copy: [number, number, number] = [prev[0], prev[1], prev[2]];
					copy[idx] = v;
					return copy;
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

export default useNavCameraBandwidth;
