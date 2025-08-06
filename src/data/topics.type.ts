export enum Topics {

    // Topic
    NAVIGATION_GAMEPAD_PUBLISHER = "/CS/GamepadCmdsNavigation",
    HANDLING_DEVICE_GAMEPAD_PUBLISHER = "/CS/GamepadCmdsHandlingDevice",
    CHANGE_ANGLE_FRONT_CAMERA = "/CS/ChangeAngleFrontCamera",
    CHANGE_SPEED_ROVER = "/CS/ChangeSpeedRover",
    HANDLING_DEVICE_RESET_NODES = "/HD/kinematics/reset_nodes",
    LED_PUBLISHER = "/EL/LedCommands",
    CONFIRMATION_HDS_LAUNCHED = "/HD/kinematics/stackHDLaunched",
    SCREENSHOT_ALL_CAMERAS = "/CS/ScreenshotAllCameras",
    MASS_TARE_HD = "/EL/mass_req_hd",
    MASS_TARE_DRILL = "/EL/mass_req_drill",

    // Service
    CHANGE_MODE_CAMERA_SRV = "/CS/ChangeModeCamera",
    CHANGE_MODE_SUBSYSTEM = "/CS/ChangeModeSystem",
    CHANGE_MODE_RGB_HD = "/CS/ChangeModeHDCamera",
    CHANGE_MODE_RGB_NAV = "/CS/ChangeModeNAVCamera",
    RESET_NAVIGATION_MOTORS = "/CS/ResetNavMotors",
    RESET_HOME_NAVIGATION_MOTORS = "/CS/ResetHomeNavMotors",
    REQUEST_HUMAIN_VERIFICATION_HD = "/Rover/HD/human_verification",
    REQUEST_SELECTION_ROCK = "/HD/RockImageSelection",

    // Action
    NAVIGATION_ACTION = "/CS/NavigationReachGoal",
    HANDLING_DEVICE_ACTION = "/CS/HandlingDeviceManipulation",
    DRILL_ACTION = "CS/DrillTerrain"
}