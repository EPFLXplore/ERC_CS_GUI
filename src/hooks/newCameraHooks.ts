import { useEffect, useState } from "react";
import ROSLIB from "roslib";

function useNewCamera(ros: ROSLIB.Ros | null) {
	const [images, setImage] = useState<Array<string>>([]);
	const [rotateCams, setRotateCam] = useState<Array<boolean>>([false]);


	useEffect(() => {
		if(ros) {
			var listener = new ROSLIB.Topic({
				ros : ros,
				name : 'camera_new',
				messageType : 'sensor_msgs/CompressedImage'
			  });
			
			  listener.subscribe((message) => {
				//@ts-ignore
				setImage(["data:image/jpeg;charset=utf-8;base64," + message.data])
			  });
		}
	}, [ros]);

	return [images, rotateCams] as const;
}

export default useNewCamera;