import * as ROSLIB from "roslib";
import { AlertColor } from "@mui/material";
import SubSystems from "../data/subsystems.type";
import { Topics } from "../data/topics.type";

// Map subsystems to their service topics
const SUBSYSTEM_MODE_SERVICES: Record<string, { topic: string; type: string }> = {
  [SubSystems.NAGIVATION]: {
    topic: Topics.NAV_CHANGE_MODE,
    type: "custom_msg/srv/ChangeModeSystem",
  },
  [SubSystems.HANDLING_DEVICE]: {
    topic: Topics.HD_CHANGE_MODE,
    type: "custom_msg/srv/ChangeModeSystem",
  },
  [SubSystems.DRILL]: {
    topic: Topics.DRILL_CHANGE_MODE,
    type: "custom_msg/srv/ChangeModeSystem",
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
    // Camera mode changes
    serviceName = Topics.NAV_CHANGE_CAMERA_MODE;
    serviceType = "custom_msg/srv/ChangeModeCamera";
    request = {
      camera_name: request_mode.index,
      activate: request_mode.activate,
    };
  } else {
    // Subsystem mode changes
    const serviceConfig = SUBSYSTEM_MODE_SERVICES[request_mode.system];

    if (!serviceConfig) {
      snackBar("error", `Unknown subsystem: ${request_mode.system}`);
      return;
    }

    serviceName = serviceConfig.topic;
    serviceType = serviceConfig.type;
    request = {
      mode: request_mode.mode,
    };
  }

  const changeModeService = new ROSLIB.Service({
    ros: ros,
    name: serviceName,
    serviceType: serviceType,
  });

  changeModeService.callService(
    request,
    (res) => {
      if ((res as any)["error_type"] !== 0) {
        snackBar("error", "Error: " + (res as any)["error_message"]);
      } else {
        console.log((res as any)["error_message"]);
      }
    },
    (err) => {
      snackBar("error", "ROS service error: " + err);
    }
  );
};

export default requestChangeMode;
