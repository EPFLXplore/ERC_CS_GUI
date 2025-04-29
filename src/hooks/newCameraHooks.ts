import { useEffect, useState } from "react";
import * as ROSLIB from "roslib";
import SubSystems from "../data/subsystems.type";
import {CameraType } from "../data/cameras.type";
import { Topics } from "../data/topics.type";

/*
Author: Ugo Balducci
Year: 2023
Description: Hooks for managing the states of the different cameras. It creates the subscribers to
get the feeds of the cameras. 
*/

function useNewCamera(ros: ROSLIB.Ros | null, roverState: any
) {
	const [images, setImage] = useState<Array<string>>([]);
	const [hdConfirmationRocks, setHDConfirmationRocks] = useState<((x: number, y: number) => void) | null>(null);
	const [imageRock, setImageRock] = useState<string | null>(null);

	// Topics for the cameras. If you decide to modify them, you need to update also in the 
	// submodule of the cameras => in the launch files.
	const CAMERA_CONFIGS = [
		["/ROVER/feed_camera_cs_0"], 
		["/ROVER/feed_camera_cs_1"], 
		["/ROVER/feed_camera_cs_2"],
		["/ROVER/feed_camera_hd_0"],
		["/NAV/feed_camera_nav_0"],
		["/NAV/feed_camera_nav_0", "/ROVER/feed_camera_cs_0"]
	]; 
	
	const [currentVideo, setCurrentVideo] = useState(0);
	const [listeners, setListeners] = useState<ROSLIB.Topic<any>[]>([])

	// Keep the states of the cameras (on or off)
	const [cameraStates, setCameraStates] = useState<CameraType>({
		[SubSystems.ROVER]: !roverState["rover"] ? null : roverState["cameras"][SubSystems.ROVER],
		[SubSystems.HANDLING_DEVICE]: !roverState["rover"] ? null : roverState["cameras"][SubSystems.HANDLING_DEVICE],
		[SubSystems.NAGIVATION]: !roverState["rover"] ? null : roverState["cameras"][SubSystems.NAGIVATION],
	})
	
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

	useEffect(() => {
		setCameraStates((old) => {
			let newStates = { ...old };

			if (roverState === undefined || roverState["cameras"] == undefined) {
				return newStates;
			}
			for (const key in newStates) {
				if (newStates.hasOwnProperty(key)) {
					newStates[key] = roverState["cameras"][key]
				}
			}
			return newStates;
		});
	}, [roverState]); // eslint-disable-line react-hooks/exhaustive-deps

	// Service that triggers Human verification for selecting a Rock on an image

	useEffect(() => {
		if (ros) {
			var res = new ROSLIB.Service({
				ros: ros,
				name: Topics.REQUEST_SELECTION_ROCK,
				serviceType: "custom_msg/srv/RockSelection",
			});

			res.advertiseAsync(async (request: any) => {
				setImageRock("data:image/jpeg;charset=utf-8;base64," + request.rock_image.data)

				const result = await new Promise<{x: number, y: number}>((resolve, reject) => {
					setHDConfirmationRocks(() => (x: number, y: number) => {
						resolve({x, y});
						setHDConfirmationRocks(null);
					});
				});

				return {
					x: result.x,
					y: result.y,
					success: true
				};
			})
		}

	}, [ros]);

	return [cameraStates, images, currentVideo, setCurrentVideo, hdConfirmationRocks,
		imageRock, setImageRock
	] as const;
}

export default useNewCamera;
