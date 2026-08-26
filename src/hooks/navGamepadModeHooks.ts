import { useEffect, useRef } from "react";
import { PublishTo, PublishToType } from "../data/publishTo.type";
import States from "../data/states.type";
import SubSystems from "../data/subsystems.type";
import { ClassicalGamepad } from "../utils/Gamepad/bindings";

function useNavGamepadMode(
	gamepadMode: PublishToType,
	navState: string,
	startService: (system: string, mode: string, isCamera: boolean) => void
): void {
	const gamepadModeRef = useRef(gamepadMode);
	gamepadModeRef.current = gamepadMode;

	const navStateRef = useRef(navState);
	navStateRef.current = navState;

	const startServiceRef = useRef(startService);
	startServiceRef.current = startService;

	const lastSwitchRef = useRef(0);

	useEffect(() => {
		const onButtonPressed = (event: Event) => {
			if (gamepadModeRef.current !== PublishTo.NAVIGATION) return;
			// Only toggle between the two drive modes. Never act from OFF or AUTO —
			// that would effectively power the rover on via a gamepad button, which
			// must stay mouse-only.
			if (
				navStateRef.current !== States.ACKERMANN &&
				navStateRef.current !== States.OMNI_DIRECTIONAL
			) {
				return;
			}

			const index = (event as CustomEvent).detail?.buttonIndex;
			let next: string | null = null;
			if (index === ClassicalGamepad.Button.LEFT) {
				next = States.ACKERMANN;
			} else if (index === ClassicalGamepad.Button.RIGHT) {
				next = States.OMNI_DIRECTIONAL;
			}

			if (!next || next === navStateRef.current) return;

			const now = Date.now();
			if (now - lastSwitchRef.current < 400) return;
			lastSwitchRef.current = now;

			startServiceRef.current(SubSystems.NAGIVATION, next, false);
		};

		window.addEventListener("gamepadButtonPressed", onButtonPressed);
		return () => window.removeEventListener("gamepadButtonPressed", onButtonPressed);
	}, []);
}

export default useNavGamepadMode;
