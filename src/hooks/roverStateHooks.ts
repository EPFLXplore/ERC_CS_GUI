import { useState, useEffect, startTransition } from "react";
import * as ROSLIB from "roslib";

/*
Author: Ugo Balducci and Giovanni Ranieri
Year: 2024
Description: Hooks managing the roverState. It's the main feed of information of the Rover. It's a JSON
stringified and then converted to JSON again by us to access it easily.
*/

function useRoverState(ros: ROSLIB.Ros | null) {
	const [roverState, setRoverState] = useState<object>({});

	useEffect(() => {
		if (ros) {
			const listener = new ROSLIB.Topic({
				ros: ros,
				name: "/Rover/RoverState",
				messageType: "std_msgs/String",
			});

			listener.subscribe((message) => {
				//@ts-ignore
				const data = JSON.parse(message.data);
				startTransition(() => setRoverState(data));
			});
		}
	}, [ros]);

	return [roverState];
}

export default useRoverState;
