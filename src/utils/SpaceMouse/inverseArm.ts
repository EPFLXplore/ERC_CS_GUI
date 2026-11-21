import { SpaceMouseAxis } from ".";

/*
SpaceMouse -> HD Manual Inverse command. Produces the same sensor_msgs/Joy layout as
computeInverseArmCommandClassicGamepad, so the HD side needs no change. How the arm reads it
(ERC_HD cartesian_vel_commander.cpp fillTwistFromJoystick):

  slot 0 -> linear.x  = -a0        (gamepad: RIGHT_STICK_X)
  slot 1 -> linear.y  =  a1        (gamepad: RIGHT_STICK_Y)
  slot 2 -> linear.z  =  a2        (gamepad: RT - LT)
  slot 3 -> angular.z = -a3        (gamepad: -LEFT_STICK_X)
  slot 4 -> angular.y =  a4        (gamepad: -LEFT_STICK_Y)
  slot 5,6 -> angular.x = a5 - a6  (gamepad: RB / LB, here analog)
  slot 7 -> gripper velocity       (gamepad: B/X)

SpaceMouse axes (after the AXIS_SIGN fix in index.ts): TX+ right, TY+ push away, TZ+ press down,
RX tilt fwd/back, RY tilt left/right, RZ twist.

If a direction is wrong on the arm, flip its sign in SLOT_MAP — test in simulation first.
*/

type SlotSource = { axis: SpaceMouseAxis; sign: 1 | -1 };

// Translations tested on the arm: slot 0 = X, slot 1 = Y, slot 2 = Z.
// Rotations tested on the arm: slot 3 = RZ, slot 4 = RY, slots 5/6 = RX.
const SLOT_MAP: SlotSource[] = [
	{ axis: SpaceMouseAxis.TX, sign: 1 }, // slot 0 -> linear.x  = arm X
	{ axis: SpaceMouseAxis.TY, sign: 1 }, // slot 1 -> linear.y  = arm Y
	{ axis: SpaceMouseAxis.TZ, sign: 1 }, // slot 2 -> linear.z  = arm Z
	{ axis: SpaceMouseAxis.RZ, sign: 1 }, // slot 3 -> angular.z = arm RZ
	{ axis: SpaceMouseAxis.RY, sign: -1 }, // slot 4 -> angular.y = arm RY
];
const SLOT56_AXIS = SpaceMouseAxis.RX; // slots 5/6 -> angular.x = arm RX (split +/-)
const SLOT56_SIGN: 1 | -1 = -1;

/** Overall gain on the six motion axes. The puck rarely reaches full deflection, so 1.0 is fine. */
const SENSITIVITY = 1.0;

/** Gripper velocity on the SpaceMouse buttons, same magnitude as gamepad B/X. */
const GRIPPER_SPEED = 1;

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

export const computeInverseArmCommandSpaceMouse = (
	axes: readonly number[],
	buttons: readonly boolean[]
): { buttons: number[]; axes: number[] } => {
	const at = (s: SlotSource) => clamp(s.sign * (axes[s.axis] ?? 0) * SENSITIVITY);
	const s56 = clamp(SLOT56_SIGN * (axes[SLOT56_AXIS] ?? 0) * SENSITIVITY);

	return {
		axes: [
			...SLOT_MAP.map(at),
			Math.max(s56, 0),
			Math.max(-s56, 0),
			// Right button opens (+, like B), left closes (-, like X); both cancel out.
			((buttons[1] ? 1 : 0) - (buttons[0] ? 1 : 0)) * GRIPPER_SPEED,
		],
		buttons: [
			2, // DO NOT CHANGE: tags the Joy as an HD arm command (see hds_interfacing_cs.py)
			0,
			0,
			0,
			0,
			0,
			0,
			0,
		],
	};
};

export const NEUTRAL_INVERSE_ARM_COMMAND = computeInverseArmCommandSpaceMouse(
	[0, 0, 0, 0, 0, 0],
	[false, false]
);
