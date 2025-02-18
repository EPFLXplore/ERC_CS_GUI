export enum Topics {

    // Topic
    NAVIGATION_GAMEPAD_PUBLISHER = "/CS/GamepadCmdsNavigation",
    HANDLING_DEVICE_GAMEPAD_PUBLISHER = "/CS/GamepadCmdsHandlingDevice",
    CHANGE_ANGLE_FRONT_CAMERA = "/CS/ChangeAngleFrontCamera",

    // Service
    CHANGE_MODE_CAMERA_SRV = "/CS/ChangeModeCamera",
    CHANGE_MODE_SUBSYSTEM = "/CS/ChangeModeSystem",
    CHANGE_MODE_RGB_HD = "/CS/ChangeModeHDCamera",
    RESET_NAVIGATION_MOTORS = "/CS/ResetNavMotors",
    RESET_HOME_NAVIGATION_MOTORS = "/CS/ResetHomeNavMotors",
    REQUEST_HUMAIN_VERIFICATION_HD = "/Rover/HD/human_verification",

    // Action
    NAVIGATION_ACTION = "/CS/NavigationReachGoal",
    HANDLING_DEVICE_ACTION = "/CS/HandlingDeviceManipulation",
    DRILL_ACTION = "CS/DrillTerrain"
}