import { useEffect, useState } from "react";
import * as ROSLIB from "roslib";

type CameraDef = {
	id: string;
	source: { type: "ros"; topic: string } | { type: "gst"; url: string };
};

function useCamera(ros: ROSLIB.Ros | null, cameras: readonly CameraDef[]) {
	const [imagesByKey, setImagesByKey] = useState<Record<string, string>>({});

	useEffect(() => {
		const cleanups: (() => void)[] = [];

		cameras.forEach((camera) => {
			if (camera.source.type === "ros") {
				if (!ros) return;
				const listener = new ROSLIB.Topic({
					ros,
					name: camera.source.topic,
					messageType: "sensor_msgs/CompressedImage",
					compression: "jpeg",
					queue_length: 1,
					queue_size: 1,
				});
				listener.subscribe((message: any) => {
					if (!message.data) return;
					setImagesByKey((prev) => ({
						...prev,
						[camera.id]: "data:image/jpeg;base64," + message.data,
					}));
				});
				cleanups.push(() => listener.unsubscribe());

			} else if (camera.source.type === "gst") {
				const streamUrl = camera.source.url;
				setImagesByKey((prev) => ({
					...prev,
					[camera.id]: streamUrl,
				}));
			}
		});

		return () => cleanups.forEach((fn) => fn());
	}, [ros, JSON.stringify(cameras)]);

	return [imagesByKey] as const;
}

export default useCamera;