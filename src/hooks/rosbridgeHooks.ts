import React from "react";
import { useState, useEffect } from "react";
import ROSLIB from "roslib";

function useRosBridge(snackBar: (sev: string, mes: string) => void) {
	const [ros, setRos] = useState<ROSLIB.Ros | null>(null);

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

	return [ros] as const;
}

export default useRosBridge;
