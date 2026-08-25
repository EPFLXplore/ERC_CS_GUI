import * as ROSLIB from "roslib";
import { AlertColor } from "@mui/material";
import { Topics } from "../data/topics.type";

/*
Author: Arno Laurie
ERC: 2026
Description: EtherCAT recovery for the HD motor lifecycle node. When the EtherCAT bus drops, the
MotorController node has to be walked back through cleanup and then configure to re-scan the slaves.
These are the same two transitions as `ros2 lifecycle set /MotorController cleanup|configure`:
lifecycle_msgs/srv/ChangeState is exactly what the CLI calls under the hood, so the buttons go
straight over rosbridge instead of shelling into the HD Jetson.
*/

/** lifecycle_msgs/msg/Transition constants. */
const TRANSITION_CONFIGURE = 1;
const TRANSITION_CLEANUP = 2;

type Transition = "cleanup" | "configure";

const TRANSITION_IDS: Record<Transition, number> = {
	configure: TRANSITION_CONFIGURE,
	cleanup: TRANSITION_CLEANUP,
};

const setMotorControllerState = (
	ros: ROSLIB.Ros | null,
	transition: Transition,
	snackBar: (severity: AlertColor, message: string) => void,
) => {
	if (!ros) {
		snackBar("error", "ROS connection not available");
		return;
	}

	const changeState = new ROSLIB.Service({
		ros: ros,
		name: Topics.HD_MOTOR_CONTROLLER_CHANGE_STATE,
		serviceType: "lifecycle_msgs/srv/ChangeState",
	});

	changeState.callService(
		{ transition: { id: TRANSITION_IDS[transition], label: transition } },
		(res) => {
			if ((res as any)["success"]) {
				snackBar("success", `MotorController ${transition} done`);
			} else {
				// The node refuses a transition that is illegal from its current state, e.g.
				// configure while still active, or cleanup while unconfigured.
				snackBar("error", `MotorController ${transition} refused (wrong lifecycle state?)`);
			}
		},
		(err) => {
			snackBar("error", `MotorController ${transition} failed: ${err}`);
		}
	);
};

const cleanupMotorController = (
	ros: ROSLIB.Ros | null,
	snackBar: (severity: AlertColor, message: string) => void,
) => setMotorControllerState(ros, "cleanup", snackBar);

const configureMotorController = (
	ros: ROSLIB.Ros | null,
	snackBar: (severity: AlertColor, message: string) => void,
) => setMotorControllerState(ros, "configure", snackBar);

export { cleanupMotorController, configureMotorController, setMotorControllerState };
