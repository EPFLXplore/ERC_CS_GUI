import { useState, useEffect, useRef, useCallback } from "react";
import GamepadController, { GamepadControllerState } from "../utils/Gamepad";
import { PublishTo, PublishToType } from "../data/publishTo.type";
import * as ROSLIB from "roslib";
import { ClassicalGamepad } from "../utils/Gamepad/bindings";
import States from "../data/states.type";
import { Topics } from "../data/topics.type";

export enum GamepadCommandState {
	UI,
	CONTROL,
}

function useGamepad(
	ros: ROSLIB.Ros | null,
	mode: PublishToType,
	submode: string[],
	selectorCallback?: () => void
) {

	const [gamepad, setGamepad] = useState<GamepadController | null>(null);
	const [gamepadState, setGamepadState] = useState<GamepadControllerState | null>(null);
	const [gamepadCommandState, setGamepadCommandState] = useState<GamepadCommandState>(
	GamepadCommandState.UI
	);
	const [publisher, setPublisher] = useState<ROSLIB.Topic<any> | null>(null);

	// 1) Init gamepad & one-time listeners
	useEffect(() => {
		const gp = new GamepadController((state) => setGamepadState(state));
		setGamepad(gp);

		// START -> selector
		GamepadController.addGamepadListener(
			"gamepadButtonPressed",
			ClassicalGamepad.Button.START,
			() => selectorCallback?.()
		);

		// BACK -> toggle UI/CONTROL
		GamepadController.addGamepadListener(
			"gamepadButtonPressed",
			ClassicalGamepad.Button.BACK,
			() => {
			setGamepadCommandState((prev) => {
				if (prev === GamepadCommandState.UI &&
					(mode === PublishTo.NAVIGATION || mode === PublishTo.HANDLING_DEVICE)) {
				return GamepadCommandState.CONTROL;
				}
				return GamepadCommandState.UI;
			});
			}
		);

	// No remover available for addGamepadListener; ensure this effect runs ONCE.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// 2) Create/replace publisher when ros or mode changes
	useEffect(() => {
		if (!ros) {
			setPublisher(null);
			return;
		}

		// Direct subsystem topic names
		const topicName =
			mode === PublishTo.NAVIGATION
			? Topics.NAV_GAMEPAD_CMDS  // Direct to NAV subsystem
			: Topics.HD_GAMEPAD_CMDS;  // Direct to HD subsystem

		const t = new ROSLIB.Topic<any>({
			ros,
			name: topicName,
			messageType: "sensor_msgs/Joy",
			queue_length: 1,
			queue_size: 1
		});
		
		setPublisher(t);

		return () => {
			try { t.unadvertise(); } catch {}
		};

	}, [ros, mode]);

	const sendCommand = useCallback(() => {
		const s = gamepad?.pollState() ?? gamepad?.getState();
		if (!gamepad?.getGamepad() || !s || !publisher) return;

		if (mode === PublishTo.NAVIGATION) {
			const msg = gamepad.handleNavigation(s.buttons, s.axes);
			publisher.publish(msg);

		} else if (mode === PublishTo.HANDLING_DEVICE) {

			if (submode[1] === States.MANUAL_DIRECT) {
			const msg = gamepad.handleDirectArm(s.buttons, s.axes);
			//console.log("DIRECT")
			publisher.publish(msg);

			} else {

			const msg = gamepad.handleInverseArm(s.buttons, s.axes);
			//console.log("INVERSE")
			publisher.publish(msg);

			}
		}

	}, [gamepad, publisher, mode, submode]);

	const timerRef = useRef<number | null>(null);

	useEffect(() => {
		// Only run when actively controlling and a publisher exists
		if (publisher && gamepadCommandState === GamepadCommandState.CONTROL) {
			// clear any previous interval before starting a new one
			if (timerRef.current !== null) {
			clearInterval(timerRef.current);
			timerRef.current = null;
			}
			timerRef.current = window.setInterval(sendCommand, 30);
		} else {
			if (timerRef.current !== null) {
			clearInterval(timerRef.current);
			timerRef.current = null;
			}
		}

		// On ANY relevant change, clean up the previous timer
		return () => {
			if (timerRef.current !== null) {
			clearInterval(timerRef.current);
			timerRef.current = null;
			}
		};

  }, [publisher, gamepadCommandState, sendCommand]);

	return [gamepad, gamepadState, gamepadCommandState] as const;
}

export default useGamepad;
