import { useEffect, useState } from "react";
import ROSLIB from "roslib";

function useNewCamera(ros: ROSLIB.Ros | null) {
	const [cameras, setCameras] = useState<Array<string>>(["camera_0"]);
	const [images, setImage] = useState<Array<string>>([]);
	const [rotateCams, setRotateCam] = useState<Array<boolean>>([false]);


	useEffect(() => {
		if(ros) {
			var listener = new ROSLIB.Topic({
				ros : ros,
				name : cameras[0],
				messageType : 'sensor_msgs/CompressedImage'
			  });
			
			  listener.subscribe((message) => {
				//@ts-ignore
				setImage(["data:image/jpeg;charset=utf-8;base64," + message.data])
			  });
		}
	}, [ros, cameras]);

	return [images, rotateCams] as const;
}

export default useNewCamera;