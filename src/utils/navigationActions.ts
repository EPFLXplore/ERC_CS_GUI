import * as ROSLIB from "roslib";
import { AlertColor } from "@mui/material";
import SubSystems from "../data/subsystems.type";
import { Topics } from "../data/topics.type";

/*
Author: Giovanni Ranieri, modified by Arno Laurie
ERC: 2025
Description: Functions for reseting the fault states of motors and setting the current place as home
position for the wheels. They bypass the Orchestrator for simplicity (they communicate directly 
with the motor lifecycle node of NAV)
*/


const resetFaults = (
    ros: ROSLIB.Ros | null,
    subsystem: string,
    snackBar: (severity: AlertColor, message: string) => void,
) => {
    if (!ros) {
        snackBar("error", "ROS connection not available");
        return;
    }

    // Only NAV subsystem has reset motors for now
    if (subsystem === SubSystems.NAGIVATION) {
        const reset = new ROSLIB.Service({
            ros: ros,
            name: Topics.NAV_RESET_MOTORS,
            serviceType: "std_srvs/srv/SetBool",
        });

        reset.callService(
            { data: true },
            (res) => {
                if ((res as any)["success"]) {
                    snackBar("success", (res as any)["message"]);
                } else {
                    snackBar("error", (res as any)["message"]);
                }
            },
            (err) => {
                snackBar("error", "Error: " + err);
            }
        );
    }
};

const resetHome = (
    ros: ROSLIB.Ros | null,
    subsystem: string,
    snackBar: (severity: AlertColor, message: string) => void,
) => {
    if (!ros) {
        snackBar("error", "ROS connection not available");
        return;
    }

    // Only NAV subsystem has reset home for now
    if (subsystem === SubSystems.NAGIVATION) {
        const reset = new ROSLIB.Service({
            ros: ros,
            name: Topics.NAV_RESET_HOME,
            serviceType: "std_srvs/srv/SetBool",
        });

        reset.callService(
            { data: true },
            (res) => {
                if ((res as any)["success"]) {
                    snackBar("success", (res as any)["message"]);
                } else {
                    snackBar("error", (res as any)["message"]);
                }
            },
            (err) => {
                snackBar("error", "Error: " + err);
            }
        );
    }
};

const requestQrCodeScan = (
    ros: ROSLIB.Ros | null,
    snackBar: (severity: AlertColor, message: string) => void,
    onSuccess: (message: string) => void,
) => {
    if (!ros) {
        snackBar("error", "ROS connection not available");
        return;
    }

    const qrCodeService = new ROSLIB.Service({
        ros,
        name: Topics.NAV_QR_CODE_REQUEST,
        serviceType: "std_srvs/srv/Trigger",
    });

    qrCodeService.callService(
        {},
        (res) => {
            if ((res as any)["success"]) {
                onSuccess((res as any)["message"] ?? "");
                snackBar("success", "QR code scan completed");
            } else {
                snackBar("error", (res as any)["message"] ?? "QR code scan failed");
            }
        },
        (err) => {
            snackBar("error", "Error: " + err);
        },
    );
};

export { resetFaults, resetHome, requestQrCodeScan };