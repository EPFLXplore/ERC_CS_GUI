import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as ROSLIB from "roslib";
import { PublishTo, PublishToType } from "../data/publishTo.type";
import { Topics } from "../data/topics.type";
import { ClassicalGamepad } from "../utils/Gamepad/bindings";

/*
Description: Aiming for the ZED 2i front camera servo (ServoRequest id 0 on /EL/servo_req).

Owns the angle for both ways of driving it: the Avionics modal slider and the gamepad D-pad. The
state has to live here rather than in the modal because the modal only exists while it is open,
whereas the gamepad is always live — so an angle set by the D-pad has to survive for the slider to
show it later.

Note there is a second, unrelated path to this same physical servo: the navigation Joy message
carries "+20°/-20° on camera front" on RB/LB (see utils/Gamepad/profiles.ts), which the rover's nav
node acts on. Nothing here can observe that, so using RB/LB will leave the angle below out of step
with the servo's true position until a slider or D-pad command reasserts it.
*/

/** Physical PWM channel — `Servos_ID` in the firmware's ServoThread.h. 0 = front camera. */
export const CAMERA_SERVO_ID = 0;
export const CAMERA_SERVO_DEFAULT_ANGLE = 106;
export const ANGLE_MIN = 35;
export const ANGLE_MAX = 180;

/**
 * Degrees per D-pad tap. The slider's own step of 1° is unusable by tapping, and the RB/LB path's
 * 20° leaves only five usable positions across the range; 5° is ~22 taps end to end.
 */
const CAMERA_SERVO_STEP_DEG = 5;

const clampAngle = (angle: number) => Math.min(ANGLE_MAX, Math.max(ANGLE_MIN, Math.round(angle)));

function useCameraServo(ros: ROSLIB.Ros | null, gamepadMode: PublishToType) {
	const [angle, setAngleState] = useState<number>(CAMERA_SERVO_DEFAULT_ANGLE);

	const servoRequestTopic = useMemo(
		() =>
			ros
				? new ROSLIB.Topic<any>({
						ros,
						name: Topics.EL_SERVO_REQ,
						messageType: "custom_msg/ServoRequest",
						queue_length: 1,
						queue_size: 1,
					})
				: null,
		[ros]
	);

	/** Identical payload to the modal's slider, so the rover cannot tell the two sources apart. */
	const sendServo = useCallback(
		(id: number, servoAngle: number, goToZero: boolean): boolean => {
			if (!servoRequestTopic) return false;
			servoRequestTopic.publish({
				id,
				angle: Math.round(servoAngle),
				go_to_zero: goToZero,
				change_zero: false,
				zero: 0,
			});
			return true;
		},
		[servoRequestTopic]
	);

	const setAngle = useCallback((next: number) => setAngleState(clampAngle(next)), []);

	// Read through refs so the D-pad listener can be registered once and never re-bound.
	const angleRef = useRef(angle);
	angleRef.current = angle;
	const sendServoRef = useRef(sendServo);
	sendServoRef.current = sendServo;
	const gamepadModeRef = useRef(gamepadMode);
	gamepadModeRef.current = gamepadMode;

	const nudge = useCallback((delta: number) => {
		const next = clampAngle(angleRef.current + delta);
		// Already at the end stop: don't re-send an angle the servo is holding.
		if (next === angleRef.current) return;
		// Deliberately silent when ROS is down. The slider surfaces that with a snackbar, which is
		// right for one deliberate click but would spam the operator on every tap.
		if (!sendServoRef.current(CAMERA_SERVO_ID, next, false)) return;
		setAngleState(next);
	}, []);

	useEffect(() => {
		const onButtonPressed = (event: Event) => {
			if (gamepadModeRef.current === PublishTo.HANDLING_DEVICE) return;

			const index = (event as CustomEvent).detail?.buttonIndex;
			// UP/DOWN only, and only outside HD where those buttons switch Manual Direct/Inverse.
			// LEFT remains navigation's Joy-stream "change mode" flag.
			if (index === ClassicalGamepad.Button.UP) nudge(CAMERA_SERVO_STEP_DEG);
			else if (index === ClassicalGamepad.Button.DOWN) nudge(-CAMERA_SERVO_STEP_DEG);
		};

		// The event is edge-triggered by GamepadController, which is exactly tap-to-step: one press,
		// one step, one message. Not gated on CONTROL mode, so the camera can be aimed while driving.
		window.addEventListener("gamepadButtonPressed", onButtonPressed);
		return () => window.removeEventListener("gamepadButtonPressed", onButtonPressed);
	}, [nudge]);

	return useMemo(() => ({ angle, setAngle, sendServo }), [angle, setAngle, sendServo]);
}

export type CameraServo = ReturnType<typeof useCameraServo>;

/**
 * Shared through context rather than props because the Avionics modal is created once and stored as
 * an element in state (`setModal(selectModal(...))`), which freezes its props at creation — a D-pad
 * press while the modal is open would never reach a prop. Context consumers re-render regardless.
 */
const CameraServoContext = createContext<CameraServo | null>(null);

export const CameraServoProvider = CameraServoContext.Provider;

export const useCameraServoContext = (): CameraServo => {
	const ctx = useContext(CameraServoContext);
	if (!ctx) throw new Error("useCameraServoContext must be used within a CameraServoProvider");
	return ctx;
};

export default useCameraServo;
