import { useState, useEffect, useRef, useCallback } from "react";
import GamepadController, { GamepadControllerState } from "../utils/Gamepad";
import { PublishTo, PublishToType } from "../data/publishTo.type";
import * as ROSLIB from "roslib";
import { ClassicalGamepad } from "../utils/Gamepad/bindings";
import States from "../data/states.type";
import { Topics } from "../data/topics.type";
import {
	HD_BINDINGS_EVENT,
	HdBindingsConfig,
	applyHdBindingMap,
	loadHdBindingsConfig,
} from "../utils/hdBindingsConfig";

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
	const [hdBindingsConfig, setHdBindingsConfig] = useState<HdBindingsConfig>(() => loadHdBindingsConfig());

	const gamepadCommandStateRef = useRef(gamepadCommandState);
	gamepadCommandStateRef.current = gamepadCommandState;

	const submodeRef = useRef(submode);
	submodeRef.current = submode;
	const hdBindingsConfigRef = useRef(hdBindingsConfig);
	hdBindingsConfigRef.current = hdBindingsConfig;

	const prevGamepadCommandStateRef = useRef(GamepadCommandState.UI);

	const togglePublishing = useCallback(() => {
		setGamepadCommandState((prev) => {
			if (
				prev === GamepadCommandState.UI &&
				(mode === PublishTo.NAVIGATION || mode === PublishTo.HANDLING_DEVICE)
			) {
				return GamepadCommandState.CONTROL;
			}
			return GamepadCommandState.UI;
		});
	}, [mode]);

	const togglePublishingRef = useRef(togglePublishing);
	togglePublishingRef.current = togglePublishing;

	const selectorCallbackRef = useRef(selectorCallback);
	selectorCallbackRef.current = selectorCallback;

	// 1) Init gamepad & one-time listeners
	useEffect(() => {
		const gp = new GamepadController((state) => setGamepadState(state));
		setGamepad(gp);

		// START -> selector
		GamepadController.addGamepadListener(
			"gamepadButtonPressed",
			ClassicalGamepad.Button.START,
			() => selectorCallbackRef.current?.()
		);

		// BACK -> toggle UI/CONTROL (physical View/Select)
		GamepadController.addGamepadListener(
			"gamepadButtonPressed",
			ClassicalGamepad.Button.BACK,
			() => togglePublishingRef.current()
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

	useEffect(() => {
		const syncBindings = () => {
			setHdBindingsConfig(loadHdBindingsConfig());
		};

		const handleCustomEvent = () => {
			syncBindings();
		};

		window.addEventListener(HD_BINDINGS_EVENT, handleCustomEvent as EventListener);
		window.addEventListener("storage", syncBindings);

		return () => {
			window.removeEventListener(HD_BINDINGS_EVENT, handleCustomEvent as EventListener);
			window.removeEventListener("storage", syncBindings);
		};
	}, []);

	const sendCommand = useCallback(() => {
		if (gamepadCommandStateRef.current !== GamepadCommandState.CONTROL) {
			return;
		}
		const s = gamepad?.pollState() ?? gamepad?.getState();
		if (!gamepad?.getGamepad() || !s || !publisher) return;

		if (mode === PublishTo.NAVIGATION) {
			const msg = gamepad.handleNavigation(s.buttons, s.axes);
			publisher.publish(msg);

		} else if (mode === PublishTo.HANDLING_DEVICE) {
			const sm = submodeRef.current;
			const bindings = hdBindingsConfigRef.current;

			if (sm[1] === States.MANUAL_DIRECT) {
				const remappedState = applyHdBindingMap(s.buttons, s.axes, bindings.direct);
				const msg = gamepad.handleDirectArm(remappedState.buttons, remappedState.axes);
				publisher.publish(msg);

			} else {

				const remappedState = applyHdBindingMap(s.buttons, s.axes, bindings.inverse);
				const msg = gamepad.handleInverseArm(remappedState.buttons, remappedState.axes);
				publisher.publish(msg);

			}
		}

	}, [gamepad, publisher, mode]); // submode and hdBindingsConfig read via refs — stable identity

	// When leaving CONTROL, send one neutral Joy so triggers/sticks do not appear stuck on the robot.
	useEffect(() => {
		const prev = prevGamepadCommandStateRef.current;
		const canPublishNeutral =
			publisher &&
			gamepad &&
			(mode === PublishTo.NAVIGATION || mode === PublishTo.HANDLING_DEVICE);

		if (
			prev === GamepadCommandState.CONTROL &&
			gamepadCommandState === GamepadCommandState.UI &&
			canPublishNeutral
		) {
			const neutralButtons = Array.from(
				{ length: ClassicalGamepad.Button.HOME + 1 },
				() => false
			);
			const neutralAxes = Array.from({ length: ClassicalGamepad.Axis.RT + 1 }, () => 0);
			const sm = submodeRef.current;
			const bindings = hdBindingsConfigRef.current;
			try {
				if (mode === PublishTo.NAVIGATION) {
					publisher.publish(gamepad.handleNavigation(neutralButtons, neutralAxes));
				} else if (mode === PublishTo.HANDLING_DEVICE) {
					if (sm[1] === States.MANUAL_DIRECT) {
						const remapped = applyHdBindingMap(neutralButtons, neutralAxes, bindings.direct);
						publisher.publish(gamepad.handleDirectArm(remapped.buttons, remapped.axes));
					} else {
						const remapped = applyHdBindingMap(neutralButtons, neutralAxes, bindings.inverse);
						publisher.publish(gamepad.handleInverseArm(remapped.buttons, remapped.axes));
					}
				}
			} catch {
				/* ros not ready */
			}
		}
		prevGamepadCommandStateRef.current = gamepadCommandState;
	}, [
		gamepadCommandState,
		publisher,
		gamepad,
		mode,
	]); // submode and hdBindingsConfig read via refs

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

	return [gamepad, gamepadState, gamepadCommandState, togglePublishing] as const;
}

export default useGamepad;
