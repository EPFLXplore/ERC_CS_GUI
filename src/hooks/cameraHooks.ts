import { useEffect, useState } from "react";
import * as ROSLIB from "roslib";

/*
Author: Ugo Balducci and Giovanni Ranieri
Year: 2025
Description: Hooks for managing the states of the different cameras. It creates the subscribers to
get the feeds of the cameras. 
*/

function useCamera(ros: ROSLIB.Ros | null, activeTopics: string[]) {
	const [imagesByTopic, setImagesByTopic] = useState<Record<string, string>>({});
	const [listeners, setListeners] = useState<ROSLIB.Topic<any>[]>([]);
	
	useEffect(() => {
		if (ros) {
			let _listeners: ROSLIB.Topic<any>[] = [];

			setListeners(old => {
				old.forEach((listener) => {
					listener.unsubscribe();
				});

				return _listeners;
			});

			activeTopics.forEach((camera) => {
				const listener = new ROSLIB.Topic({
					ros: ros,
					name: camera,
					messageType: "sensor_msgs/CompressedImage",
					compression: "jpeg",
					queue_length: 1,
					queue_size: 1,
				});

				listener.subscribe((message) => {
					//@ts-ignore
					if (!message.data) {
						return;
					}
					setImagesByTopic((previous) => {
						return {
							...previous,
							//@ts-ignore
							[camera]: "data:image/jpeg;charset=utf-8;base64," + message.data,
						};
					});
				});

				_listeners = [..._listeners, listener];
			});

			return () => {
				_listeners.forEach((listener) => {
					listener.unsubscribe();
				});
			};
		}

	}, [ros, activeTopics]);

	return [imagesByTopic] as const;
}

export default useCamera;
