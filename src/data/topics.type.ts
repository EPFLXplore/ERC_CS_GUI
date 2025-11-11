export enum Topics {

    // ============================================
    // NAVIGATION (NAV) Subsystem Interface
    // ============================================
    NAV_STATE = "/NAV/State",                    // 1Hz state summary (subscribe)
    NAV_GAMEPAD_CMDS = "/NAV/GamepadCmds",      // Gamepad commands (publish)
    NAV_CHANGE_SPEED = "/NAV/ChangeSpeed",      // Speed adjustment (publish)
    NAV_RESET_MOTORS = "/NAV/ResetMotors",      // Service: reset motors
    NAV_RESET_HOME = "/NAV/ResetHome",          // Service: reset to home
    NAV_REACH_GOAL = "/NAV/ReachGoal",          // Action: autonomous navigation
    NAV_CHANGE_MODE = "/NAV/ChangeModeSystem",  // Service: change mode
    NAV_CHANGE_CAMERA_MODE = "/NAV/ChangeModeCamera",  // Service: camera mode
    NAV_SCREENSHOT_ALL = "/NAV/ScreenshotAllCameras",  // Service: screenshots

    // ============================================
    // HANDLING DEVICE (HD) Subsystem Interface
    // ============================================
    HD_STATE = "/HD/State",                      // 1Hz state summary (subscribe)
    HD_GAMEPAD_CMDS = "/HD/GamepadCmds",        // Gamepad commands (publish)
    HD_MANIPULATION = "/HD/Manipulation",        // Action: manipulation tasks
    HD_CHANGE_MODE = "/HD/ChangeModeSystem",    // Service: change mode
    HD_RESET_NODES = "/HD/kinematics/reset_nodes",  // Service: reset kinematics
    HD_HUMAN_VERIFICATION = "/HD/HumanVerification",  // Service: human verify
    HD_IMAGE_SELECTION = "/HD/ControlStationSelection",  // Service: image select
    HD_STACK_LAUNCHED = "/HD/kinematics/stackHDLaunched",  // Topic: confirmation

    // ============================================
    // DRILL Subsystem Interface
    // ============================================
    DRILL_STATE = "/DRILL/State",                // 1Hz state summary (subscribe)
    DRILL_CMD = "/DRILL/DrillCmd",              // Action: drill commands
    DRILL_CHANGE_MODE = "/DRILL/ChangeModeSystem",  // Service: change mode

    // ============================================
    // ELECTRONICS (EL) Subsystem Interface
    // ============================================
    EL_STATE = "/EL/State",                      // 1Hz state summary (subscribe)
    EL_LED_COMMANDS = "/EL/LedCommands",        // LED control (publish)
    EL_MASS_TARE_HD = "/EL/mass_req_hd",        // Mass sensor tare HD
    EL_MASS_TARE_DRILL = "/EL/mass_req_drill",  // Mass sensor tare Drill

    // ============================================
    // Control Station (CS) Internal
    // ============================================
    CS_CHANGE_FRONT_CAMERA_ANGLE = "/CS/ChangeAngleFrontCamera",  // CS-specific
}