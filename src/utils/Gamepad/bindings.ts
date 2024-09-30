/** Interface for buttons
 * @param button - The button number
 * @param type - The type of the button (button: normal button, trigger: button controlled by a trigger)
 * @param index - The index of the button
 * @param threshold - The threshold of the button
 */
interface Buttons {
	[button: number]:
		| {
				type: "button";
				index: number;
		  }
		| {
				type: "trigger";
				index: number;
				threshold: number;
		  }
		  | {
			type: "axis";
			axis: number;
			value: number;
	  };
}

/** Interface for axes
 * @param axis - The axis number
 * @param type - The type of the axis (axis: normal axis, button: axis controlled by buttons, trigger: axis controlled by a trigger)
 * @param buttons - The buttons that control the axis (negative, positive)
 * @param minAxisRange - The minimum range of the axis
 * @param maxAxisRange - The maximum range of the axis
 * @param zeroAxisRange - The zero range of the axis
 * @returns {object} - The axis object
 */
interface Axes {
	[axis: number]:
		| {
				type: "axis";
				axis: number;
				minAxisRange: number;
				maxAxisRange: number;
				zeroAxisRange: number;
		  }
		| {
				type: "button";
				buttons: [number, number];
				buttonValues: [number, number];
		  }
		| {
				type: "trigger";
				button: number;
				maxTriggerRange: number;
				zeroTriggerRange: number;
		  };
}

/** Interface for device profile
 * @param name - The name of the device
 * @param OS - The operating system of the device profile
 * @param webBrowser - The web browser of the device profile
 * @param buttons - The buttons of the device profile
 * @param axes - The axes of the device profile
 * @param navigationHandler - The navigation handler of the device profile
 * @param directArmHandler - The direct arm handler of the device profile
 * @param inverseArmHandler - The inverse arm handler of the device profile
 */
interface DeviceProfile {
	name: string;
	OS: "Windows" | "Linux" | "MacOS" | "Other";
	webBrowser: "Safari" | "Chrome" | "Firefox" | "Edge" | "Opera" | "Other";
	buttons: Buttons;
	axes: Axes;
	navigationHandler: (
		buttons: readonly boolean[],
		axes: readonly number[]
	) => { buttons: number[]; axes: number[] };
	directArmHandler: (
		buttons: readonly boolean[],
		axes: readonly number[]
	) => { buttons: number[]; axes: number[] };
	inverseArmHandler: (
		buttons: readonly boolean[],
		axes: readonly number[]
	) => { buttons: number[]; axes: number[] };
}

/** Class representing a classical gamepad like the Xbox controller and the PlayStation controller.
 * The names of the buttons and axes are based on the Xbox controller for simplicity.
 */
class ClassicalGamepad {
	static Axis = {
		LEFT_STICK_X: 0,
		LEFT_STICK_Y: 1,
		RIGHT_STICK_X: 2,
		RIGHT_STICK_Y: 3,
		LT: 4,
		RT: 5,
	};

	static Button = {
		A: 0,
		B: 1,
		X: 2,
		Y: 3,
		LB: 4,
		RB: 5,
		BACK: 6,
		START: 7,
		LEFT_STICK: 8,
		RIGHT_STICK: 9,
		UP: 10,
		DOWN: 11,
		LEFT: 12,
		RIGHT: 13,
		HOME: 14,
	};
}

class LogitechController {
	static Axis = {
		// TODO: Name Logitech Controller Axis
	};

	static Button = {
		// TODO: Name Logitech Controller Buttons
	};
}

export { ClassicalGamepad, LogitechController };
export type { DeviceProfile, Buttons, Axes };
