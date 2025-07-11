import { useEffect, useState } from "react";
import * as ROSLIB from "roslib";
import SubSystems from "../data/subsystems.type";
import {CameraType } from "../data/cameras.type";
import { Topics } from "../data/topics.type";

/*
Author: Ugo Balducci and Giovanni Ranieri
Year: 2025
Description: Hooks for managing the states of the different cameras. It creates the subscribers to
get the feeds of the cameras. 
*/

function useCamera(ros: ROSLIB.Ros | null) {
	const [images, setImage] = useState<Array<string>>([]);
	const [rotateCams, setRotateCams] = useState<Array<boolean>>([false]);

	// Topics for the cameras. If you decide to modify them, you need to update also in the 
	// submodule of the cameras => in the launch files.
	const CAMERA_CONFIGS = [
		["/NAV/feed_camera_nav_0"],
		["/ROVER/feed_camera_hd_0"],
		["/ROVER/feed_camera_cs_0", "/ROVER/feed_camera_cs_1", "/ROVER/feed_camera_cs_2", "/ROVER/feed_camera_cs_3"],
		["/NAV/feed_camera_nav_0", "/ROVER/feed_camera_cs_0", "/ROVER/feed_camera_cs_1"],
		["/NAV/feed_camera_nav_1", "/NAV/feed_camera_nav_2"]
	]; 
	
	const [currentVideo, setCurrentVideo] = useState(0);
	const [listeners, setListeners] = useState<ROSLIB.Topic<any>[]>([])
	
	useEffect(() => {
		if (ros) {

			const cameras = CAMERA_CONFIGS[currentVideo];
			let _listeners: ROSLIB.Topic<any>[] = []
			setImage(Array(CAMERA_CONFIGS.length).fill(""));

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

	return [rotateCams, setRotateCams, images, currentVideo, setCurrentVideo
	] as const;
}

export default useCamera;
