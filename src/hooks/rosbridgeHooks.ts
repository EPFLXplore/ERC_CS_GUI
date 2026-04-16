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
	// 1. Launching the server locally:           use => ros_server.connect("ws://169.254.55.251:9090");
	// 2. Launching the server on another device: use => ros_server.connect("ws://IP_SERVER:9090");
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
	

	// Check if subsystem interface nodes are connected
	// With direct subsystem communication, we check for NAV, HD, DRILL, EL nodes instead of ROVER
	React.useEffect(() => {
		if (ros) {
			let num_checks = 0;
			const check = setInterval(() => {
				ros.getNodes(
					(nodes) => {
						console.log("All ROS nodes detected:", nodes);

						const normalizedNodes = nodes.map((nodeName) => nodeName.toLowerCase());
						
						// Check if essential subsystem nodes are running
						// Nodes might be named differently, so check for common patterns
						const hasNAV = normalizedNodes.some(n => 
							n.includes("/nav") ||
							n.includes("navigation")
						);
						const hasHD = normalizedNodes.some(n => 
							n.includes("/hd") ||
							n.includes("handling")
						);
						const hasDRILL = normalizedNodes.some(n => 
							n.includes("/drill") ||
							n.includes("drill")
						);
						const hasEL = normalizedNodes.some(n => 
							n.includes("/el") ||
							n.includes("electronics") ||
							n.includes("avionics")
						);

						const hasRosapiInfra = normalizedNodes.some((n) =>
							n.includes("rosapi") || n.includes("rosbridge")
						);

						// For development: consider connected if rosbridge is working
						// In production, you'd want at least one subsystem
						const hasAnySubsystem = hasNAV || hasHD || hasDRILL || hasEL;
						const hasRosbridgeNodes = nodes.length > 0;

						if (hasAnySubsystem) {
							setConnected(true);
							
							// Log which subsystems are available
							console.log("Subsystems online:", {
								NAV: hasNAV,
								HD: hasHD,
								DRILL: hasDRILL,
								EL: hasEL
							});
							
							clearInterval(check);
						} else if (hasRosapiInfra) {
							// rosapi/rosbridge only is still enough for CS features such as parameter editing.
							setConnected(true);
							clearInterval(check);
						} else if (hasRosbridgeNodes) {
							// Rosbridge is working but no subsystem nodes yet
							num_checks++;
							setConnected(true);
							console.log("Rosbridge connected, waiting for subsystem nodes...");
							
							// Stop checking after a while to avoid spamming
							if (num_checks > 5) {
								clearInterval(check);
							}
						} else {
							num_checks++;
							setConnected(false);

							if (num_checks % 20 === 0) {
								snackBar("warning", "No subsystem nodes detected. Waiting for NAV/HD/DRILL/EL...");
							}
						}
					},
					(error) => {
						console.error("Error checking ROS nodes:", error);
						snackBar("error", "Failed to check ROS nodes");
						clearInterval(check);
					}
				);
			}, 4000);

			return () => clearInterval(check);
		}
	}, [ros, snackBar]);

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
