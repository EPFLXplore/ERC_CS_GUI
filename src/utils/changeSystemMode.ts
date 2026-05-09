import * as ROSLIB from "roslib";
import { AlertColor } from "@mui/material";
import SubSystems from "../data/subsystems.type";
import States from "../data/states.type";
import { Topics } from "../data/topics.type";
import { NAV_CAMERA_NAV_INDEX } from "../data/cameras.type";
import { callStdSetBool } from "./changeCameraMode";

// Map state strings to integers for backend (matching NAV interface node)
const STATE_TO_MODE_INT: Record<string, number> = {
  [States.OFF]: 0,           // "Off" -> 0
  [States.ACKERMANN]: 1,     // "Ackermann" -> 1
  [States.OMNI_DIRECTIONAL]: 2,  // "Omni" -> 2
  [States.AUTO]: 3,          // "Auto" -> 3
  [States.MANUAL_DIRECT]: 1, // HD: Manual Direct -> 1
  [States.MANUAL_INVERSE]: 2, // HD: Manual Inverse -> 2
  [States.ON]: 1,            // Drill: On -> 1
};

const SUBSYSTEM_TO_SYSTEM_INT: Record<string, number> = {
  [SubSystems.NAGIVATION]: 0,
  [SubSystems.HANDLING_DEVICE]: 1,
};

// Map subsystems to their direct service topics (no ROVER middleman)
const SUBSYSTEM_MODE_SERVICES: Record<string, { topic: string; type: string }> = {
  [SubSystems.NAGIVATION]: {
    topic: Topics.NAV_CHANGE_MODE,  // Direct to NAV interface: /NAV/ChangeModeSystem
    type: "custom_msg/srv/ChangeModeSystem",
  },
  [SubSystems.HANDLING_DEVICE]: {
    topic: Topics.HD_CHANGE_MODE,   // Direct to HD interface: /HD/ChangeModeSystem
    type: "custom_msg/srv/ChangeModeSystem",
  },
  [SubSystems.DRILL]: {
    topic: Topics.DRILL_CHANGE_MODE,  // Direct to DRILL: /DRILL/ChangeModeSystem
    type: "custom_msg/srv/DrillMode",
  },
};

const requestChangeMode = (
  ros: ROSLIB.Ros | null,
  isCamera: boolean,
  request_mode: any,
  snackBar: (severity: AlertColor, message: string) => void
) => {
  if (!ros) {
    snackBar("error", "ROS connection not available");
    return;
  }

  let serviceName: string;
  let serviceType: string;
  let request: any = {};

  if (isCamera) {
    if (request_mode.subsystem === SubSystems.NAGIVATION) {
      const navIdx = NAV_CAMERA_NAV_INDEX[request_mode.index];
      if (navIdx === undefined) {
        snackBar("error", `Unknown NAV camera: ${request_mode.index}`);
        return;
      }
      const reqCameraService = new ROSLIB.Service({
        ros: ros,
        name: `/NAV/req_camera_nav_${navIdx}`,
        serviceType: "std_srvs/srv/SetBool",
      });
      reqCameraService.callService(
        { data: request_mode.activate },
        (res) => {
          if ((res as any).success) {
            snackBar(
              "success",
              `NAV camera ${request_mode.index} ${request_mode.activate ? "on" : "off"}`
            );
          } else {
            snackBar(
              "error",
              (res as any).message || "NAV camera request was rejected"
            );
          }
        },
        (err) => snackBar("error", "ROS service error: " + String(err))
      );
      return;
    }

    if (request_mode.subsystem === SubSystems.HANDLING_DEVICE) {
      const HD_CAMERA_REQ_INDEX: Record<string, number> = {
        Gripper: 0,
      };
      const idx = HD_CAMERA_REQ_INDEX[request_mode.index];
      if (idx === undefined) {
        snackBar("error", `Unknown HD camera: ${request_mode.index}`);
        return;
      }
      const reqPath = `/ROVER/req_camera_hd_${idx}`;
      if (request_mode.activate) {
        callStdSetBool(ros, reqPath, true, snackBar, (ok) => {
          if (ok) snackBar("success", `HD camera ${request_mode.index} on`);
        });
      } else if (idx === 0) {
        callStdSetBool(ros, Topics.ROVER_DEPTH_REQ_CAMERA_HD_0, false, snackBar, () => {
          callStdSetBool(ros, reqPath, false, snackBar, (ok) => {
            if (ok) snackBar("success", `HD camera ${request_mode.index} off`);
          });
        });
      } else {
        callStdSetBool(ros, reqPath, false, snackBar, (ok) => {
          if (ok) snackBar("success", `HD camera ${request_mode.index} off`);
        });
      }
      return;
    }

    if (request_mode.subsystem === SubSystems.ROVER) {
      const ROVER_CAMERA_REQ_INDEX: Record<string, number> = {
        Up: 0,
      };
      const idx = ROVER_CAMERA_REQ_INDEX[request_mode.index];
      if (idx === undefined) {
        snackBar("error", `Unknown ROVER camera: ${request_mode.index}`);
        return;
      }
      const reqPath = `/ROVER/req_camera_cs_${idx}`;
      callStdSetBool(ros, reqPath, request_mode.activate, snackBar, (ok) => {
        if (ok) {
          snackBar("success", `ROVER camera ${request_mode.index} ${request_mode.activate ? "on" : "off"}`);
        }
      });
      return;
    } else {
      snackBar("error", `Unknown subsystem for camera: ${request_mode.subsystem}`);
      return;
    }
  } else {
    // Subsystem mode changes
    const serviceConfig = SUBSYSTEM_MODE_SERVICES[request_mode.system];

    if (!serviceConfig) {
      snackBar("error", `Unknown subsystem: ${request_mode.system}`);
      return;
    }

    // Convert state string to integer mode for backend
    const modeInt = STATE_TO_MODE_INT[request_mode.mode];
    if (modeInt === undefined) {
      snackBar("error", `Unknown mode: ${request_mode.mode}`);
      return;
    }

    serviceName = serviceConfig.topic;
    serviceType = serviceConfig.type;
    request =
      serviceType === "custom_msg/srv/ChangeModeSystem"
        ? {
            system: SUBSYSTEM_TO_SYSTEM_INT[request_mode.system] ?? 0,
            mode: modeInt, // Send integer (0, 1, 2, 3) to backend
          }
        : {
            mode: modeInt,
          };
  }

  const callModeService = (name: string, allowDrillLegacyFallback: boolean) => {
    const changeModeService = new ROSLIB.Service({
      ros: ros,
      name: name,
      serviceType: serviceType,
    });

    changeModeService.callService(
      request,
      (res) => {
        if ((res as any)["error_type"] !== 0) {
          snackBar("error", "Error: " + (res as any)["error_message"]);
        } else {
          snackBar("success", (res as any)["error_message"] || "Mode changed successfully");
        }
      },
      (err) => {
        const errStr = String(err);
        const looksLikeMissingService =
          /does not exist|not\s+advertised|404|unknown\s+service/i.test(errStr);
        const isDrillPrimaryMissing =
          allowDrillLegacyFallback &&
          !isCamera &&
          request_mode.system === SubSystems.DRILL &&
          name === Topics.DRILL_CHANGE_MODE &&
          looksLikeMissingService;

        if (isDrillPrimaryMissing) {
          // Old stacks / missing DrillCSInterface: try science_interface_names service
          callModeService(Topics.DRILL_CHANGE_MODE_LEGACY, false);
          return;
        }
        snackBar("error", "ROS service error: " + errStr);
      }
    );
  };

  callModeService(serviceName, true);
};

export default requestChangeMode;
