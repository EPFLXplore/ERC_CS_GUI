import * as ROSLIB from "roslib";
import { AlertColor } from "@mui/material";
import { Topics } from "../data/topics.type";

const resetDrillHome = (
	ros: ROSLIB.Ros | null,
	snackBar: (severity: AlertColor, message: string) => void
) => {
	if (!ros) {
		snackBar("error", "ROS connection not available");
		return;
	}

	const reset = new ROSLIB.Service({
		ros,
		name: Topics.DRILL_RESET_HOME,
		serviceType: "std_srvs/srv/SetBool",
	});

	reset.callService(
		{ data: true },
		(res) => {
			if ((res as any).success) {
				snackBar("success", (res as any).message || "Drill reset home requested");
			} else {
				snackBar("error", (res as any).message || "Drill reset home rejected");
			}
		},
		(err) => {
			snackBar("error", "Error: " + err);
		}
	);
};

export { resetDrillHome };
