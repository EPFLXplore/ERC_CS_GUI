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
				queue_length: 1,
				queue_size: 1
			});

			listener.subscribe((message) => {
				//@ts-ignore
				const data = JSON.parse(message.data);
				startTransition(() => setRoverState(data));
			});

			// HERE NEW FEATURE: USE the functions of roslibjs to retrieve the list of nodes running. 
			// You can then delete the active_node_checker node in the rover_pkg 

			// The problem with that option is that with the rover_pkg, we could reset the information of the
			// rover state directly before sending it. Here, if you check the status of the nodes, you still send
			// the data of the nodes without a reset. So the solution would be to leave the rover send wrong dsta
			// and reset locally here... to think about

			// ros.getNodes((nodes: string[]) => {

			// })

		}
	}, [ros]);

	return [roverState];
}

export default useRoverState;
