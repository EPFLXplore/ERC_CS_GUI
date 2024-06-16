import { useEffect, useState } from "react";
import ROSLIB from "roslib";

function useNewCamera(ros: ROSLIB.Ros | null, cameras: Array<string>) {
	const [images, setImage] = useState<Array<string>>([]);
	const [rotateCams, setRotateCam] = useState<Array<boolean>>([false]);

	useEffect(() => {
		const listeners: ROSLIB.Topic[] = [];

		if (ros) {
			setImage(Array(cameras.length).fill(""));
			cameras.forEach((camera) => {
				var listener = new ROSLIB.Topic({
					ros: ros,
					name: camera,
					messageType: "sensor_msgs/CompressedImage",
				});

				listener.subscribe((message) => {
					setImage((prev) => {
						const index = cameras.indexOf(camera);
						const newImages = [...prev];
						//@ts-ignore
						newImages[index] = "data:image/jpeg;charset=utf-8;base64," + message.data;
						return newImages;
					});
				});
			});
		}

		return () => {
			listeners.forEach((listener) => listener.unsubscribe());
		};
	}, [ros, cameras]);

	return [images, rotateCams] as const;
}

export default useNewCamera;
