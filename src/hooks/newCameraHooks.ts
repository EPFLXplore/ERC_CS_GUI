import { useEffect, useState } from "react";
import ROSLIB from "roslib";

function useNewCamera(ros: ROSLIB.Ros | null) {
	const [images, setImage] = useState<Array<string>>([]);
	const [rotateCams, setRotateCam] = useState<Array<boolean>>([false]);
	const CAMERA_CONFIGS = [["camera_0"], ["camera_1"], ["camera_0", "camera_1"]];
	const [currentVideo, setCurrentVideo] = useState(0);
	const [listeners, setListeners] = useState<ROSLIB.Topic[]>([])

	useEffect(() => {
		if (ros) {
			const cameras = CAMERA_CONFIGS[currentVideo];
			let _listeners: ROSLIB.Topic[] = []
			setImage(Array(cameras.length).fill(""));
			cameras.forEach((camera) => {
				const listener = new ROSLIB.Topic({
					ros: ros,
					name: camera,
					messageType: "sensor_msgs/CompressedImage",
					compression: "jpeg",
				});

				listener.subscribe((message) => {
					setImage((prev) => {
						const index = cameras.indexOf(camera);
						const newImages = [...prev];
						//@ts-ignore
						if(message.data) {
							//@ts-ignore
							newImages[index] = "data:image/jpeg;charset=utf-8;base64," + message.data;
						}
						return newImages;
					});
				});

				_listeners = [..._listeners, listener]
			});

			setListeners(old => {
				old.forEach((listener) => {
					listener.unsubscribe()
				});

				return _listeners;
			})
		}
	}, [ros, currentVideo]);

	return [images, rotateCams, currentVideo, setCurrentVideo] as const;
}

export default useNewCamera;
