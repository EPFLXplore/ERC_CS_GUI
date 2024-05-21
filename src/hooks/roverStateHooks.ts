import React from "react";
import { useState, useEffect } from "react";

function useRoverState(debug: boolean = false) {
	const [socket, setSocket] = useState<WebSocket | null>(null);
	const [roverState, setRoverState] = React.useState<object>({});

	useEffect(() => {
		if (debug) {
			const fetchData = async () => {
				const response = await fetch("/config/data/example.json");
				const data = await response.json();
				setRoverState(data);
			};

			fetchData();
		} else {
			let sessionSocket = new WebSocket(
				"ws://" + window.location.host + "/ws/csApp/rover_state/"
			);	

			sessionSocket.onmessage = (e) => {
				const data = JSON.parse(e.data);
				setRoverState(JSON.parse(data.rover_state.replaceAll("'", "\"")));
			};

			sessionSocket.onerror = (e) => {
				setSocket(null);
			};

			setSocket(sessionSocket);
		}
	}, []);

	return [roverState];
}

export default useRoverState;
