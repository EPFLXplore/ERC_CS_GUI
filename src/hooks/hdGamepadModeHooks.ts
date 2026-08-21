import { useEffect, useRef } from "react";
import { PublishTo, PublishToType } from "../data/publishTo.type";
import States from "../data/states.type";
import SubSystems from "../data/subsystems.type";
import { ClassicalGamepad } from "../utils/Gamepad/bindings";

function useHdGamepadMode(
	gamepadMode: PublishToType,
	hdState: string,
	startService: (system: string, mode: string, isCamera: boolean) => void
): void {
	const gamepadModeRef = useRef(gamepadMode);
	gamepadModeRef.current = gamepadMode;

	const hdStateRef = useRef(hdState);
	hdStateRef.current = hdState;

	const startServiceRef = useRef(startService);
	startServiceRef.current = startService;

	const lastSwitchRef = useRef(0);

	useEffect(() => {
		const onButtonPressed = (event: Event) => {
			if (gamepadModeRef.current !== PublishTo.HANDLING_DEVICE) return;
			if (
				hdStateRef.current !== States.MANUAL_DIRECT &&
				hdStateRef.current !== States.MANUAL_INVERSE
			) {
				return;
			}

			const index = (event as CustomEvent).detail?.buttonIndex;
			let next: string | null = null;
			if (index === ClassicalGamepad.Button.UP) {
				next = States.MANUAL_INVERSE;
			} else if (index === ClassicalGamepad.Button.DOWN) {
				next = States.MANUAL_DIRECT;
			}

			if (!next || next === hdStateRef.current) return;

			const now = Date.now();
			if (now - lastSwitchRef.current < 400) return;
			lastSwitchRef.current = now;

			startServiceRef.current(SubSystems.HANDLING_DEVICE, next, false);
		};

		window.addEventListener("gamepadButtonPressed", onButtonPressed);
		return () => window.removeEventListener("gamepadButtonPressed", onButtonPressed);
	}, []);
}

export default useHdGamepadMode;
