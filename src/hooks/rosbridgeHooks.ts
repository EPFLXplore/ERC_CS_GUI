import { AlertColor } from "@mui/material";
import React from "react";
import { useState, useEffect } from "react";
import * as ROSLIB from "roslib";

/*
Author: Ugo Balducci and Giovanni Ranieri
Year: 2024
Description: Hooks managing the rosbridge server. Please check the documentation on Notion to understand
what is this server. 
*/

function useRosBridge(snackBar: (sev: AlertColor, mes: string) => void) {
	const [ros, setRos] = useState<ROSLIB.Ros | null>(null);
	const [connected, setConnected] = useState(false);
	// const [hdConfirmation, setHDConfirmation] = useState<((confirm: boolean) => void) | null>(null);

	// At initialization, we connect to port 9090. You have different modes:
	// 1. Launching the server locally:           use => ros_server.connect("ws://169.254.55.178:9090");
	// 2. Launching the server on another device: use => ros_server.connect("ws://IP_SERVER:9090");
	useEffect(() => {
		const ros_server = new ROSLIB.Ros({});
		ros_server.connect("ws://169.254.55.178:9090");

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
	

	// Check if the Rover Node is connected. This is important because if it is not activated,
	// then we can't recieve any data
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
			}, 4000);
		}
	}, [ros]);

	// useEffect(() => {
	// 	if (!ros) return;

	// 	// The Service object does double duty for both calling and advertising services
	// 	var askUserConfirmation = new ROSLIB.Service({
	// 		ros: ros,
	// 		name: Topics.REQUEST_HUMAIN_VERIFICATION_HD,
	// 		serviceType: "std_srvs/Trigger",
	// 	});

	// 	// Use the advertise() method to indicate that we want to provide this service
	// 	askUserConfirmation.advertiseAsync(async (request) => {
	// 		const result = await new Promise<boolean>((resolve, reject) => {
	// 			setHDConfirmation(() => (confirm: boolean) => {
	// 				resolve(confirm)
	// 				setHDConfirmation(null);
	// 			});
	// 		});
	// 		return {
	// 			success: result,
	// 		};
	// 	});
	// }, [ros]);

	return [ros, connected] as const;
}

export default useRosBridge;
