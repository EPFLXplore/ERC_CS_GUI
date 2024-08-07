import React from "react";
import { useState, useEffect } from "react";
import * as ROSLIB from "roslib";

function useRosBridge(snackBar: (sev: string, mes: string) => void) {
	const [ros, setRos] = useState<ROSLIB.Ros | null>(null);
	const [connected, setConnected] = useState(false);

	useEffect(() => {
		const ros_server = new ROSLIB.Ros({});
		ros_server.connect("ws://localhost:9090");

		ros_server.on("error", function (error) {
			snackBar("error", "Failed to connect to ROS server.");
			console.log(error);
			setRos(null);
		});

		// Find out exactly when we made a connection.
		ros_server.on("connection", function () {
			console.log("Connected!");
			snackBar("success", "Connected to ROS server.");
			setRos(ros_server);
		});

		ros_server.on("close", function () {
			console.log("Connection closed");
			setRos(null);
		});

		return () => {
			ros_server.close();
		};
	}, []);

	// Check if the rover is connected
	React.useEffect(() => {
		if (ros) {
			let num_checks = 0;
			const check = setInterval(() => {
				ros.getNodes(
					(nodes) => {
						if (nodes.includes("/ROVER")) {
							setConnected(true);
							clearInterval(check);
						} else {
							num_checks++;

							setConnected(false);

							if (num_checks % 20 === 0) {
								// Show a snackbar
								setConnected(false);
							}
						}
					},
					(error) => {
						// Show a snackbar
						console.error(error);
						clearInterval(check);
					}
				);
			}, 1000);
		}
	}, [ros]);

	return [ros, connected] as const;
}

export default useRosBridge;
