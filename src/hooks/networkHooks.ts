import React from "react";
import { useState, useEffect } from "react";
import * as ROSLIB from "roslib";

function useRoverNetwork(ros: ROSLIB.Ros | null) {

    const [logs, setLogs] = useState(null)
    return [logs, setLogs] as const;
}

export default useRoverNetwork;

