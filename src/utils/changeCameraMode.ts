import * as ROSLIB from "roslib";
import SubSystems from "../data/subsystems.type";
import { AlertColor } from "@mui/material";
import { Topics } from "../data/topics.type";


/**
 * Change RGB camera mode for a subsystem
 * @param subsystem Which subsystem's cameras (NAV or HD)
 * @param activate true to enable RGB mode, false to disable
 * @param ros ROS connection
 * @param snackBar Callback to show notifications
 */
const startCamModeService = ( 
    subsystem: string,
    activate: boolean,
    ros: ROSLIB.Ros | null,
    snackBar: (severity: AlertColor, message: string) => void,
) => {
    if (!ros) {
        snackBar("error", "ROS connection not available");
        return;
    }

    let serviceName: string;
    let serviceType: string = "std_srvs/srv/SetBool";

    // Determine which subsystem's camera service to call
    if (subsystem === SubSystems.HANDLING_DEVICE) {
        serviceName = Topics.CHANGE_MODE_RGB_HD;
    } else if (subsystem === SubSystems.NAGIVATION) {
        serviceName = Topics.CHANGE_MODE_RGB_NAV;
    } else {
        snackBar("error", `Unknown subsystem for camera: ${subsystem}`);
        return;
    }

    const changeModeSystem = new ROSLIB.Service({
        ros: ros,
        name: serviceName,
        serviceType: serviceType,
    });

    const request = {
        data: activate
    };

    changeModeSystem.callService(
        request,
        (res) => {
            if ((res as any)["success"]) {
                snackBar("success", `Camera RGB mode ${activate ? 'enabled' : 'disabled'} for ${subsystem}`);
            } else {
                snackBar("error", `Failed to change camera mode: ${(res as any)["message"] || "Unknown error"}`);
            }
        },
        (err) => {
            snackBar("error", "ROS service error: " + err);
        }
    );
}

export { startCamModeService }