import { ClassicalGamepad, DeviceProfile } from "./bindings";

////////////////////////// BINDINGS FOR CLASSICAL GAMEPADS //////////////////////////

/**
 * Navigation Command for a classical gamepad like the Xbox controller and the PlayStation controller.
 * Default control scheme:
 * - Left/Right: Left Stick X
 * - Up/Down: Left Stick Y
 * - Throttle backward: LT
 * - Throttle forward: RT
 * - Slide left: Left
 * - Slide right: Right
 * @param buttons (A, B, X, Y, LB, RB, BACK, START, LEFT_STICK, RIGHT_STICK, UP, DOWN, LEFT, RIGHT, HOME)
 * @param axes (LEFT_STICK_X, LEFT_STICK_Y, RIGHT_STICK_X, RIGHT_STICK_Y, LT, RT)
 * @returns (Left/Right, Up/Down, Throttle backward, Throttle forward, Slide left, Slide right)
 */
const computeNavigationCommandClassicGamepad = (
	buttons: readonly boolean[],
	axes: readonly number[]
): { buttons: number[]; axes: number[] } => {
	return {
		axes: [
			axes[ClassicalGamepad.Axis.LEFT_STICK_X], // Left/Right
			axes[ClassicalGamepad.Axis.LEFT_STICK_Y], // Up/Down
			axes[ClassicalGamepad.Axis.LT], // Throttle backward
			0,
			0,
			axes[ClassicalGamepad.Axis.RT], // Throttle forward
			0,
			0,
		],
		buttons: [
			0,
			0,
			0,
			buttons[ClassicalGamepad.Button.LEFT] ? 1 : 0, // Slide left
			buttons[ClassicalGamepad.Button.RIGHT] ? 1 : 0, // Slide right
			0,
			0,
			0,
		],
	};
};

/**
 * Direct Arm Command for a classical gamepad like the Xbox controller and the PlayStation controller.
 * Default control scheme:
 * - J1: Right Stick X
 * - J2: Right Stick Y
 * - J3: Right Trigger (RB to reverse)
 * - J4: Left Trigger (LB to reverse)
 * - J5: Left Stick Y
 * - J6: Left Stick X
 * - Gripper: B to open, X to close, Y to open slightly, A to close slightly
 * @param buttons (A, B, X, Y, LB, RB, BACK, START, LEFT_STICK, RIGHT_STICK, UP, DOWN, LEFT, RIGHT, HOME)
 * @param axes (LEFT_STICK_X, LEFT_STICK_Y, RIGHT_STICK_X, RIGHT_STICK_Y, LT, RT)
 * @returns (J1, J2, J3, J4, J5, J6) where J1-J6 are the joint angles of the robot arm, and the gripper.
 */
const computeDirectArmCommandClassicGamepad = (
	buttons: readonly boolean[],
	axes: readonly number[]
): { buttons: number[]; axes: number[] } => {
	return {
		axes: [
			axes[ClassicalGamepad.Axis.RIGHT_STICK_X], // J1
			axes[ClassicalGamepad.Axis.RIGHT_STICK_Y], // J2
			buttons[ClassicalGamepad.Button.RB]
				? -axes[ClassicalGamepad.Axis.RT]
				: axes[ClassicalGamepad.Axis.RT], // J3
			buttons[ClassicalGamepad.Button.LB]
				? -axes[ClassicalGamepad.Axis.LT]
				: axes[ClassicalGamepad.Axis.LT], // J4
			axes[ClassicalGamepad.Axis.LEFT_STICK_Y], // J5
			axes[ClassicalGamepad.Axis.LEFT_STICK_X], // J6
			(buttons[ClassicalGamepad.Button.B] ? 1 : 0) -
				(buttons[ClassicalGamepad.Button.X] ? 1 : 0) +
				(buttons[ClassicalGamepad.Button.Y] ? 0.1 : 0) -
				(buttons[ClassicalGamepad.Button.A] ? 0.1 : 0), // Gripper
		],
		buttons: [],
	};
};

/**
 * Inverse Arm Command for a classical gamepad like the Xbox controller and the PlayStation controller.
 * Default control scheme:
 * - TX: Right Stick X
 * - TY: Right Stick Y
 * - TZ: RT - LT
 * - RX: Left Stick Y
 * - RY: Left Stick X
 * - RZ: RB - LB
 * - Gripper: B to open, X to close, Y to open slightly, A to close slightly
 * @param buttons (A, B, X, Y, LB, RB, BACK, START, LEFT_STICK, RIGHT_STICK, UP, DOWN, LEFT, RIGHT, HOME)
 * @param axes (LEFT_STICK_X, LEFT_STICK_Y, RIGHT_STICK_X, RIGHT_STICK_Y, LT, RT)
 * @returns (TX, TY, TZ, RX, RY, RZ) where TX-TZ are the translation of the robot arm end effector, and RX-RZ are the rotation of the robot arm end effector, and the gripper.
 */
const computeInverseArmCommandClassicGamepad = (
	buttons: readonly boolean[],
	axes: readonly number[]
): { buttons: number[]; axes: number[] } => {
	return {
		axes: [
			axes[ClassicalGamepad.Axis.RIGHT_STICK_X], // TX
			axes[ClassicalGamepad.Axis.RIGHT_STICK_Y], // TY
			axes[ClassicalGamepad.Axis.RT] - axes[ClassicalGamepad.Axis.LT], // TZ
			axes[ClassicalGamepad.Axis.LEFT_STICK_Y], // RX
			axes[ClassicalGamepad.Axis.LEFT_STICK_X], // RY
			(buttons[ClassicalGamepad.Button.RB] ? 1 : 0) -
				(buttons[ClassicalGamepad.Button.LB] ? 1 : 0), // RZ
			(buttons[ClassicalGamepad.Button.B] ? 1 : 0) -
				(buttons[ClassicalGamepad.Button.X] ? 1 : 0) +
				(buttons[ClassicalGamepad.Button.Y] ? 0.1 : 0) -
				(buttons[ClassicalGamepad.Button.A] ? 0.1 : 0), // Gripper
		],
		buttons: [],
	};
};

//#region Device Profiles
const XBOX_FIREFOX_LINUX: DeviceProfile = {
	name: "045e-0b12-Microsoft Xbox One X pad",
	OS: "Linux",
	webBrowser: "Firefox",
	buttons: {
		[ClassicalGamepad.Button.A]: {
			type: "button",
			index: 0,
		},
		[ClassicalGamepad.Button.B]: {
			type: "button",
			index: 1,
		},
		[ClassicalGamepad.Button.X]: {
			type: "button",
			index: 2,
		},
		[ClassicalGamepad.Button.Y]: {
			type: "button",
			index: 3,
		},
		[ClassicalGamepad.Button.LB]: {
			type: "button",
			index: 4,
		},
		[ClassicalGamepad.Button.RB]: {
			type: "button",
			index: 5,
		},
		[ClassicalGamepad.Button.BACK]: {
			type: "button",
			index: 6,
		},
		[ClassicalGamepad.Button.START]: {
			type: "button",
			index: 7,
		},
		[ClassicalGamepad.Button.LEFT_STICK]: {
			type: "button",
			index: 8,
		},
		[ClassicalGamepad.Button.RIGHT_STICK]: {
			type: "button",
			index: 9,
		},
		[ClassicalGamepad.Button.UP]: {
			type: "button",
			index: 10,
		},
		[ClassicalGamepad.Button.DOWN]: {
			type: "button",
			index: 11,
		},
		[ClassicalGamepad.Button.LEFT]: {
			type: "button",
			index: 12,
		},
		[ClassicalGamepad.Button.RIGHT]: {
			type: "button",
			index: 13,
		},
		[ClassicalGamepad.Button.HOME]: {
			type: "button",
			index: 14,
		},
	},
	axes: {
		[ClassicalGamepad.Axis.LEFT_STICK_X]: {
			type: "axis",
			axis: 0,
			minAxisRange: 0,
			maxAxisRange: 1,
			zeroAxisRange: 0,
		},
		[ClassicalGamepad.Axis.LEFT_STICK_Y]: {
			type: "axis",
			axis: 1,
			minAxisRange: 0,
			maxAxisRange: 1,
			zeroAxisRange: 0,
		},
		[ClassicalGamepad.Axis.RIGHT_STICK_X]: {
			type: "axis",
			axis: 2,
			minAxisRange: 0,
			maxAxisRange: 1,
			zeroAxisRange: 0,
		},
		[ClassicalGamepad.Axis.RIGHT_STICK_Y]: {
			type: "axis",
			axis: 3,
			minAxisRange: 0,
			maxAxisRange: 1,
			zeroAxisRange: 0,
		},
		[ClassicalGamepad.Axis.LT]: {
			type: "trigger",
			button: 4,
			maxTriggerRange: 1,
			zeroTriggerRange: 0,
		},
		[ClassicalGamepad.Axis.RT]: {
			type: "trigger",
			button: 5,
			maxTriggerRange: 1,
			zeroTriggerRange: 0,
		},
	},
	navigationHandler: computeNavigationCommandClassicGamepad,
	directArmHandler: computeDirectArmCommandClassicGamepad,
	inverseArmHandler: computeInverseArmCommandClassicGamepad,
};

const XBOX_CHROME_LINUX: DeviceProfile = {
	name: "045e-0b12-Microsoft Xbox One X pad",
	OS: "Linux",
	webBrowser: "Chrome",
	buttons: {},
	axes: {},
	navigationHandler: computeNavigationCommandClassicGamepad,
	directArmHandler: computeDirectArmCommandClassicGamepad,
	inverseArmHandler: computeInverseArmCommandClassicGamepad,
};

const XBOX_CHROME_MAC: DeviceProfile = {
	name: "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 02fd)",
	OS: "Linux",
	webBrowser: "Chrome",
	buttons: {
		[ClassicalGamepad.Button.A]: {
			type: "button",
			index: 0,
		},
		[ClassicalGamepad.Button.B]: {
			type: "button",
			index: 1,
		},
		[ClassicalGamepad.Button.X]: {
			type: "button",
			index: 2,
		},
		[ClassicalGamepad.Button.Y]: {
			type: "button",
			index: 3,
		},
		[ClassicalGamepad.Button.LB]: {
			type: "button",
			index: 4,
		},
		[ClassicalGamepad.Button.RB]: {
			type: "button",
			index: 5,
		},
		[ClassicalGamepad.Button.BACK]: {
			type: "button",
			index: 8,
		},
		[ClassicalGamepad.Button.START]: {
			type: "button",
			index: 9,
		},
		[ClassicalGamepad.Button.LEFT_STICK]: {
			type: "button",
			index: 10,
		},
		[ClassicalGamepad.Button.RIGHT_STICK]: {
			type: "button",
			index: 11,
		},
		[ClassicalGamepad.Button.UP]: {
			type: "button",
			index: 12,
		},
		[ClassicalGamepad.Button.DOWN]: {
			type: "button",
			index: 13,
		},
		[ClassicalGamepad.Button.LEFT]: {
			type: "button",
			index: 14,
		},
		[ClassicalGamepad.Button.RIGHT]: {
			type: "button",
			index: 15,
		},
		[ClassicalGamepad.Button.HOME]: {
			type: "button",
			index: 16,
		},
	},
	axes: {
		[ClassicalGamepad.Axis.LEFT_STICK_X]: {
			type: "axis",
			axis: 0,
			minAxisRange: -1,
			maxAxisRange: 1,
			zeroAxisRange: 0,
		},
		[ClassicalGamepad.Axis.LEFT_STICK_Y]: {
			type: "axis",
			axis: 1,
			minAxisRange: 1,
			maxAxisRange: -1,
			zeroAxisRange: 0,
		},
		[ClassicalGamepad.Axis.RIGHT_STICK_X]: {
			type: "axis",
			axis: 2,
			minAxisRange: -1,
			maxAxisRange: 1,
			zeroAxisRange: 0,
		},
		[ClassicalGamepad.Axis.RIGHT_STICK_Y]: {
			type: "axis",
			axis: 3,
			minAxisRange: 1,
			maxAxisRange: -1,
			zeroAxisRange: 0,
		},
		[ClassicalGamepad.Axis.LT]: {
			type: "trigger",
			button: 6,
			maxTriggerRange: 1,
			zeroTriggerRange: 0,
		},
		[ClassicalGamepad.Axis.RT]: {
			type: "trigger",
			button: 7,
			maxTriggerRange: 1,
			zeroTriggerRange: 0,
		},
	},
	navigationHandler: computeNavigationCommandClassicGamepad,
	directArmHandler: computeDirectArmCommandClassicGamepad,
	inverseArmHandler: computeInverseArmCommandClassicGamepad,
};

const PS4_FIREFOX_LINUX: DeviceProfile = {
	name: "054c-09cc-Sony Computer Entertainment Wireless Controller",
	OS: "Linux",
	webBrowser: "Firefox",
	buttons: {},
	axes: {},
	navigationHandler: computeNavigationCommandClassicGamepad,
	directArmHandler: computeDirectArmCommandClassicGamepad,
	inverseArmHandler: computeInverseArmCommandClassicGamepad,
};

const PS4_CHROME_LINUX: DeviceProfile = {
	name: "054c-09cc-Sony Computer Entertainment Wireless Controller",
	OS: "Linux",
	webBrowser: "Chrome",
	buttons: {},
	axes: {},
	navigationHandler: computeNavigationCommandClassicGamepad,
	directArmHandler: computeDirectArmCommandClassicGamepad,
	inverseArmHandler: computeInverseArmCommandClassicGamepad,
};

const PS4_CHROME_MAC: DeviceProfile = {
	name: "054c-09cc-Sony Computer Entertainment Wireless Controller",
	OS: "Linux",
	webBrowser: "Chrome",
	buttons: {},
	axes: {},
	navigationHandler: computeNavigationCommandClassicGamepad,
	directArmHandler: computeDirectArmCommandClassicGamepad,
	inverseArmHandler: computeInverseArmCommandClassicGamepad,
};

//#endregion

////////////////////////// BINDINGS FOR LOGITECH CONTROLLERS //////////////////////////

// TODO: Add Logitech Controller Bindings

/////////////////////////////////// BINDINGS EXPORT ///////////////////////////////////

const DEFAULT_PROFILE: DeviceProfile = PS4_FIREFOX_LINUX;

const profiles: {
	[key: string]: DeviceProfile;
} = {
	DEFAULT_PROFILE,
	XBOX_FIREFOX_LINUX,
	XBOX_CHROME_LINUX,
	XBOX_CHROME_MAC,
	PS4_FIREFOX_LINUX,
	PS4_CHROME_LINUX,
	PS4_CHROME_MAC,
};

export default profiles;
