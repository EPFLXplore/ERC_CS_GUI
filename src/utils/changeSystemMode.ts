import * as ROSLIB from "roslib";
import { Service } from "../data/service.type";
import SubSystems from "../data/subsystems.type";
import States from "../data/states.type";
import { AlertColor } from "@mui/material";
import { Log } from "../hooks/roverLogHooks";

export enum LogLevel {
	DATA = "data",
	INFO = "info",
	WARNING = "warning",
	ERROR = "error",
};

const requestChangeMode = (
	ros: ROSLIB.Ros | null,
	system: string,
	mode: string,
	ser: Service,
	sendingRequest: (b: boolean) => void,
	snackBar: (severity: AlertColor, message: string) => void,
) => {
	let request;

	if (system === SubSystems.NAGIVATION) {
		request = {
			system: 0,
			mode: mode === States.OFF ? 0 : mode === States.MANUAL ? 1 : 2,
		};
	} else if (system === SubSystems.HANDLING_DEVICE) {
		request = {
			system: 1,
			mode:
				mode === States.OFF
					? 0
					: mode === States.MANUAL_DIRECT
					? 1
					: mode === States.MANUAL_INVERSE
					? 2
					: 3,
		};
	} else if (system === SubSystems.CAMERA) {
		request = {
			system: 2,
			mode: mode === States.OFF ? 0 : 1,
		};
	} else if (system === SubSystems.DRILL) {
		request = {
			system: 3,
			mode: mode === States.OFF ? 0 : 1,
		};
	}

	if (ros) {
		const changeModeSystem = new ROSLIB.Service({
			ros: ros,
			name: "/CS/ChangeModeSystem",
			serviceType: "custom_msg/srv/ChangeModeSystem",
		});

		sendingRequest(true);
		changeModeSystem.callService(
			request,
			(res) => {
				// @ts-ignore
				if (res["error_type"] != 0) {
					snackBar("error","Error from request to change service (not ROS): " + 
						// @ts-ignore
						res["error_message"]);
					} else {
						console.log("RECEIVE RESPONSE SERVICE DRILL " + 
							// @ts-ignore
							res["error_message"])
					}
				sendingRequest(false);
			},
			(err) => {
				snackBar("error", "Error from ROS while request service: " + err);
				sendingRequest(false);
			}
		);
		
	}
};

export default requestChangeMode;
