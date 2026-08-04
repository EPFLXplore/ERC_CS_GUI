import { useEffect, useState } from "react";
import * as ROSLIB from "roslib";

/*
Author: Ugo Balducci and Giovanni Ranieri
Year: 2025
Description: Hooks for managing the states of the different cameras. It creates the subscribers to
get the feeds of the cameras. 
*/

/** Plain string = JPEG `sensor_msgs/CompressedImage` (rosbridge). */
export type CameraFeedInput =
	| string
	| { topic: string; messageType: "sensor_msgs/Image" | "sensor_msgs/msg/Image" };

/**
 * rosbridge `subscribe` QoS (see ROSBRIDGE_PROTOCOL.md §4.2). roslib's Topic omits `qos`, so the
 * bridge may not apply the intended profile; mutating the wire message keeps reconnect payloads
 * consistent (same object reference is reused on websocket reconnect).
 */
const CAMERA_FEED_SUBSCRIBE_QOS = {
	history: "keep_last",
	depth: 1,
	reliability: "best_effort",
	durability: "volatile",
} as const;

/** Caps the frame rate rosbridge forwards per camera feed. The QoS above bounds the DDS-side
 *  queue but not the websocket one, which is where latency accumulates. */
export const CAMERA_FEED_THROTTLE_RATE_MS = 100;

function patchTopicRosbridgeCameraFeedQoS(topic: ROSLIB.Topic<any>): void {
	const t = topic as ROSLIB.Topic<any> & {
		callForSubscribeAndAdvertise: (msg: Record<string, unknown>) => void;
	};
	const original = t.callForSubscribeAndAdvertise.bind(topic);
	t.callForSubscribeAndAdvertise = (msg: Record<string, unknown>) => {
		if (msg.op === "subscribe") {
			msg.qos = { ...CAMERA_FEED_SUBSCRIBE_QOS };
		}
		original(msg);
	};
}

function toBytes(data: unknown): Uint8Array | null {
	if (data == null) return null;
	if (typeof data === "string") {
		try {
			const bin = atob(data);
			const out = new Uint8Array(bin.length);
			for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
			return out;
		} catch {
			return null;
		}
	}
	if (data instanceof Uint8Array) return data;
	if (Array.isArray(data)) return new Uint8Array(data as number[]);
	return null;
}

function bgr8OrRgb8ToDataUrl(
	bytes: Uint8Array,
	width: number,
	height: number,
	step: number,
	encoding: string
): string | null {
	const enc = encoding.toLowerCase();
	if (enc !== "bgr8" && enc !== "rgb8") return null;
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;
	const imgData = ctx.createImageData(width, height);
	const dst = imgData.data;
	const isBgr = enc === "bgr8";
	for (let y = 0; y < height; y++) {
		const row = y * step;
		for (let x = 0; x < width; x++) {
			const i = row + x * 3;
			const j = (y * width + x) * 4;
			if (isBgr) {
				dst[j] = bytes[i + 2] ?? 0;
				dst[j + 1] = bytes[i + 1] ?? 0;
				dst[j + 2] = bytes[i] ?? 0;
			} else {
				dst[j] = bytes[i] ?? 0;
				dst[j + 1] = bytes[i + 1] ?? 0;
				dst[j + 2] = bytes[i + 2] ?? 0;
			}
			dst[j + 3] = 255;
		}
	}
	ctx.putImageData(imgData, 0, 0);
	return canvas.toDataURL("image/jpeg", 0.72);
}

function useCamera(ros: ROSLIB.Ros | null, activeTopics: CameraFeedInput[]) {
	const [imagesByTopic, setImagesByTopic] = useState<Record<string, string>>({});

	useEffect(() => {
		if (!ros) return;

		const _listeners: ROSLIB.Topic<any>[] = [];

		activeTopics.forEach((spec) => {
			const topic = typeof spec === "string" ? spec : spec.topic;
			const isRawImage =
				typeof spec === "object" &&
				(spec.messageType === "sensor_msgs/Image" ||
					spec.messageType === "sensor_msgs/msg/Image");

			if (!isRawImage) {
				const listener = new ROSLIB.Topic({
					ros: ros,
					name: topic,
					messageType: "sensor_msgs/CompressedImage",
					// roslib only knows png/cbor/cbor-raw/none; anything else is silently downgraded
					// to "none", so say so rather than implying the JPEG is handled specially.
					compression: "none",
					// rosbridge takes the min throttle_rate across every subscriber of a topic, so
					// this only holds if all of them set it. Without it a slow websocket sink builds
					// an unbounded backlog and the feed drifts further behind real time.
					throttle_rate: CAMERA_FEED_THROTTLE_RATE_MS,
					queue_length: 1,
					queue_size: 1,
				});
				patchTopicRosbridgeCameraFeedQoS(listener);

				listener.subscribe((message: unknown) => {
					const m = message as { data?: string };
					if (!m?.data) return;
					setImagesByTopic((previous) => ({
						...previous,
						[topic]: "data:image/jpeg;charset=utf-8;base64," + m.data,
					}));
				});

				_listeners.push(listener);
				return;
			}

			const listener = new ROSLIB.Topic({
				ros: ros,
				name: topic,
				messageType: "sensor_msgs/msg/Image",
				queue_length: 1,
				queue_size: 1,
			});
			patchTopicRosbridgeCameraFeedQoS(listener);

			listener.subscribe((message: unknown) => {
				const m = message as {
					width?: number;
					height?: number;
					encoding?: string;
					step?: number;
					data?: unknown;
				};
				const w = m.width;
				const h = m.height;
				const encoding = m.encoding ?? "";
				const step = m.step ?? w! * 3;
				if (typeof w !== "number" || typeof h !== "number" || w < 1 || h < 1) return;
				const bytes = toBytes(m.data);
				if (!bytes || bytes.length < step * (h - 1) + w * 3) return;
				const url = bgr8OrRgb8ToDataUrl(bytes, w, h, step, encoding);
				if (!url) return;
				setImagesByTopic((previous) => ({ ...previous, [topic]: url }));
			});

			_listeners.push(listener);
		});

		return () => {
			_listeners.forEach((listener) => listener.unsubscribe());
		};
	}, [ros, activeTopics]);

	return [imagesByTopic] as const;
}

export default useCamera;
