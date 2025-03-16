import * as ROSLIB from "roslib";
import SubSystems from "../data/subsystems.type";
import States from "../data/states.type";
import { AlertColor } from "@mui/material";
import { Topics } from "../data/topics.type";

const requestChangeMode = (
	ros: ROSLIB.Ros | null,
	isCamera: boolean,
	request_mode: any,
	snackBar: (severity: AlertColor, message: string) => void,
) => {

	let request;

	if(!isCamera) {
		let system = request_mode.system;
		let mode = request_mode.mode;

		if (system === SubSystems.NAGIVATION) {
			request = {
				system: 0,
				mode: mode === States.OFF ? 0 : mode === States.ACKERMANN ? 
				1 : mode === States.OMNI_DIRECTIONAL ? 2 : 3,
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
						? 2 // compliance mode, will be changed afterwards!!
						: 3,
			};
		} else if (system === SubSystems.DRILL) {
			request = {
				system: 2,
				mode: mode === States.OFF ? 0 : 1,
			};
		}
	} else {

		let subsystem = request_mode.subsystem;
		let mode = request_mode.index

		if(subsystem == SubSystems.CS) {
			request = {
				subsystem: subsystem,
				camera_name: mode,
				activate: request_mode.activate
			};

		} else if(subsystem == SubSystems.HANDLING_DEVICE) {
			request = {
				subsystem: subsystem,
				camera_name: mode,
				activate: request_mode.activate
			};
		} else if(subsystem == SubSystems.NAGIVATION) {
			request = {
				subsystem: subsystem,
				camera_name: mode, 
				activate: request_mode.activate
			};
		} else if(subsystem == SubSystems.SCIENCE) {
			request = {
				subsystem: subsystem,
				camera_name: mode,
				activate: request_mode.activate
			};
		}
	}

	if (ros) {
		let changeModeSystem = null
		if(isCamera) {

			changeModeSystem = new ROSLIB.Service({
				ros: ros,
				name: Topics.CHANGE_MODE_CAMERA_SRV,
				serviceType: "custom_msg/srv/ChangeModeCamera",
			});
		} else {

			changeModeSystem = new ROSLIB.Service({
				ros: ros,
				name: Topics.CHANGE_MODE_SUBSYSTEM,
				serviceType: "custom_msg/srv/ChangeModeSystem",
			});
		}

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
			},
			(err) => {
				snackBar("error", "Error from ROS while request service: " + err);
			}
		);
		
	}
};

export default requestChangeMode;
