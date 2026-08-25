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
import {
	MANUAL_SLOW_FACTOR_EVENT,
	MANUAL_SPEED_EVENT,
	ManualSlowFactor,
	ManualSpeed,
	applyManualSlowCurveToDirectAxes,
	loadManualSlowFactor,
	loadManualSpeed,
	saveManualSlowFactor,
	stepManualSlowFactor,
} from "../utils/hdSpeedConfig";

export enum GamepadCommandState {
	UI,
	CONTROL,
}

/**
 * The drill reports its mode as both "Off" and "off" depending on the node version — the same
 * normalisation roverStateParser does for the motor module readout. Anything unrecognised counts
 * as on, so an unparseable drill state fails safe (NAV held at zero) rather than free.
 */
export const isDrillOn = (state: string | undefined): boolean =>
	state != null && state !== States.OFF && state.toLowerCase() !== "off";

/** Neutral Joy input: no button held, every axis centred. */
const NEUTRAL_BUTTONS = Array.from({ length: ClassicalGamepad.Button.HOME + 1 }, () => false);
const NEUTRAL_AXES = Array.from({ length: ClassicalGamepad.Axis.RT + 1 }, () => 0);

function useGamepad(
	ros: ROSLIB.Ros | null,
	mode: PublishToType,
	submode: string[],
	selectorCallback?: () => void,
	drillState: string = States.OFF
) {

	const [gamepad, setGamepad] = useState<GamepadController | null>(null);
	const [gamepadState, setGamepadState] = useState<GamepadControllerState | null>(null);
	const [gamepadCommandState, setGamepadCommandState] = useState<GamepadCommandState>(
	GamepadCommandState.UI
	);
	const [publisher, setPublisher] = useState<ROSLIB.Topic<any> | null>(null);
	const [hdBindingsConfig, setHdBindingsConfig] = useState<HdBindingsConfig>(() => loadHdBindingsConfig());
	const [manualSpeed, setManualSpeed] = useState<ManualSpeed>(() => loadManualSpeed());
	const [manualSlowFactor, setManualSlowFactor] = useState<ManualSlowFactor>(() =>
		loadManualSlowFactor()
	);

	const gamepadCommandStateRef = useRef(gamepadCommandState);
	gamepadCommandStateRef.current = gamepadCommandState;

	// All values that sendCommand reads must be refs so it never needs to be recreated.
	const publisherRef = useRef<ROSLIB.Topic<any> | null>(null);
	publisherRef.current = publisher;

	const rosRef = useRef<ROSLIB.Ros | null>(null);
	rosRef.current = ros;

	const gamepadRef = useRef<GamepadController | null>(null);
	gamepadRef.current = gamepad;

	const modeRef = useRef(mode);
	modeRef.current = mode;

	const submodeRef = useRef(submode);
	submodeRef.current = submode;

	const drillStateRef = useRef(drillState);
	drillStateRef.current = drillState;

	const hdBindingsConfigRef = useRef(hdBindingsConfig);
	hdBindingsConfigRef.current = hdBindingsConfig;

	// Via a ref, not a dependency: sendCommand is useCallback(..., []) and the 30 ms publish
	// interval depends on its identity, so a dependency here would restart the interval on
	// every toggle.
	const manualSpeedRef = useRef(manualSpeed);
	manualSpeedRef.current = manualSpeed;

	const manualSlowFactorRef = useRef(manualSlowFactor);
	manualSlowFactorRef.current = manualSlowFactor;

	const prevGamepadCommandStateRef = useRef(GamepadCommandState.UI);

	const lastToggleTimeRef = useRef(0);
	const togglePublishing = useCallback(() => {
		const now = Date.now();
		if (now - lastToggleTimeRef.current < 400) return;
		lastToggleTimeRef.current = now;
		setGamepadCommandState((prev) => {
			if (
				prev === GamepadCommandState.UI &&
				(mode === PublishTo.NAVIGATION ||
					mode === PublishTo.HANDLING_DEVICE ||
					mode === PublishTo.DRILL)
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

	// 1) Init gamepad & one-time listeners — cleaned up on unmount so navigation doesn't accumulate extra listeners
	useEffect(() => {
		const gp = new GamepadController((state) => setGamepadState(state));
		setGamepad(gp);

		const onButtonPressed = (e: Event) => {
			const idx = (e as CustomEvent).detail?.buttonIndex;
			if (idx === ClassicalGamepad.Button.START) {
				selectorCallbackRef.current?.();
			} else if (idx === ClassicalGamepad.Button.BACK) {
				togglePublishingRef.current();
			} else if (idx === ClassicalGamepad.Button.LEFT || idx === ClassicalGamepad.Button.RIGHT) {
				// HD only, and only while the maintenance curve is armed. Otherwise the factor is
				// inert, so a stray tap would silently change a setting the operator cannot feel.
				if (modeRef.current !== PublishTo.HANDLING_DEVICE || manualSpeedRef.current !== "slow") return;
				const delta = idx === ClassicalGamepad.Button.RIGHT ? 1 : -1;
				saveManualSlowFactor(stepManualSlowFactor(manualSlowFactorRef.current, delta));
			}
		};

		window.addEventListener("gamepadButtonPressed", onButtonPressed);

		return () => {
			window.removeEventListener("gamepadButtonPressed", onButtonPressed);
		};
	}, []);

	// 2) Create/replace publisher when ros or mode changes
	useEffect(() => {
		if (!ros) {
			setPublisher(null);
			return;
		}

		const topicName =
			mode === PublishTo.NAVIGATION
			? Topics.NAV_GAMEPAD_CMDS
			: mode === PublishTo.DRILL
			? Topics.DRILL_GAMEPAD_CMDS
			: Topics.HD_GAMEPAD_CMDS;

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

	// Kept separate from the bindings sync above: that one always allocates a fresh config object
	// and so always re-renders, whereas both setters here bail out via Object.is when unchanged —
	// which is also why re-reading both settings on either event is free.
	useEffect(() => {
		const syncManualSettings = () => {
			setManualSpeed(loadManualSpeed());
			setManualSlowFactor(loadManualSlowFactor());
		};

		window.addEventListener(MANUAL_SPEED_EVENT, syncManualSettings as EventListener);
		window.addEventListener(MANUAL_SLOW_FACTOR_EVENT, syncManualSettings as EventListener);
		window.addEventListener("storage", syncManualSettings);

		return () => {
			window.removeEventListener(MANUAL_SPEED_EVENT, syncManualSettings as EventListener);
			window.removeEventListener(MANUAL_SLOW_FACTOR_EVENT, syncManualSettings as EventListener);
			window.removeEventListener("storage", syncManualSettings);
		};
	}, []);

	// sendCommand reads everything via refs so its identity is stable after gamepad is set.
	// The interval never needs to restart due to mode/publisher/submode changes.
	const lastPublishRef = useRef<number>(0);
	const lastAttemptRef = useRef<number>(0);
	const sendCommand = useCallback(() => {
		if (gamepadCommandStateRef.current !== GamepadCommandState.CONTROL) {
			const gap = Date.now() - lastPublishRef.current;
			if (gap > 200) console.warn(`[gamepad] not in CONTROL — gap ${gap}ms`);
			return;
		}
		const pub = publisherRef.current;
		if (!pub) {
			const gap = Date.now() - lastPublishRef.current;
			if (gap > 200) console.warn(`[gamepad] publisher null — gap ${gap}ms`);
			return;
		}
		const currentMode = modeRef.current;
		const gp = gamepadRef.current;
		const s = gp?.getState();
		if (!gp?.getGamepad() || !s) {
			const gap = Date.now() - lastPublishRef.current;
			if (gap > 200) console.warn(`[gamepad] no gamepad/state — getGamepad=${!!gp?.getGamepad()} s=${!!s} gap=${gap}ms`);
			return;
		}

		// ROSLIB queues messages via once("connection") when disconnected, causing bursts on reconnect.
		// Check isConnected (set synchronously by ROSLIB on WebSocket open/close) and skip instead.
		if (!rosRef.current?.isConnected) {
			const gap = Date.now() - lastPublishRef.current;
			if (gap > 200) console.warn(`[gamepad] ros disconnected — gap ${gap}ms`);
			return;
		}

		lastAttemptRef.current = Date.now();

		try {
			if (currentMode === PublishTo.NAVIGATION || currentMode === PublishTo.DRILL) {
				// DRILL reuses the NAV bindings — only the publish topic differs.
				//
				// While the drill is on, the rover must not drive off: keep publishing at the normal
				// rate (so the rover node's 0.4s CMD_TIMEOUT stays fed) but force the axes to zero.
				// NAV_gamepad_interface derives v_x/v_y/r_z from axes alone, so zeroed axes put both
				// Ackermann and Omni on their "don't move" path. Buttons still pass through — none of
				// them commands motion, and the crab branch is gated behind a non-zero left stick.
				// Only the NAVIGATION target is held: PublishTo.DRILL is the microscope topic the
				// operator needs *while* drilling.
				const navLocked =
					currentMode === PublishTo.NAVIGATION && isDrillOn(drillStateRef.current);
				const msg = gp.handleNavigation(s.buttons, navLocked ? NEUTRAL_AXES : s.axes);
				pub.publish(msg);
				lastPublishRef.current = Date.now();

			} else if (currentMode === PublishTo.HANDLING_DEVICE) {
				const sm = submodeRef.current;
				const bindings = hdBindingsConfigRef.current;

				if (sm[1] === States.MANUAL_DIRECT) {
					const remappedState = applyHdBindingMap(s.buttons, s.axes, bindings.direct);
					const msg = gp.handleDirectArm(remappedState.buttons, remappedState.axes);
					// Maintenance expo on J1…J6 (the gripper keeps full speed). Applied here rather
					// than inside the profile handler so the MANUAL_INVERSE branch below — where the
					// axes are cartesian, not joints — cannot be affected. No-op when "fast".
					applyManualSlowCurveToDirectAxes(
						msg.axes,
						manualSpeedRef.current,
						manualSlowFactorRef.current
					);
					pub.publish(msg);
				} else {
					const remappedState = applyHdBindingMap(s.buttons, s.axes, bindings.inverse);
					const msg = gp.handleInverseArm(remappedState.buttons, remappedState.axes);
					pub.publish(msg);
				}
				lastPublishRef.current = Date.now();

			} else {
				const gap = Date.now() - lastPublishRef.current;
				if (gap > 200) console.warn(`[gamepad] mode=${currentMode} is not NAV/HD/DRILL — gap ${gap}ms`);
			}
		} catch (e) {
			console.error('[gamepad] publish threw:', e);
		}
	}, []); // everything via refs — sendCommand is permanently stable

	// When leaving CONTROL, send one neutral Joy so the robot doesn't stay at last commanded velocity.
	useEffect(() => {
		const prev = prevGamepadCommandStateRef.current;
		const canPublishNeutral =
			publisher &&
			gamepad &&
			(mode === PublishTo.NAVIGATION ||
				mode === PublishTo.HANDLING_DEVICE ||
				mode === PublishTo.DRILL);

		if (
			prev === GamepadCommandState.CONTROL &&
			gamepadCommandState === GamepadCommandState.UI &&
			canPublishNeutral
		) {
			const neutralButtons = NEUTRAL_BUTTONS;
			const neutralAxes = NEUTRAL_AXES;
			const sm = submodeRef.current;
			const bindings = hdBindingsConfigRef.current;
			try {
				if (mode === PublishTo.NAVIGATION || mode === PublishTo.DRILL) {
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

	// Interval only starts/stops when CONTROL mode toggles.
	// sendCommand is stable (gamepad dep only) so this effect never restarts due to mode/publisher changes.
	// sendCommand itself checks publisherRef.current and returns early when null.
	useEffect(() => {
		if (gamepadCommandState === GamepadCommandState.CONTROL) {
			if (timerRef.current !== null) {
				clearInterval(timerRef.current);
				console.warn('[gamepad] interval RESTARTED (prev existed) — dep changed');
			}
			console.log('[gamepad] interval START');
			timerRef.current = window.setInterval(sendCommand, 30);
		} else {
			if (timerRef.current !== null) {
				console.log('[gamepad] interval STOP (not CONTROL)');
				clearInterval(timerRef.current);
				timerRef.current = null;
			}
		}

		return () => {
			if (timerRef.current !== null) {
				console.warn('[gamepad] interval CLEANUP (effect re-ran)');
				clearInterval(timerRef.current);
				timerRef.current = null;
			}
		};
	}, [gamepadCommandState, sendCommand]); // sendCommand is stable → only restarts on CONTROL toggle

	// Watchdog: fires every 500ms to detect silent publish failures while in CONTROL.
	// Distinguishes "interval not running" (attemptGap large) from "publish silently failing" (attemptGap small, gap large).
	useEffect(() => {
		const watchdog = setInterval(() => {
			if (gamepadCommandStateRef.current !== GamepadCommandState.CONTROL) return;
			const now = Date.now();
			const gap = now - lastPublishRef.current;
			const attemptGap = now - lastAttemptRef.current;
			if (gap > 500) {
				console.error(`[gamepad] WATCHDOG: no publish in ${gap}ms | last attempt ${attemptGap}ms ago | pub=${!!publisherRef.current} mode=${modeRef.current}`);
			}
		}, 500);
		return () => clearInterval(watchdog);
	}, []);

	return [gamepad, gamepadState, gamepadCommandState, togglePublishing] as const;
}

export default useGamepad;
