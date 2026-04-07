
export enum Topics {

    // ============================================
    // NAVIGATION (NAV) Subsystem Interface
    // ============================================
    NAV_STATE = "/NAV/State",                         // 1Hz state summary (subscribe)
    NAV_GAMEPAD_CMDS = "/CS/GamepadCmdsNav",          // Gamepad commands (publish) - Direct to NAV interface
    NAV_CHANGE_SPEED = "/NAV/ChangeSpeed",            // Speed adjustment (publish)
    NAV_RESET_MOTORS = "/CS/ResetNavMotors",          // Service: reset motors
    NAV_RESET_HOME = "/CS/ResetHomeNavMotors",       // Service: reset to home
    NAV_REACH_GOAL = "/NAV/LaunchNavAuto",            // Action: autonomous navigation
    NAV_CHANGE_MODE = "/NAV/ChangeModeSystem",        // Service: NAV mode change - Direct to NAV interface
    NAV_CHANGE_CAMERA_MODE = "/NAV/ChangeModeCamera", // Service: camera mode
    NAV_CHANGE_ANGLE_FRONT_CAM = "/CS/ChangeAngleFrontCamera", //control the front camera servo position
    SCREENSHOT_ALL_CAMS = "/NAV/ScreenshotAllCameras", // Service: screenshots

    // ============================================
    // HANDLING DEVICE (HD) Subsystem Interface
    // ============================================
    HD_STATE = "/HD/State",                      // 1Hz state summary (subscribe)
    HD_GAMEPAD_CMDS = "/CS/GamepadCmdsHandlingDevice",        // Gamepad commands (publish)
    HD_MANIPULATION = "/ROVER/HandlingDeviceManipulation",        // Action: manipulation tasks (task_executor)
    HD_CHANGE_MODE = "/HD/ChangeModeSystem",    // Service: change mode
    HD_CHANGE_CAMERA_MODE = "/HD/ChangeModeCamera", // Service: camera mode for HD
    HD_NAMED_JOINT_TARGET = "/HD/kinematics/named_joint_target", // Topic: publish named pose (custom_msg/NamedPose)
    HD_POSE_GOAL = "/HD/kinematics/pose_goal",          // Topic: Cartesian goal (geometry_msgs/Pose)
    HD_JOINT_GOAL = "/HD/kinematics/joint_goal",        // Topic: explicit joint goal (std_msgs/Float64MultiArray)
    HD_RESET_NODES = "/HD/kinematics/reset_nodes",  // Service: reset kinematics
    HD_HUMAN_VERIFICATION = "/Rover/HD/human_verification",  // Service: human verify
    HD_IMAGE_SELECTION = "/HD/ImageSelection",  // Service: image select
    HD_STACK_LAUNCHED = "/HD/kinematics/stackHDLaunched",  // Topic: confirmation
    // ============================================
    // DRILL Subsystem Interface
    // ============================================
    DRILL_STATE = "/DRILL/State",                // 1Hz state summary (subscribe)
    DRILL_CMD = "/CS/DrillTerrain",              // Action: drill commands
    DRILL_CHANGE_MODE = "/DRILL/ChangeModeSystem",  // Service: change mode (DrillCSInterface)
    /** Legacy: same srv/DrillMode if interface node is old or only SC name is advertised */
    DRILL_CHANGE_MODE_LEGACY = "/SC/drill_mode_srv",

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

    // ============================================
    // Missing Topic Definitions (need to assign to correct subsystem)
    // ============================================
    
    // Gamepad publishers - TODO: Verify these are in Topics enum or if they're legacy
    NAVIGATION_GAMEPAD_PUBLISHER = "/NAV/GamepadCmds",  // Same as NAV_GAMEPAD_CMDS
    HANDLING_DEVICE_GAMEPAD_PUBLISHER = "/HD/GamepadCmds",  // Same as HD_GAMEPAD_CMDS
    
    // Camera RGB mode services - Which subsystem manages these?
    CHANGE_MODE_RGB_HD = "/HD/ChangeModeRGB",  // RGB camera mode for HD
    CHANGE_MODE_RGB_NAV = "/NAV/ChangeModeRGB",  // RGB camera mode for NAV
    
    // Navigation speed change - Already defined as NAV_CHANGE_SPEED but used differently
    CHANGE_SPEED_ROVER = "/NAV/ChangeSpeed",  // Speed adjustment topic
    
    // Mass sensor services - Assigned to EL (Electronics)
    MASS_TARE_DRILL = "/EL/mass_req_drill",  // Already defined
    MASS_TARE_HD = "/EL/mass_req_hd",  // Already defined
    
    // Screenshot topic
    SCREENSHOT_ALL_CAMERAS = "/CS/ScreenshotAllCameras",
    
    // LED control - Assigned to EL (Electronics)  
    LED_PUBLISHER = "/EL/LedCommands",  // Already defined
    
    // HD Services - Control station interaction
    REQUEST_SELECTION_IMAGE = "/HD/ImageSelection",  // Same as HD_IMAGE_SELECTION
    REQUEST_HUMAIN_VERIFICATION_HD = "/Rover/HD/human_verification",  // Same as HD_HUMAN_VERIFICATION
    CONFIRMATION_HDS_LAUNCHED = "/HD/kinematics/stackHDLaunched",  // Same as HD_STACK_LAUNCHED
}