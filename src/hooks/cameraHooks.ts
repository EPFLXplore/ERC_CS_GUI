import { useEffect, useState } from "react";
import * as ROSLIB from "roslib";

/*
Author: Ugo Balducci and Giovanni Ranieri
Year: 2025
Description: Hooks for managing the states of the different cameras. It creates the subscribers to
get the feeds of the cameras. 
*/

function useCamera(ros: ROSLIB.Ros | null) {
	const [images, setImage] = useState<Array<string>>([]);
	const [rotateCams, setRotateCams] = useState<Array<number>>([0]);
	const ALL_CAMERA_TOPICS = [
		"/NAV/feed_camera_nav_0",
		"/NAV/feed_camera_nav_1",
		"/NAV/feed_camera_nav_2",
		"/HD/feed_camera_hd_0",
		"/CS/feed_camera_cs_0",
		"/CS/feed_camera_cs_1",
		"/CS/feed_camera_cs_2",
		"/CS/feed_camera_cs_3",
		"/CS/feed_camera_cs_4",
		"/CS/feed_camera_cs_5",
	];

	// Topics for the cameras - Direct from subsystem interfaces (NAV, HD)
	// Control station cameras (CS) may still be published to /ROVER or moved to /CS namespace
	const CAMERA_CONFIGS = [
		["/NAV/feed_camera_nav_0"],
		["/HD/feed_camera_hd_0"],
		["/CS/feed_camera_cs_0", "/CS/feed_camera_cs_1", "/CS/feed_camera_cs_2", "/CS/feed_camera_cs_3"],
		["/CS/feed_camera_cs_0", "/CS/feed_camera_cs_2"],
		["/NAV/feed_camera_nav_0", "/CS/feed_camera_cs_0", "/CS/feed_camera_cs_2"],
		["/NAV/feed_camera_nav_1", "/NAV/feed_camera_nav_2"],
		["/CS/feed_camera_cs_4", "/CS/feed_camera_cs_5"],
		ALL_CAMERA_TOPICS,
	]; 
	
	const [currentVideo, setCurrentVideo] = useState(0);
	const [listeners, setListeners] = useState<ROSLIB.Topic<any>[]>([])
	
	useEffect(() => {
		if (ros) {

			const cameras = CAMERA_CONFIGS[currentVideo];
			let _listeners: ROSLIB.Topic<any>[] = []
			setImage(Array(cameras.length).fill(""));

			setListeners(old => {
				old.forEach((listener) => {
					listener.unsubscribe()
				});

				return _listeners;
			})

			cameras.forEach((camera) => {
				const listener = new ROSLIB.Topic({
					ros: ros,
					name: camera,
					messageType: "sensor_msgs/CompressedImage",
					compression: "jpeg",
					queue_length: 1,
					queue_size: 1
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

			return () => {
				_listeners.forEach((listener) => {
					listener.unsubscribe();
				});
			};
		}

	}, [ros, currentVideo]);

	// useEffect(() => {
	// 	setCameraStates((old) => {
	// 		let newStates = { ...old };

	// 		if (roverState === undefined || roverState["cameras"] == undefined) {
	// 			return newStates;
	// 		}
	// 		for (const key in newStates) {
	// 			if (newStates.hasOwnProperty(key)) {
	// 				newStates[key] = roverState["cameras"][key]
	// 			}
	// 		}
	// 		return newStates;
	// 	});
	// }, [roverState]); // eslint-disable-line react-hooks/exhaustive-deps
	

	// // Change the camera on the screen
	// useEffect(() => {
	// 	const handleNext = (event: { key: string }) => {
	// 		if (event.key === "ArrowRight") {
	// 			setCurrentVideo((old) => {
	// 				if (old === MAX_CAMERAS - 1) {
	// 					return 0;
	// 				} else {
	// 					return old + 1;
	// 				}
	// 			});
	// 		}
	// 	};
	// 	window.addEventListener("keydown", handleNext);

	// 	return () => {
	// 		window.removeEventListener("keydown", handleNext);
	// 	};
	// }, []);

	// // Listen to other tabs updating the flag
	// useEffect(() => {
	// 	const handleStorage = (event: StorageEvent) => {
	// 	if (event.key === "cameraTabOpen" && event.newValue !== null) {
	// 		setShouldSubscribe(event.newValue === "true");
	// 	}
	// 	};

	// 	window.addEventListener("storage", handleStorage);
	// 	return () => window.removeEventListener("storage", handleStorage);
	// }, []);

	return [rotateCams, setRotateCams, images, currentVideo, setCurrentVideo, CAMERA_CONFIGS
	] as const;
}

export default useCamera;
