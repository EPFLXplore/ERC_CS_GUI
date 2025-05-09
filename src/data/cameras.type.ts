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

enum CameraRover {
    RIGHT = "Right",
    LEFT = "Left",
    DRILL = "Drill",
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

const depth_cameras = {
    "Handling Device Depth": {
        name: "Depth HD",
        camera: "Gripper",
        subsystem_to_check: SubSystems.HANDLING_DEVICE
    },
    "Navigation Depth": {
        name: "Depth NAV",
        camera: "Front",
        subsystem_to_check: SubSystems.NAGIVATION
    }
}

const allCameras = {
    "Rover": {
        enum: CameraRover,
        subsystem_to_check: SubSystems.ROVER
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
export {CameraRover, CameraHD, CameraNAV, CameraSC, depth_cameras, allCameras}