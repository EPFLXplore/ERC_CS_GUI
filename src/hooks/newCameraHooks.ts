import { useEffect, useState } from "react";
import * as ROSLIB from "roslib";
import SubSystems from "../data/subsystems.type";
import {CameraType } from "../data/cameras.type";

function useNewCamera(ros: ROSLIB.Ros | null, roverState: any) {
	const [images, setImage] = useState<Array<string>>([]);
	const [rotateCams, setRotateCam] = useState<Array<boolean>>([false]);
	const CAMERA_CONFIGS = ["/ROVER/feed_camera_cs_0", "/ROVER/feed_camera_cs_1", "/ROVER/feed_camera_cs_2", "/ROVER/feed_camera_cs_3"];
	const [currentVideo, setCurrentVideo] = useState(0);
	const [listeners, setListeners] = useState<ROSLIB.Topic<any>[]>([])
	const [init, setInit] = useState(true)

	const [cameraStates, setCameraStates] = useState<CameraType>({
		[SubSystems.CS]: {
			name: SubSystems.CS,
			states: !roverState["rover"]
			? {}
			: roverState["cameras"][SubSystems.CS],
		}
	})

	useEffect(() => {
		if (ros) {
			let _listeners: ROSLIB.Topic<any>[] = []
			setImage(Array(CAMERA_CONFIGS.length).fill(""));
			CAMERA_CONFIGS.forEach((camera) => {
				const listener = new ROSLIB.Topic({
					ros: ros,
					name: camera,
					messageType: "sensor_msgs/CompressedImage",
					compression: "jpeg",
				});

				listener.subscribe((message) => {
					setImage((prev) => {
						const index = CAMERA_CONFIGS.indexOf(camera);
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
			//console.log(newStates['control_station'])
			return newStates;
		});
	}, [roverState]); // eslint-disable-line react-hooks/exhaustive-deps

	return [cameraStates, images, rotateCams, currentVideo, setCurrentVideo] as const;
}

export default useNewCamera;
