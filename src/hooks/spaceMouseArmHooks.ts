import { useCallback, useEffect, useRef, useState } from "react";
import * as ROSLIB from "roslib";
import States from "../data/states.type";
import { Topics } from "../data/topics.type";
import { SpaceMouseState } from "../utils/SpaceMouse";
import {
	NEUTRAL_INVERSE_ARM_COMMAND,
	computeInverseArmCommandSpaceMouse,
} from "../utils/SpaceMouse/inverseArm";
import { setSpaceMouseHdOwner } from "../utils/hdInputOwner";

const PUBLISH_PERIOD_MS = 30; // same rate as the gamepad, keeps HD's command timeout fed

/**
 * Publishes SpaceMouse input to the HD arm in Manual Inverse while armed.
 * Disarms itself when HD leaves Manual Inverse, the device disconnects or ROS goes away, and
 * always sends one neutral command when it stops so the arm does not keep its last velocity.
 */
function useSpaceMouseArm(
	ros: ROSLIB.Ros | null,
	hdState: string | undefined,
	state: SpaceMouseState | null
) {
	const [armed, setArmed] = useState(false);
	const canArm = Boolean(ros && state?.connected && hdState === States.MANUAL_INVERSE);

	const stateRef = useRef(state);
	stateRef.current = state;
	const rosRef = useRef(ros);
	rosRef.current = ros;

	const toggleArmed = useCallback(() => {
		setArmed((prev) => (prev ? false : canArm));
	}, [canArm]);

	// Auto-disarm when the preconditions go away.
	useEffect(() => {
		if (!canArm) setArmed(false);
	}, [canArm]);

	useEffect(() => {
		if (!armed || !ros) return;

		const topic = new ROSLIB.Topic<any>({
			ros,
			name: Topics.HD_GAMEPAD_CMDS,
			messageType: "sensor_msgs/Joy",
			queue_length: 1,
			queue_size: 1,
		});

		setSpaceMouseHdOwner(true);

		const timer = window.setInterval(() => {
			const s = stateRef.current;
			// Skip rather than queue while disconnected: ROSLIB would burst on reconnect.
			if (!s?.connected || !rosRef.current?.isConnected) return;
			try {
				topic.publish(computeInverseArmCommandSpaceMouse(s.axes, s.buttons));
			} catch (e) {
				console.error("[spacemouse] publish threw:", e);
			}
		}, PUBLISH_PERIOD_MS);

		return () => {
			clearInterval(timer);
			try {
				if (ros.isConnected) topic.publish(NEUTRAL_INVERSE_ARM_COMMAND);
			} catch {
				/* ros not ready */
			}
			// Release after the neutral so the gamepad cannot slip a command in between.
			setSpaceMouseHdOwner(false);
			try {
				topic.unadvertise();
			} catch {
				/* already gone */
			}
		};
	}, [armed, ros]);

	return [armed, toggleArmed, canArm] as const;
}

export default useSpaceMouseArm;
