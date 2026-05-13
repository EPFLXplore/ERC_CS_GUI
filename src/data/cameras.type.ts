/*
Author: Giovanni Ranieri
Year: 2024
Description: Type for Cameras and their states
*/

import SubSystems from "./subsystems.type";

type CameraElement = {
  name: string;
  status: boolean;
  node: boolean;
  data_rate: string
};

type CameraType = { [key: string]: null | CameraElement[] };

enum CameraRover {
    UP = "Up"
}

enum CameraHD {
    GRIPPER = "Gripper",
}

enum CameraNAV {
    UP_BACK = "UpBack",
    UP_LEFT = "UpLeft",
    UP_RIGHT = "UpRight",
    FRONT = "Front",
}

/** NAV RGB labels → stream index (services `/NAV/req_camera_nav_*`, bw `/NAV/bw_camera_nav_*`). */
const NAV_CAMERA_NAV_INDEX: Record<string, number> = {
    UpBack: 0,
    UpLeft: 2,
    UpRight: 1,
    Front: 3,
};

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
        camera: "UpRight",
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

const CAMERA_FEED_TOPICS: Record<string, Record<string, string>> = {
    [SubSystems.ROVER]: {
        Up: "/ROVER/feed_camera_cs_0",
    },
    [SubSystems.HANDLING_DEVICE]: {
        Gripper: "/ROVER/feed_camera_hd_0",
    },
    [SubSystems.NAGIVATION]: {
        UpBack: "/CS/feed_camera_nav_0",
        UpLeft: "/CS/feed_camera_nav_2",
        UpRight: "/CS/feed_camera_nav_1",
        Front: "/CS/feed_camera_nav_3",
    },
};


export type {CameraElement, CameraType}
export {CameraRover, CameraHD, CameraNAV, CameraSC, depth_cameras, allCameras, NAV_CAMERA_NAV_INDEX, CAMERA_FEED_TOPICS}