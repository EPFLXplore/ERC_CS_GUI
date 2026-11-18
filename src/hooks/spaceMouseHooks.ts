import { useCallback, useEffect, useRef, useState } from "react";
import SpaceMouseController, { SpaceMouseState } from "../utils/SpaceMouse";

/**
 * Live SpaceMouse state. `requestDevice` opens the browser's HID picker and must be called from a
 * click; once granted, the device reconnects automatically on later page loads.
 */
function useSpaceMouse() {
	const controllerRef = useRef<SpaceMouseController | null>(null);
	const [state, setState] = useState<SpaceMouseState | null>(null);

	useEffect(() => {
		const c = new SpaceMouseController(setState);
		controllerRef.current = c;
		setState(c.getState());
		return () => {
			c.dispose();
			controllerRef.current = null;
		};
	}, []);

	const requestDevice = useCallback(
		() => controllerRef.current?.requestDevice() ?? Promise.resolve(false),
		[]
	);

	return [state, requestDevice] as const;
}

export default useSpaceMouse;
