# Control Station – Where topics, messages, actions and hardcoded values are defined

Use this as a quick index when you need to change topic names, message types, action types, or other ROS-related constants.

---

## 1. Main central definitions

### `frontend/src/data/topics.type.ts`
**All topic and service names** used by the frontend (single source of truth for names).

- NAV: state, gamepad, speed, reset motors/home, reach goal action, change mode, camera, screenshot
- HD: state, gamepad, manipulation action, change mode, camera, reset nodes, human verification, image selection, stack launched
- DRILL: state, drill action, change mode
- EL: state, LED commands, mass tare HD/Drill
- CS: front camera angle, screenshot (alternate)
- RGB camera services, confirmation topics, etc.

**Change here when** you rename a topic/service on the ROS side.

---

### `frontend/src/data/states.type.ts`
**Subsystem mode strings** (must match what the rover publishes in `state.mode`).

- `Off`, `On`, `Ackermann`, `Omni`, `Manual Direct`, `Manual Inverse`, `Auto`

**Change here when** you add/rename modes or the backend uses different strings.

---

### `frontend/src/data/subsystems.type.ts`
**Subsystem identifiers** used in the app (navigation, handling_device, drill, cameras, etc.).

Used in hooks and UI; keep in sync with how you refer to subsystems.

---

## 2. Action names and types

### `frontend/src/hooks/actionsHooks.ts`
**Action server path (topic name) and action type suffix** per subsystem:

| Subsystem        | Action path (from Topics) | `name_action_file` → full action type |
|------------------|---------------------------|---------------------------------------|
| navigation       | `NAV_REACH_GOAL`          | `NAVReachGoal` → `custom_msg/action/NAVReachGoal` |
| handling_device  | `HD_MANIPULATION`         | `HDManipulation` → `custom_msg/action/HDManipulation` |
| drill            | `DRILL_CMD`               | `DrillCmd` → `custom_msg/action/DrillCmd` |

**Change here when** you add an action, rename the action server, or use a different action type.  
**Note:** The full action type is built in `actionGoal.tsx` as `"custom_msg/action/" + action.name_action_file`. If your ROS package name or action type differs, either change this string in `actionsHooks.ts` or the prefix in `actionGoal.tsx`.

---

### `frontend/src/utils/actionGoal.tsx`
**Action type prefix** when creating the ROS action client:

- `actionType: "custom_msg/action/" + action.name_action_file`

**Change here when** your ROS action package/type uses a different prefix (e.g. another package name).

---

## 3. Service types and mode mapping

### `frontend/src/utils/changeSystemMode.ts`
**Service names** (from Topics) and **service types** for mode changes:

- NAV: `Topics.NAV_CHANGE_MODE` → `custom_msg/srv/ChangeModeSystem`
- HD: `Topics.HD_CHANGE_MODE` → `custom_msg/srv/ChangeModeSystem`
- DRILL: `Topics.DRILL_CHANGE_MODE` → `custom_msg/srv/DrillMode`
- Camera: `Topics.NAV_CHANGE_CAMERA_MODE` → `custom_msg/srv/ChangeModeCamera`

**Integer mode mapping** `STATE_TO_MODE_INT`: Off→0, Ackermann→1, Omni→2, Auto→3, Manual Direct/Inverse→1/2, On→1.

**Change here when** you add a subsystem mode, rename a service type, or the backend expects different integers.

---

### `frontend/src/utils/changeCameraMode.ts`
**RGB camera services** and type:

- HD: `Topics.CHANGE_MODE_RGB_HD`  
- NAV: `Topics.CHANGE_MODE_RGB_NAV`  
- `serviceType: "std_srvs/srv/SetBool"`

**Change here when** you rename these services or use another message type.

---

### `frontend/src/utils/navigationActions.ts`
**Nav reset services** and types:

- `Topics.NAV_RESET_MOTORS` → `std_srvs/srv/SetBool`
- `Topics.NAV_RESET_HOME` → `std_srvs/srv/SetBool`

**Change here when** you rename these services or use another request type.

---

## 4. Topic names and message types (in code)

### `frontend/src/hooks/roverStateHooks.ts`
**State subscriptions** (topic name + message type):

- `/NAV/State`, `/HD/State`, `/DRILL/State`, `/EL/State`  
- `messageType: "std_msgs/String"` (JSON in string)

**Change here when** you move state to another topic or use a different message type.

---

### `frontend/src/hooks/roverControlsHooks.ts`
**Publishers and their message types:**

- `Topics.NAV_CHANGE_SPEED` → `std_msgs/Float32`
- `Topics.EL_MASS_TARE_DRILL` → `custom_msg/MassRequestDrill`
- `Topics.EL_MASS_TARE_HD` → `custom_msg/MassRequestHD`
- `Topics.SCREENSHOT_ALL_CAMS` → `std_msgs/Bool`
- `Topics.EL_LED_COMMANDS` → `custom_msg/LEDMessage`

**Advertised services (CS is server):**

- `Topics.REQUEST_SELECTION_IMAGE` → `custom_msg/srv/ControlStationSelection`
- `Topics.REQUEST_HUMAIN_VERIFICATION_HD` → `custom_msg/srv/HumanVerification`

**Subscriptions:**

- `Topics.CONFIRMATION_HDS_LAUNCHED` → `std_msgs/Bool`

**Change here when** you change topic/service names (in `topics.type.ts`) or message/srv types.

---

### `frontend/src/hooks/gamepadHooks.ts`
**Gamepad topic** (from Topics) and message type:

- `Topics.NAV_GAMEPAD_CMDS` or `Topics.HD_GAMEPAD_CMDS`
- `messageType: "sensor_msgs/Joy"`

**Change here when** you rename gamepad topics or use another message type.

---

### `frontend/src/hooks/cameraHooks.ts`
**Camera feed topic names** (hardcoded array, not in Topics):

- `CAMERA_CONFIGS`:  
  `/NAV/feed_camera_nav_0`, `/HD/feed_camera_hd_0`,  
  `/CS/feed_camera_cs_0` … `feed_camera_cs_5`, etc.

- `messageType: "sensor_msgs/CompressedImage"`

**Change here when** you add/remove/rename camera topics.

---

### `frontend/src/hooks/roverLogHooks.ts`
**Log topic:**

- `/rosout`  
- `messageType: "rcl_interfaces/msg/Log"`

---

## 5. HD task / drill task strings (UI → ROS)

### `frontend/src/components/modals/ArmGoalModal/index.tsx`
**HD task list**: display name and **message string sent to ROS** (e.g. `"switch_main"`, `"home"`, `"rocks"`).  
These strings are sent in the action goal as `actions: ["msg1", "msg2"]`.

**Change here when** you add/rename HD tasks or the backend expects different command strings.

---

### `frontend/src/components/modals/DrillGoalModal/index.tsx`
**Drill task enum** and strings sent to ROS (e.g. `Auto`, `Start`, `Down`, `step_down`, `step_up`).  
Sent as `action: task.toLowerCase()` or `{ action, multiple_increment }`.

**Change here when** you add/rename drill tasks or the backend expects different strings.

---

## 6. Other hardcoded / config

### `frontend/src/hooks/rosbridgeHooks.ts`
- **WebSocket URL:** `ws://localhost:9090`
- **Node check:** looks for node names containing `/NAV`, `/HD`, `/DRILL`, `/EL` (or variants).

**Change here when** you change rosbridge URL or the way you detect subsystems.

---

### `frontend/src/utils/sshCommands.ts`
- **SSH hostnames** (e.g. `xplore`, `xplore-nav`, `xplore-hd`, `xplore-avionics`)
- **Display names** and **SSH command names** (Start/Stop Drill, Avionics, Rover, Wheels, HD Stack, etc.)

**Change here when** you rename machines or SSH commands.

---

### `frontend/src/data/sensors.types.ts`
- **Sensors** (e.g. `MASS_DRILL`, `MASS_HD`) and **SensorsType** values used for recording.

---

### `frontend/src/data/cameras.type.ts`
- **Camera enums** (CameraRover, CameraHD, CameraNAV, CameraSC) and **depth_cameras** / **allCameras** config (names, subsystem links).

---

### `frontend/src/hooks/serviceHooks.ts`
- **Rules** for which subsystem must be in which state before changing mode (e.g. Drill Off to put NAV in Auto/Ackermann/Omni).  
Uses `SubSystems` and `States`; no topic names.

---

## Quick lookup table

| What you want to change        | Primary file(s) |
|--------------------------------|-----------------|
| Topic / service / action names  | `data/topics.type.ts` |
| State topic paths or msg type  | `hooks/roverStateHooks.ts` |
| Action server path + type name | `hooks/actionsHooks.ts` + `utils/actionGoal.tsx` |
| Service types (srv/msg)        | `utils/changeSystemMode.ts`, `utils/changeCameraMode.ts`, `utils/navigationActions.ts`, `hooks/roverControlsHooks.ts` |
| Publisher topic + message type | `hooks/roverControlsHooks.ts`, `hooks/gamepadHooks.ts` |
| Camera feed topics             | `hooks/cameraHooks.ts` |
| Mode strings (Off, Auto, …)    | `data/states.type.ts` |
| Mode → integer for backend     | `utils/changeSystemMode.ts` |
| HD task command strings        | `components/modals/ArmGoalModal/index.tsx` |
| Drill task strings             | `components/modals/DrillGoalModal/index.tsx` |
| Rosbridge URL                  | `hooks/rosbridgeHooks.ts` |
| SSH hosts / commands           | `utils/sshCommands.ts` |
