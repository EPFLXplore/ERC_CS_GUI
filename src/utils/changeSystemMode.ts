import * as ROSLIB from "roslib";
import SubSystems from "../data/subsystems.type";
import States from "../data/states.type";
import { AlertColor } from "@mui/material";
import { CameraCS, CameraHD, CameraNAV, CameraSC } from "../data/cameras.type";

export enum LogLevel {
	DATA = "data",
	INFO = "info",
	WARNING = "warning",
	ERROR = "error",
};

const requestChangeMode = (
	ros: ROSLIB.Ros | null,
	isCamera: boolean,
	request_mode: any,
	sendingRequest: (b: boolean) => void,
	snackBar: (severity: AlertColor, message: string) => void,
) => {

	let request;

	if(!isCamera) {
		let system = request_mode.system;
		let mode = request_mode.mode;

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
		} else if (system === SubSystems.DRILL) {
			request = {
				system: 3,
				mode: mode === States.OFF ? 0 : 1,
			};
		}
	} else {

		let subsystem = request_mode.subsystem;
		let mode = request_mode.index

		if(subsystem == SubSystems.CS) {
			request = {
				subsystem: 2,
				mode: mode === CameraCS.BEHIND ? 0 : 
					mode === CameraCS.LEFT ? 1 : mode === CameraCS.RIGHT ? 2 : 3,
				activate: request_mode.activate
			};

		} else if(subsystem == SubSystems.HANDLING_DEVICE) {
			request = {
				subsystem: 1,
				mode: mode === CameraHD.GRIPPER ? 0 : 1,
				activate: request_mode.activate
			};
		} else if(subsystem == SubSystems.NAGIVATION) {
			request = {
				subsystem: 0,
				mode: mode === CameraNAV.UP1 ? 0 : mode === CameraNAV.UP2 ? 1 : 
					mode === CameraNAV.FRONT ? 2 : 3,  
				activate: request_mode.activate
			};
		} else if(subsystem == SubSystems.SCIENCE) {
			request = {
				subsystem: 3,
				mode: 0,
				activate: request_mode.activate
			};
		}
	}

	if (ros) {
		let changeModeSystem = null
		if(isCamera) {

			changeModeSystem = new ROSLIB.Service({
				ros: ros,
				name: "/CS/ChangeModeCamera",
				serviceType: "custom_msg/srv/ChangeModeCamera",
			});
		} else {

			changeModeSystem = new ROSLIB.Service({
				ros: ros,
				name: "/CS/ChangeModeSystem",
				serviceType: "custom_msg/srv/ChangeModeSystem",
			});
		}

		sendingRequest(true);
		changeModeSystem.callService(
			request,
			(res) => {
				// @ts-ignore
				if (res["error_type"] != 0) {
					snackBar("error","Error from request (NOT ROS): " + 
						// @ts-ignore
						res["error_message"]);
					} else {
						// @ts-ignore
						console.log(res["error_message"])
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
