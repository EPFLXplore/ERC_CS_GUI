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



export type {CameraElement, CameraType}
export {CameraCS, CameraHD, CameraNAV, CameraSC}