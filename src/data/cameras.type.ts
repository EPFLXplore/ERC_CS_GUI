/*
Author: Giovanni Ranieri
Year: 2024
Description: Type for Cameras and their states
*/

import SubSystems from "./subsystems.type";

interface CameraElement {
	name: string;
	states: {}
}

type CameraType = { [key: string]: null | object };

enum CameraCS {
    RIGHT = "Right",
    LEFT = "Left",
    BEHIND = "Behind"
}

enum CameraHD {
    GRIPPER = "Gripper",
}

enum CameraNAV {
    UP1 = "Up1",
    UP2 = "Up2",
    FRONT = "Front",
}

enum CameraSC {
    MAIN = "Main",
}

enum CameraHD_RGB
{
    RGB = "RGB/RGBD",
}

const allCameras = {
    "Control Station": {
        enum: CameraCS,
        subsystem_to_check: SubSystems.CS
    },
    "Handling Device": {
        enum: CameraHD,
        subsystem_to_check: SubSystems.HANDLING_DEVICE
    },
    "Navigation": {
        enum: CameraNAV,
        subsystem_to_check: SubSystems.NAGIVATION
    }
}


export type {CameraElement, CameraType}
export {CameraCS, CameraHD, CameraNAV, CameraSC, CameraHD_RGB, allCameras}