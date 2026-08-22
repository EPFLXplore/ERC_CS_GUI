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
    /** `undefined` until first `/SC/State` message (so UI can show NO DATA vs Disconnected). */
    drill?: any;
    electronics: any;
    rover: any;  // Keep for global info if needed
}

export interface StateTopicDiagnostic {
    label: string;
    topicName: string;
    lastMessageAt: number;
    lastParsedAt: number;
    lastErrorAt: number;
}

/** CS expects a 1 Hz JSON `std_msgs/String` summary; default `/NAV/State`. Override with REACT_APP_NAV_STATE_TOPIC if your stack uses another name. */
const NAV_STATE_TOPIC =
	(typeof process !== "undefined" && process.env.REACT_APP_NAV_STATE_TOPIC?.trim()) ||
	Topics.NAV_STATE;

/**
 * Rows of the Data Path panel.
 *
 * EL watches `/EL/heartbeat` rather than `/EL/State`: the electronics stack does not publish a
 * state summary, so that row could only ever read "no data" and told us nothing about whether
 * avionics was up. The heartbeat is the signal that actually exists. `/EL/State` is still
 * subscribed below for `power` / `four_in_one` / `dust` in case a build starts publishing it —
 * it just no longer has a row of its own.
 */
const STATE_TOPIC_DEFINITIONS = [
    { label: "NAV", topicName: NAV_STATE_TOPIC },
    { label: "HD", topicName: Topics.HD_STATE },
    { label: "DRILL", topicName: Topics.DRILL_STATE },
    { label: "EL", topicName: Topics.EL_HEARTBEAT },
];

// A refresh destroys and recreates the DDS reader (rosbridge unregisters the rclpy subscription
// as soon as the last client unsubscribes), which costs a full endpoint-discovery round trip with
// the Jetson. Refreshing faster than that discovery takes turns a single missed 1 Hz message into
// a resubscribe loop that never settles, so keep the thresholds well above it.
const STATE_TOPIC_RESUBSCRIBE_STALE_MS = 12000;
const STATE_TOPIC_RESUBSCRIBE_INTERVAL_MS = 20000;

function useRoverState(ros: ROSLIB.Ros | null) {
    const [roverState, setRoverState] = useState<SubsystemState>({
        navigation: {},
        handling_device: {},
        drill: undefined,
        electronics: {},
        rover: {}
    });
    const [stateTopicDiagnostics, setStateTopicDiagnostics] = useState<StateTopicDiagnostic[]>(() =>
        STATE_TOPIC_DEFINITIONS.map(({ label, topicName }) => ({
            label,
            topicName,
            lastMessageAt: 0,
            lastParsedAt: 0,
            lastErrorAt: 0,
        }))
    );

    useEffect(() => {
        if (!ros) return;

        setStateTopicDiagnostics((previous) =>
            STATE_TOPIC_DEFINITIONS.map(({ label, topicName }) => {
                const existing = previous.find((item) => item.topicName === topicName);
                return {
                    label,
                    topicName,
                    lastMessageAt: existing?.lastMessageAt ?? 0,
                    lastParsedAt: existing?.lastParsedAt ?? 0,
                    lastErrorAt: existing?.lastErrorAt ?? 0,
                };
            })
        );

        const updateStateTopicDiagnostic = (
            topicName: string,
            field: "lastMessageAt" | "lastParsedAt" | "lastErrorAt",
            timestamp: number
        ) => {
            setStateTopicDiagnostics((previous) =>
                previous.map((item) =>
                    item.topicName === topicName ? { ...item, [field]: timestamp } : item
                )
            );
        };

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
                updateStateTopicDiagnostic(topicName, "lastErrorAt", Date.now());
                return null;
            }
        };

        const createStateListener = (topicName: string, onData: (data: any) => void) => {
            let lastMessageAt = 0;
            let listener: ROSLIB.Topic<any> | null = null;

            const handleMessage = (message: any) => {
                const receivedAt = Date.now();
                updateStateTopicDiagnostic(topicName, "lastMessageAt", receivedAt);
                const data = parseStateMessage(message, topicName);
                if (data) {
                    lastMessageAt = receivedAt;
                    updateStateTopicDiagnostic(topicName, "lastParsedAt", receivedAt);
                    startTransition(() => onData(data));
                }
            };

            const unsubscribe = () => {
                if (!listener) return;
                try {
                    listener.unsubscribe(handleMessage);
                } catch {
                    try { listener.unsubscribe(); } catch {}
                }
                listener = null;
            };

            const subscribe = () => {
                listener = new ROSLIB.Topic({
                    ros: ros,
                    name: topicName,
                    messageType: "std_msgs/String",
                    queue_length: 1,
                    queue_size: 1,
                });
                listener.subscribe(handleMessage);
            };

            const refresh = () => {
                unsubscribe();
                subscribe();
            };

            subscribe();

            return {
                topicName,
                getLastMessageAt: () => lastMessageAt,
                refresh,
                unsubscribe,
            };
        };

        // ROS 2 discovery can miss a publisher that appears after the browser subscribed through
        // rosbridge. Refresh quiet state subscriptions so stack relaunches recover after a CS reload.
        const stateListeners = [
            createStateListener(NAV_STATE_TOPIC, (data) =>
                setRoverState((prev) => ({ ...prev, navigation: data }))
            ),
            createStateListener(Topics.HD_STATE, (data) =>
                setRoverState((prev) => ({ ...prev, handling_device: data }))
            ),
            createStateListener(Topics.DRILL_STATE, (data) =>
                setRoverState((prev) => ({ ...prev, drill: data }))
            ),
            // Nothing publishes /EL/State today, so this listener is purely the recovery path for
            // a build that starts doing so; its diagnostic updates address a row that no longer
            // exists (see STATE_TOPIC_DEFINITIONS) and are harmless no-ops until then.
            createStateListener(Topics.EL_STATE, (data) =>
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
            ),
        ];

        const stateTopicWatchdog = setInterval(() => {
            if (!ros.isConnected) return;

            const now = Date.now();
            stateListeners.forEach((listener) => {
                const lastMessageAt = listener.getLastMessageAt();
                if (lastMessageAt !== 0 && now - lastMessageAt <= STATE_TOPIC_RESUBSCRIBE_STALE_MS) {
                    return;
                }
                listener.refresh();
            });
        }, STATE_TOPIC_RESUBSCRIBE_INTERVAL_MS);

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

        // Live pH readings
        const phPacketListener = new ROSLIB.Topic({
            ros: ros,
            name: Topics.EL_PH_PACKET,
            messageType: "custom_msg/PhPacket",
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

        // pH packet updates
        phPacketListener.subscribe((message: any) => {
            if (!message || typeof message.ph !== "number") return;
            startTransition(() =>
                setRoverState((prev) => ({
                    ...prev,
                    electronics: {
                        ...(prev.electronics || {}),
                        sensors: {
                            ...((prev.electronics as any)?.sensors || {}),
                            ph: message.ph,
                        },
                    },
                }))
            );
        });

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

        // Heartbeat: liveness is message *arrival*, not a changing value. `Heartbeat.msg` carries
        // only `board_id`, which identifies the board and never changes (the rover publishes a
        // constant `board_id: 0`), so the older "counter moved" test could never pass. Any
        // heartbeat from any board counts as alive.
        //
        // HEARTBEAT_STALE_MS must stay above the publish period of /EL/heartbeat, or the banner
        // flickers between beats.
        const HEARTBEAT_STALE_MS = 3000;
        let lastHeartbeatAt = Date.now();
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
            // board_id 0 is a valid id, so test the type rather than the truthiness of the value.
            if (!message || typeof message.board_id !== "number") return;
            const receivedAt = Date.now();
            lastHeartbeatAt = receivedAt;
            setAvionicsAlive(true);
            // Feeds the EL row of the Data Path panel. A well-formed Heartbeat needs no parsing
            // step, so arrival counts as both received and parsed and the row reads as healthy
            // rather than "raw only".
            updateStateTopicDiagnostic(Topics.EL_HEARTBEAT, "lastMessageAt", receivedAt);
            updateStateTopicDiagnostic(Topics.EL_HEARTBEAT, "lastParsedAt", receivedAt);
        });

        const heartbeatWatchdog = setInterval(() => {
            if (Date.now() - lastHeartbeatAt > HEARTBEAT_STALE_MS) {
                setAvionicsAlive(false);
            }
        }, 1000);

        return () => {
            stateListeners.forEach((listener) => listener.unsubscribe());
            bmsStateListener.unsubscribe();
            massPacketListener.unsubscribe();
            phPacketListener.unsubscribe();
            heartbeatListener.unsubscribe();
            clearInterval(heartbeatWatchdog);
            clearInterval(stateTopicWatchdog);
        };
    }, [ros]);

    return [roverState, stateTopicDiagnostics] as const;
}

export default useRoverState;
