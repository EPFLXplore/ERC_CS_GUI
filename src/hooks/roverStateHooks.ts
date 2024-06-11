import { useState, useEffect } from "react";
import ROSLIB from 'roslib';

function useRoverState(ros: ROSLIB.Ros | null) {
	const [roverState, setRoverState] = useState<object>({});

	useEffect(() => {
		if(ros) {
			const listener = new ROSLIB.Topic({
				ros : ros,
				name : '/Rover/RoverState',
				messageType : 'std_msgs/String'
			});
			
			listener.subscribe((message) => {
			//@ts-ignore
			const data = JSON.parse(message.data);
			setRoverState(data);
			});
		} 
	}, [ros]);

	return [roverState];
}

export default useRoverState;
