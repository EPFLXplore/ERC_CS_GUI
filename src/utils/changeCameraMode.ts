import * as ROSLIB from "roslib";
import SubSystems from "../data/subsystems.type";
import { AlertColor } from "@mui/material";


const startCamModeService = ( 
    subsystem: string,
    activate: boolean,
    ros: ROSLIB.Ros | null,
    snackBar: (severity: AlertColor, message: string) => void,
) => {

    if (ros) {

        let request;

        let changeModeSystem = null
        // If HD, change mode 
        if (subsystem === SubSystems.HANDLING_DEVICE) {
            changeModeSystem = new ROSLIB.Service({
                ros: ros,
                name: "/CS/ChangeModeHDCamera",
                serviceType: "std_srvs/srv/SetBool",
            });

            request = {
                data: activate
            }
        }

        if (changeModeSystem != null) {

            changeModeSystem.callService(
                request,
                (res) => {
                    // @ts-ignore
                    if (res["success"] !== 0) {
                        snackBar("error", "Error from request (NOT ROS): " +
                            // @ts-ignore
                            res["error_message"]);
                    } else {
                        // @ts-ignore
                        console.log("error")
                    }
                },
                (err) => {
                    snackBar("error", "Error from ROS while request service: " + err);
                }
            );
        }
    }

}

export { startCamModeService }