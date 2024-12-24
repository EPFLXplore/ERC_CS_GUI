import { AlertColor } from "@mui/material";
import SubSystems from "../data/subsystems.type"
import * as ROSLIB from "roslib";
import { Topics } from "../data/topics.type";

/*
Author: Giovanni Ranieri
ERC: 2024-25
Description: Functions for reseting the fault states of motors and setting the current place as home
position for the wheels. They bypass the Orchestrator for simplicity (they communicate directly 
with the motor lifecycle node of NAV)
*/

const resetFaults = (ros: ROSLIB.Ros | null, subsystem: string,
    snackBar: (severity: AlertColor, message: string) => void,
) => {
    switch(subsystem) {
        case SubSystems.NAGIVATION:
            if(ros) {
                const reset = new ROSLIB.Service({
                    ros: ros,
                    name: Topics.RESET_NAVIGATION_MOTORS,
                    serviceType: "std_srvs/srv/SetBool",
                });

                let request = {
                    data: true
                }

                reset.callService(
                    request,
                    (res) => {
                        // @ts-ignore
                        if (!res["success"]) {
                            snackBar("error","Error from request (NOT ROS): " + 
                                // @ts-ignore
                                res["message"]);
                            } else {
                                // @ts-ignore
                                snackBar("success", 
                                // @ts-ignore
                                res["message"]);
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
                    name: Topics.RESET_HOME_NAVIGATION_MOTORS,
                    serviceType: "std_srvs/srv/SetBool",
                });

                let request = {
                    data: true
                }

                reset.callService(
                    request,
                    (res) => {
                        // @ts-ignore
                        if (!res["success"]) {
                            snackBar("error","Error from request (NOT ROS): " + 
                                // @ts-ignore
                                res["message"]);
                            } else {
                                // @ts-ignore
                                snackBar("success", 
                                    // @ts-ignore
                                    res["message"]);
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