import { AlertColor } from "@mui/material";
import React from "react";
import { useState, useEffect, useRef } from "react";
import * as ROSLIB from "roslib";

/*
Author: Ugo Balducci and Giovanni Ranieri
Year: 2024
Description: Hooks managing the rosbridge server. Please check the documentation on Notion to understand
what is this server. 
*/

const getRosbridgeUrl = () => {
	const configuredUrl = process.env.REACT_APP_ROSBRIDGE_URL?.trim();
	if (configuredUrl) {
		return configuredUrl;
	}

	const protocol = window.location.protocol === "https:" ? "wss" : "ws";
	const host = window.location.hostname || "localhost";
	return `${protocol}://${host}:9090`;
};

const INITIAL_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_DELAY_MS = 5000;

/** Nav2 / navigation stack node name fragments (ROS 2 graph often has no literal "/nav" node). */
function navPresentInNodeNames(normalized: string[]): boolean {
	return normalized.some(
		(n) =>
			n.includes("/nav") ||
			n.includes("navigation") ||
			n.includes("nav2") ||
			n.includes("velocity_smoother") ||
			n.includes("waypoint_follower") ||
			n.includes("bt_navigator") ||
			n.includes("controller_server") ||
			n.includes("smoother_server")
	);
}

function navPresentInTopicNames(topicLower: string[]): boolean {
	return topicLower.some(
		(t) =>
			t.includes("/nav/state") ||
			t.includes("/nav/") ||
			t.includes("velocity_smoother") ||
			t.includes("waypoint_follower") ||
			t.includes("bt_navigator") ||
			t.includes("controller_server") ||
			t.includes("smoother_server") ||
			t.includes("/unsmoothed_plan") ||
			t.includes("/wheel_odom")
	);
}

function useRosBridge(snackBar: (sev: AlertColor, mes: string) => void) {
	const [ros, setRos] = useState<ROSLIB.Ros | null>(null);
	const [connected, setConnected] = useState(false);
	const snackBarRef = useRef(snackBar);
	snackBarRef.current = snackBar;

	useEffect(() => {
		const rosbridgeUrl = getRosbridgeUrl();
		const ros_server = new ROSLIB.Ros({});
		let disposed = false;
		let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
		let reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;
		let hasConnectedOnce = false;

		const clearReconnectTimer = () => {
			if (reconnectTimer) {
				clearTimeout(reconnectTimer);
				reconnectTimer = null;
			}
		};

		const scheduleReconnect = () => {
			if (disposed || reconnectTimer) return;
			reconnectTimer = setTimeout(() => {
				reconnectTimer = null;
				if (disposed || ros_server.isConnected) return;
				console.log(`Reconnecting to ROS server at ${rosbridgeUrl}`);
				ros_server.connect(rosbridgeUrl);
				reconnectDelayMs = Math.min(reconnectDelayMs * 2, MAX_RECONNECT_DELAY_MS);
			}, reconnectDelayMs);
		};

		ros_server.connect(rosbridgeUrl);

		ros_server.on("error", function (error) {
			snackBarRef.current("error", `Failed to connect to ROS server (${rosbridgeUrl}).`);
			console.log(error);
			setRos(null);
			setConnected(false);
			scheduleReconnect();
		});

		ros_server.on("connection", function () {
			console.log("Connected to ROS server at", rosbridgeUrl);
			clearReconnectTimer();
			reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;
			if (!hasConnectedOnce) {
				snackBarRef.current("success", `Connected to ROS server (${rosbridgeUrl}).`);
				hasConnectedOnce = true;
			} else {
				snackBarRef.current("success", `Reconnected to ROS server (${rosbridgeUrl}).`);
			}
			setRos(ros_server);
			// WebSocket session is enough for topics/services; do not gate UI on rosapi getNodes.
			setConnected(true);
		});

		ros_server.on("close", function () {
			console.log("Connection closed");
			setRos(null);
			setConnected(false);
			scheduleReconnect();
		});

		return () => {
			disposed = true;
			clearReconnectTimer();
			ros_server.removeAllListeners();
			ros_server.close();
		};
	}, []);

	// Optional: detect subsystem-style nodes/topics for logging (getNodes can fail on some rosapi builds).
	React.useEffect(() => {
		if (!ros) return;

		let num_checks = 0;
		let warnedEmpty = false;

		const finishSubsystemLog = (
			source: string,
			hasNAV: boolean,
			hasHD: boolean,
			hasDRILL: boolean,
			hasEL: boolean
		) => {
			console.log(`[rosbridge] ${source} — subsystems:`, {
				NAV: hasNAV,
				HD: hasHD,
				DRILL: hasDRILL,
				EL: hasEL,
			});
		};

		const check = setInterval(() => {
			ros.getNodes(
				(rawNodes) => {
					const nodes = Array.isArray(rawNodes) ? rawNodes.map(String) : [];
					console.log("All ROS nodes detected:", nodes);

					const normalizedNodes = nodes.map((nodeName) => nodeName.toLowerCase());

					const hasNAV = navPresentInNodeNames(normalizedNodes);
					const hasHD = normalizedNodes.some(
						(n) => n.includes("/hd") || n.includes("handling")
					);
					const hasDRILL = normalizedNodes.some(
						(n) => n.includes("/drill") || n.includes("drill")
					);
					const hasEL = normalizedNodes.some(
						(n) =>
							n.includes("/el") ||
							n.includes("electronics") ||
							n.includes("avionics")
					);

					const hasRosapiInfra = normalizedNodes.some(
						(n) => n.includes("rosapi") || n.includes("rosbridge")
					);

					const hasAnySubsystem = hasNAV || hasHD || hasDRILL || hasEL;
					const hasRosbridgeNodes = nodes.length > 0;

					if (hasAnySubsystem) {
						finishSubsystemLog("getNodes", hasNAV, hasHD, hasDRILL, hasEL);
						clearInterval(check);
					} else if (hasRosapiInfra) {
						clearInterval(check);
					} else if (hasRosbridgeNodes) {
						num_checks++;
						console.log("Rosbridge connected, waiting for subsystem-style node names...");
						if (num_checks > 5) {
							clearInterval(check);
						}
					} else {
						num_checks++;
						if (!warnedEmpty && num_checks >= 3) {
							warnedEmpty = true;
							snackBar(
								"warning",
								"No subsystem nodes matched heuristics yet (Nav2 may still be running — see topic list)."
							);
						}
						if (num_checks > 8) {
							clearInterval(check);
						}
					}
				},
				(err) => {
					console.warn("[rosbridge] getNodes failed (rosapi); trying getTopics:", err);
					ros.getTopics(
						(res) => {
							const topics = Array.isArray(res?.topics) ? res.topics.map(String) : [];
							const tl = topics.map((x) => x.toLowerCase());
							const hasNAV = navPresentInTopicNames(tl);
							const hasHD = tl.some((t) => t.includes("/hd/") || t.includes("handling"));
							const hasDRILL = tl.some((t) => t.includes("/drill") || t.includes("drill"));
							const hasEL = tl.some(
								(t) => t.includes("/el/") || t.includes("electronics")
							);
							if (hasNAV || hasHD || hasDRILL || hasEL) {
								finishSubsystemLog("getTopics", hasNAV, hasHD, hasDRILL, hasEL);
							} else {
								console.log("[rosbridge] getTopics: no subsystem heuristics matched.");
							}
							clearInterval(check);
						},
						(e2) => {
							console.warn("[rosbridge] getTopics also failed:", e2);
							clearInterval(check);
						}
					);
				}
			);
		}, 4000);

		return () => clearInterval(check);
	}, [ros, snackBar]);

	return [ros, connected] as const;
}

export default useRosBridge;
