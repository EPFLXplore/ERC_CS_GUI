import { AlertColor } from "@mui/material";
import SubSystems from "../data/subsystems.type"
import * as ROSLIB from "roslib";

const resetFaults = (ros: ROSLIB.Ros | null, subsystem: string,
    snackBar: (severity: AlertColor, message: string) => void,
) => {
    switch(subsystem) {
        case SubSystems.NAGIVATION:
            if(ros) {
                const reset = new ROSLIB.Service({
                    ros: ros,
                    name: "/CS/ResetNavMotors",
                    serviceType: "std_srvs/srv/SetBool",
                });

                let request = {
                    data: true
                }

                reset.callService(
                    request,
                    (res) => {
                        // @ts-ignore
                        if (res["success"] != 0) {
                            snackBar("error","Error from request (NOT ROS): " + 
                                // @ts-ignore
                                res["message"]);
                            } else {
                                // @ts-ignore
                                console.log(res["message"])
                            }
                    },
                    (err) => {
                        snackBar("error", "Error from ROS while request service: " + err);
                    }
                );
            }
            break
    }
}

const resetHome = (ros: ROSLIB.Ros | null, subsystem: string,
    snackBar: (severity: AlertColor, message: string) => void,
) => {
    switch(subsystem) {
        case SubSystems.NAGIVATION:
            if(ros) {
                const reset = new ROSLIB.Service({
                    ros: ros,
                    name: "/CS/ResetHomeNavMotors",
                    serviceType: "std_srvs/srv/SetBool",
                });

                let request = {
                    data: true
                }

                reset.callService(
                    request,
                    (res) => {
                        // @ts-ignore
                        if (res["success"] != 0) {
                            snackBar("error","Error from request (NOT ROS): " + 
                                // @ts-ignore
                                res["message"]);
                            } else {
                                // @ts-ignore
                                console.log(res["message"])
                            }
                    },
                    (err) => {
                        snackBar("error", "Error from ROS while request service: " + err);
                    }
                );
            }
            break
    }
}

export {resetFaults, resetHome}