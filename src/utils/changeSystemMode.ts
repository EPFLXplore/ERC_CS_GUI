import * as ROSLIB from "roslib";
import { Service } from "../data/service.type";
import SubSystems from "../data/subsystems.type";
import States from "../data/states.type";
import { AlertColor } from "@mui/material";

const requestChangeMode = (
	ros: ROSLIB.Ros | null,
	system: string,
	mode: string,
	ser: Service,
	sendingRequest: (b: boolean) => void,
	snackBar: (severity: AlertColor, message: string) => void
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
			name: "/Rover/ChangeModeSystem",
			serviceType: "custom_msg/srv/ChangeModeSystem",
		});

		sendingRequest(true);
		// TODO: put the color UI when sending a request!
		changeModeSystem.callService(
			request,
			(res) => {
				successfullChange(res, ser, snackBar)
				sendingRequest(false)
			},
			(err) => {
				failChange(err, snackBar)
				sendingRequest(false);
			}
		);
	}
};

const successfullChange = (
	result: any,
	ser: Service,
	snackBar: (severity: AlertColor, message: string) => void
) => {
	if (result["error_type"] === 0) {
		// no error has occured
		ser.state = JSON.parse(result["systems_state"])[ser.name];
		console.log("service changed in change mode system")
		snackBar("success", "Successfully changed service " + ser.name + " in " + ser.state);
	} else {
		snackBar(
			"error",
			"Error from request to change service (not ROS): " + result["error_message"]
		);
	}
};

const failChange = (error: string, snackBar: (severity: AlertColor, message: string) => void) => {
	snackBar("error", "Error from ROS while request service: " + error);
};

export default requestChangeMode;
