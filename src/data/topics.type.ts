
export enum Topics {

    // ============================================
    // NAVIGATION (NAV) Subsystem Interface
    // ============================================
    /** 1 Hz `std_msgs/String` JSON for the whole NAV subsystem UI — **not** a Nav2 topic. If missing while Nav2 topics exist, start the NAV interface / state publisher on the robot (or `REACT_APP_NAV_STATE_TOPIC`). */
    NAV_STATE = "/NAV/State",                         // 1Hz state summary (subscribe)
    NAV_GAMEPAD_CMDS = "/CS/GamepadCmdsNav",          // Gamepad commands (publish) - Direct to NAV interface
    NAV_CHANGE_SPEED = "/ROVER/change_NAV_speed", // NAV DisplacementCmds + rover_interface_names rover_change_nav_speed
    NAV_RESET_MOTORS = "/CS/ResetNavMotors",          // Service: reset motors
    NAV_RESET_HOME = "/CS/ResetHomeNavMotors",       // Service: reset to home
    NAV_REACH_GOAL = "/NAV/LaunchNavAuto",            // Action: autonomous navigation
    NAV_CHANGE_MODE = "/NAV/ChangeModeSystem",        // Service: NAV mode change - Direct to NAV interface
    NAV_CHANGE_CAMERA_MODE = "/NAV/ChangeModeCamera", // Service: camera mode
    NAV_BW_CAMERA_NAV_0 = "/CS/bw_camera_nav_0",
    NAV_BW_CAMERA_NAV_1 = "/CS/bw_camera_nav_1",
    NAV_BW_CAMERA_NAV_2 = "/CS/bw_camera_nav_2",
    NAV_BW_CAMERA_NAV_3 = "/CS/bw_camera_nav_3",
    /** NAV front (ZED RGB rectified compressed); subscribed directly, not via `/CS/feed_camera_nav_*`. */
    NAV_FRONT_CAMERA_COMPRESSED = "/zed/zed_node/rgb/color/rect/image/compressed",
    NAV_CHANGE_ANGLE_FRONT_CAM = "/CS/ChangeAngleFrontCamera", //control the front camera servo position
/** `std_srvs/srv/Trigger` — request a QR code scan; response message is the scanned content. */
    NAV_QR_CODE_REQUEST = "/NAV/qr_code_request",

    // ============================================
    // HANDLING DEVICE (HD) Subsystem Interface
    // ============================================
    HD_STATE = "/HD/State",                      // 1Hz state summary (subscribe)
    HD_GAMEPAD_CMDS = "/CS/GamepadCmdsHandlingDevice",        // Gamepad commands (publish)
    HD_MANIPULATION = "/ROVER/HandlingDeviceManipulation",        // Action: manipulation tasks (task_executor)
    HD_CHANGE_MODE = "/HD/ChangeModeSystem",    // Service: change mode
    /** HD gripper RGB stream (index 0); `std_srvs/SetBool`. Depth uses `ROVER_DEPTH_REQ_CAMERA_HD_0` after RGB is on. */
    ROVER_REQ_CAMERA_HD_0 = "/ROVER/req_camera_hd_0",
    ROVER_DEPTH_REQ_CAMERA_HD_0 = "/ROVER/depth_req_camera_hd_0",
    HD_NAMED_JOINT_TARGET = "/HD/kinematics/named_joint_target", // Topic: publish named pose (custom_msg/NamedPose)
    HD_POSE_GOAL = "/HD/kinematics/pose_goal",          // Topic: Cartesian goal (geometry_msgs/Pose)
    HD_JOINT_GOAL = "/HD/kinematics/joint_goal",        // Topic: explicit joint goal (std_msgs/Float64MultiArray)
    HD_RESET_NODES = "/HD/kinematics/reset_nodes",  // Service: reset kinematics
    HD_HUMAN_VERIFICATION = "/Rover/HD/human_verification",  // Service: human verify
    HD_MULTIPLE_CHOICE = "/Rover/HD/multiple_choice",  // Service: human picks one of N options
    HD_IMAGE_SELECTION = "/HD/ImageSelection",  // Service: image select
    HD_STACK_LAUNCHED = "/HD/kinematics/stackHDLaunched",  // Topic: confirmation
    HD_TASK_UPDATE = "/HD/task_executor/update_command", // Service: update running HD task command
    /** `lifecycle_msgs/srv/ChangeState` on the HD motor lifecycle node — what `ros2 lifecycle set
     *  /MotorController <transition>` calls. Used to re-run the EtherCAT bring-up (cleanup, then
     *  configure) without restarting the motor docker. */
    HD_MOTOR_CONTROLLER_CHANGE_STATE = "/MotorController/change_state",
    // ============================================
    // DRILL Subsystem Interface
    // ============================================
    DRILL_STATE = "/SC/State",                // 1Hz state summary (subscribe)
    DRILL_CMD = "/CS/DrillTerrain",              // Action: drill commands
    DRILL_GAMEPAD_CMDS = "/CS/GamepadCmdsMicroscope",  // Gamepad commands (publish) - same bindings as NAV
    DRILL_CHANGE_MODE = "/DRILL/ChangeModeSystem",  // Service: change mode (DrillCSInterface)
    /** Legacy: same srv/DrillMode if interface node is old or only SC name is advertised */
    DRILL_CHANGE_MODE_LEGACY = "/SC/drill_mode_srv",
    DRILL_RESET_HOME = "/SC/ResetHomeDrillMotors",  // Service: reset drill motors to home
    /** `std_msgs/Float32` — linear stage feed speed in cm/s (publish, best-effort depth 1). */
    DRILL_LIN_STAGE_SPEED_CMS = "/SC/drill_lin_stage_speed_cms",

    // ============================================
    // MAINTENANCE Task Interface
    // ============================================
    /** `std_msgs/Int32MultiArray` — ArUco ids seen in the current ZED frame, published by the
     *  maintenance_aruco_detector node only when at least one whitelisted tag was found. */
    MAINTENANCE_ARUCO_ID = "/MAINTENANCE/aruco_id",
    /** `geometry_msgs/PoseArray` — pose per id above, same index order. */
    MAINTENANCE_ARUCO_POSE = "/MAINTENANCE/aruco_pose",

    // ============================================
    // ELECTRONICS (EL) Subsystem Interface
    // ============================================
    EL_STATE = "/EL/State",                      // 1Hz state summary (subscribe)
    EL_HEARTBEAT = "/EL/heartbeat",              // Avionics alive check, incrementing counter (subscribe)
    EL_BMS_TOPIC = "/EL/bms_topic",              // BMS status/voltage/current (subscribe)
    EL_MASS_PACKET = "/EL/mass_packet",          // Live mass sensor readings (subscribe)
    EL_PH_PACKET = "/EL/ph_packet",             // Live pH readings (subscribe)
    EL_LED_COMMANDS = "/EL/led_req",             // LED control (publish)
    EL_MASS_REQ = "/EL/mass_req",
    EL_SERVO_REQ = "/EL/servo_req",

    // ============================================
    // Control Station (CS) Internal
    // ============================================
    CS_CHANGE_FRONT_CAMERA_ANGLE = "/CS/ChangeAngleFrontCamera",  // CS-specific

    // ============================================
    // Rover Camera Bandwidth
    // ============================================
    ROVER_BW_CAMERA_CS_TOP = "/ROVER/bw_camera_cs_top",
    ROVER_BW_CAMERA_CS_RIGHT_STEER = "/ROVER/bw_camera_cs_right_steer",
    ROVER_BW_CAMERA_CS_LEFT_STEER = "/ROVER/bw_camera_cs_left_steer",

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
    CHANGE_SPEED_ROVER = "/ROVER/change_NAV_speed",

    // HD Services - Control station interaction
    REQUEST_SELECTION_IMAGE = "/HD/ImageSelection",  // Same as HD_IMAGE_SELECTION
    REQUEST_HUMAIN_VERIFICATION_HD = "/Rover/HD/human_verification",  // Same as HD_HUMAN_VERIFICATION
    REQUEST_MULTIPLE_CHOICE_HD = "/Rover/HD/multiple_choice",  // Same as HD_MULTIPLE_CHOICE
    CONFIRMATION_HDS_LAUNCHED = "/HD/kinematics/stackHDLaunched",  // Same as HD_STACK_LAUNCHED
}