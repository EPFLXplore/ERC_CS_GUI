import { useEffect, useState, startTransition } from "react";
import * as ROSLIB from "roslib";

/*
Author: Ugo Balducci and Giovanni Ranieri, modified by Arno Laurie
Year: 2025
Description: Hooks managing the roverState. It's the main feed of information of the Rover. It's a JSON
stringified and then converted to JSON again by us to access it easily.
*/


export interface SubsystemState {
    navigation: any;
    handling_device: any;
    drill: any;
    electronics: any;
    rover: any;  // Keep for global info if needed
}

function useRoverState(ros: ROSLIB.Ros | null) {
    const [roverState, setRoverState] = useState<SubsystemState>({
        navigation: {},
        handling_device: {},
        drill: {},
        electronics: {},
        rover: {}
    });

    useEffect(() => {
        if (!ros) return;

        // Subscribe to each subsystem's 1Hz state topic
        const navStateListener = new ROSLIB.Topic({
            ros: ros,
            name: "/NAV/State",
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

        // Navigation state updates
        navStateListener.subscribe((message) => {
            const data = JSON.parse((message as any).data);
            startTransition(() => 
                setRoverState(prev => ({ ...prev, navigation: data }))
            );
        });

        // Handling Device state updates
        hdStateListener.subscribe((message) => {
            const data = JSON.parse((message as any).data);
            startTransition(() => 
                setRoverState(prev => ({ ...prev, handling_device: data }))
            );
        });

        // Drill state updates
        drillStateListener.subscribe((message) => {
            const data = JSON.parse((message as any).data);
            startTransition(() => 
                setRoverState(prev => ({ ...prev, drill: data }))
            );
        });

        // Electronics state updates
        elecStateListener.subscribe((message) => {
            const data = JSON.parse((message as any).data);
            startTransition(() => 
                setRoverState(prev => ({ ...prev, electronics: data }))
            );
        });

        return () => {
            navStateListener.unsubscribe();
            hdStateListener.unsubscribe();
            drillStateListener.unsubscribe();
            elecStateListener.unsubscribe();
        };
    }, [ros]);

    return [roverState] as const;
}

export default useRoverState;
