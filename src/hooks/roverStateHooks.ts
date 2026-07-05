import { useEffect, useState, startTransition } from "react";
import * as ROSLIB from "roslib";
import { Topics } from "../data/topics.type";

/*
Author: Ugo Balducci and Giovanni Ranieri, modified by Arno Laurie
Year: 2025
Description: Hooks managing the roverState. It's the main feed of information of the Rover. It's a JSON
stringified and then converted to JSON again by us to access it easily.
*/


export interface SubsystemState {
    navigation: any;
    handling_device: any;
    /** `undefined` until first `/DRILL/State` message (so UI can show NO DATA vs Disconnected). */
    drill?: any;
    electronics: any;
    rover: any;  // Keep for global info if needed
}

/** CS expects a 1 Hz JSON `std_msgs/String` summary; default `/NAV/State`. Override with REACT_APP_NAV_STATE_TOPIC if your stack uses another name. */
const NAV_STATE_TOPIC =
	(typeof process !== "undefined" && process.env.REACT_APP_NAV_STATE_TOPIC?.trim()) ||
	Topics.NAV_STATE;

function useRoverState(ros: ROSLIB.Ros | null) {
    const [roverState, setRoverState] = useState<SubsystemState>({
        navigation: {},
        handling_device: {},
        drill: undefined,
        electronics: {},
        rover: {}
    });

    useEffect(() => {
        if (!ros) return;

        const parseStateMessage = (message: any, topicName: string) => {
            try {
                const raw = message?.data;
                if (typeof raw === "string") {
                    return JSON.parse(raw);
                }

                if (raw && typeof raw === "object") {
                    return raw;
                }

                return JSON.parse(String(raw));
            } catch (error) {
                console.warn(`[roverState] ${topicName} parse failed:`, error, message);
                return null;
            }
        };

        // Subscribe to each subsystem's 1Hz state topic
        const navStateListener = new ROSLIB.Topic({
            ros: ros,
            name: NAV_STATE_TOPIC,
            messageType: "std_msgs/String",  // or your custom message type
            queue_length: 1,
            queue_size: 1,
        });

        const hdStateListener = new ROSLIB.Topic({
            ros: ros,
            name: "/HD/State",
            messageType: "std_msgs/String",
            queue_length: 1,
            queue_size: 1,
        });

        const drillStateListener = new ROSLIB.Topic({
            ros: ros,
            name: "/DRILL/State",
            messageType: "std_msgs/String",
            queue_length: 1,
            queue_size: 1,
        });

        const elecStateListener = new ROSLIB.Topic({
            ros: ros,
            name: "/EL/State",
            messageType: "std_msgs/String",
            queue_length: 1,
            queue_size: 1,
        });

        const bmsStateListener = new ROSLIB.Topic({
            ros: ros,
            name: Topics.EL_BMS_TOPIC,
            messageType: "custom_msg/msg/BMS",
            queue_length: 1,
            queue_size: 1,
        });

        // Live mass sensor readings (id: 0 = HD, 1 = Drill)
        const massPacketListener = new ROSLIB.Topic({
            ros: ros,
            name: Topics.EL_MASS_PACKET,
            messageType: "custom_msg/MassPacket",
            queue_length: 1,
            queue_size: 1,
        });

        // Avionics alive check: `dummy` is a free-running counter, avionics is
        // considered alive as long as it keeps changing.
        const heartbeatListener = new ROSLIB.Topic({
            ros: ros,
            name: Topics.EL_HEARTBEAT,
            messageType: "custom_msg/Heartbeat",
            queue_length: 1,
            queue_size: 1,
        });

        // Navigation state updates
        navStateListener.subscribe((message) => {
            const data = parseStateMessage(message, NAV_STATE_TOPIC);
            if (data) {
                startTransition(() =>
                    setRoverState((prev) => ({ ...prev, navigation: data }))
                );
            }
        });

        // Handling Device state updates
        hdStateListener.subscribe((message) => {
            const data = parseStateMessage(message, "/HD/State");
            if (data) {
                startTransition(() =>
                    setRoverState((prev) => ({ ...prev, handling_device: data }))
                );
            }
        });

        // Drill state updates
        drillStateListener.subscribe((message) => {
            try {
                const raw = (message as any).data;
                const data =
                    typeof raw === "string"
                        ? JSON.parse(raw)
                        : raw && typeof raw === "object"
                          ? raw
                          : JSON.parse(String(raw));
                if (data && typeof data === "object") {
                    startTransition(() =>
                        setRoverState((prev) => ({ ...prev, drill: data }))
                    );
                }
            } catch (e) {
                console.warn("[roverState] /DRILL/State parse failed:", e);
            }
        });

        // Electronics state updates
        elecStateListener.subscribe((message) => {
            const data = parseStateMessage(message, "/EL/State");
            if (data) {
                startTransition(() =>
                    setRoverState((prev) => ({
                        ...prev,
                        electronics: {
                            ...data,
                            bms: (prev.electronics as any)?.bms ?? (data as any)?.bms,
                            avionicsAlive: (prev.electronics as any)?.avionicsAlive,
                            sensors: {
                                ...(data as any)?.sensors,
                                mass_sensors: {
                                    ...(data as any)?.sensors?.mass_sensors,
                                    ...(prev.electronics as any)?.sensors?.mass_sensors,
                                },
                            },
                        },
                    }))
                );
            }
        });

        // BMS updates (voltage/current/status)
        const handleBmsMessage = (message: any) => {
            if (!message || typeof message !== "object") return;
            startTransition(() =>
                setRoverState((prev) => ({
                    ...prev,
                    electronics: {
                        ...(prev.electronics || {}),
                        bms: message,
                    },
                }))
            );
        };

        bmsStateListener.subscribe(handleBmsMessage);

        // Mass packet updates (id 0 = HD arm, id 1 = Drill)
        massPacketListener.subscribe((message: any) => {
            if (!message || typeof message !== "object") return;
            const key = message.id === 1 ? "mass_drill" : "mass_container";
            startTransition(() =>
                setRoverState((prev) => ({
                    ...prev,
                    electronics: {
                        ...(prev.electronics || {}),
                        sensors: {
                            ...((prev.electronics as any)?.sensors || {}),
                            mass_sensors: {
                                ...((prev.electronics as any)?.sensors?.mass_sensors || {}),
                                [key]: message.mass,
                            },
                        },
                    },
                }))
            );
        });

        // Heartbeat: mark alive as soon as the counter changes, mark dead if it
        // hasn't changed (or nothing arrived) within HEARTBEAT_STALE_MS.
        const HEARTBEAT_STALE_MS = 3000;
        let lastHeartbeatValue: number | null = null;
        let lastHeartbeatChangeTime = Date.now();
        let avionicsAlive = false;

        const setAvionicsAlive = (alive: boolean) => {
            if (alive === avionicsAlive) return;
            avionicsAlive = alive;
            startTransition(() =>
                setRoverState((prev) => ({
                    ...prev,
                    electronics: {
                        ...(prev.electronics || {}),
                        avionicsAlive: alive,
                    },
                }))
            );
        };

        heartbeatListener.subscribe((message: any) => {
            if (!message || typeof message.dummy !== "number") return;
            if (message.dummy !== lastHeartbeatValue) {
                lastHeartbeatValue = message.dummy;
                lastHeartbeatChangeTime = Date.now();
                setAvionicsAlive(true);
            }
        });

        const heartbeatWatchdog = setInterval(() => {
            if (Date.now() - lastHeartbeatChangeTime > HEARTBEAT_STALE_MS) {
                setAvionicsAlive(false);
            }
        }, 1000);

        return () => {
            navStateListener.unsubscribe();
            hdStateListener.unsubscribe();
            drillStateListener.unsubscribe();
            elecStateListener.unsubscribe();
            bmsStateListener.unsubscribe();
            massPacketListener.unsubscribe();
            heartbeatListener.unsubscribe();
            clearInterval(heartbeatWatchdog);
        };
    }, [ros]);

    return [roverState] as const;
}

export default useRoverState;
