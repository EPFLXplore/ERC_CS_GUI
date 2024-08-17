import useGamepad, { GamepadCommandState } from "../../../hooks/gamepadHooks";
import GamepadDisplay from "./GamepadDisplay";
import styles from "./style.module.sass";
import { Task } from "../../../data/tasks.type";
import * as ROSLIB from "roslib";
import States from "../../../data/states.type";
import { ClassicalGamepad } from "../../../utils/Gamepad/bindings";

const Gamepad = ({
	selectorCallback,
	mode,
	submode,
	visible = true,
	ros,
	changeCam,
}: {
	selectorCallback?: () => void;
	mode: Task;
	submode?: States.MANUAL | States.MANUAL_DIRECT | States.MANUAL_INVERSE;
	visible?: boolean;
	ros: ROSLIB.Ros | null;
	changeCam?: (dir: number) => void;
}) => {
	const [gamepad, gamepadState, gamepadCommandState] = useGamepad(
		ros,
		mode,
		submode,
		changeCam,
		selectorCallback
	);

	const calcDirectionVertical = (axe: number) => {
		// Up
		if (axe < -0.2) {
			return "down";
		}
		// Down
		if (axe > 0.2) {
			return "up";
		}

		return "";
	};

	const calcDirectionHorizontal = (axe: number) => {
		// Left
		if (axe < -0.2) {
			return "left";
		}
		// Right
		if (axe > 0.2) {
			return "right";
		}

		return "";
	};

	if (gamepad?.getGamepad() && gamepadState && visible) {
		return (
			<div
				className={`${styles.Container} ${
					//@ts-ignore
					gamepadCommandState === GamepadCommandState.UI ? styles.Outline : ""
				}`}
			>
				<GamepadDisplay
					buttonDown={gamepadState.buttons[ClassicalGamepad.Button.A]}
					buttonRight={gamepadState.buttons[ClassicalGamepad.Button.B]}
					buttonLeft={gamepadState.buttons[ClassicalGamepad.Button.X]}
					buttonUp={gamepadState.buttons[ClassicalGamepad.Button.Y]}
					directionUp={gamepadState.buttons[ClassicalGamepad.Button.UP]}
					directionDown={gamepadState.buttons[ClassicalGamepad.Button.DOWN]}
					directionLeft={gamepadState.buttons[ClassicalGamepad.Button.LEFT]}
					directionRight={gamepadState.buttons[ClassicalGamepad.Button.RIGHT]}
					analogLeft={
						gamepadState.axes[ClassicalGamepad.Axis.LEFT_STICK_X] > 0.3 ||
						gamepadState.axes[ClassicalGamepad.Axis.LEFT_STICK_X] < -0.3 ||
						gamepadState.axes[ClassicalGamepad.Axis.LEFT_STICK_Y] > 0.3 ||
						gamepadState.axes[ClassicalGamepad.Axis.LEFT_STICK_Y] < -0.3
					}
					analogRight={
						gamepadState.axes[ClassicalGamepad.Axis.RIGHT_STICK_X] > 0.3 ||
						gamepadState.axes[ClassicalGamepad.Axis.RIGHT_STICK_X] < -0.3 ||
						gamepadState.axes[ClassicalGamepad.Axis.RIGHT_STICK_Y] > 0.3 ||
						gamepadState.axes[ClassicalGamepad.Axis.RIGHT_STICK_Y] < -0.3
					}
					analogLeftDirection={[
						calcDirectionHorizontal(
							gamepadState.axes[ClassicalGamepad.Axis.LEFT_STICK_X]
						),
						calcDirectionVertical(
							gamepadState.axes[ClassicalGamepad.Axis.LEFT_STICK_Y]
						),
					]}
					analogRightDirection={[
						calcDirectionHorizontal(
							gamepadState.axes[ClassicalGamepad.Axis.RIGHT_STICK_X]
						),
						calcDirectionVertical(
							gamepadState.axes[ClassicalGamepad.Axis.RIGHT_STICK_Y]
						),
					]}
					select={gamepadState.buttons[ClassicalGamepad.Button.BACK]}
					start={gamepadState.buttons[ClassicalGamepad.Button.START]}
					home={gamepadState.buttons[ClassicalGamepad.Button.HOME]}
					rearLeft={gamepadState.buttons[ClassicalGamepad.Button.LB]}
					rearRight={gamepadState.buttons[ClassicalGamepad.Button.RB]}
					triggerLeft={gamepadState.axes[ClassicalGamepad.Axis.LT]}
					triggerRight={gamepadState.axes[ClassicalGamepad.Axis.RT]}
					activeColor="#FF4345"
					isControlling={gamepadCommandState === GamepadCommandState.CONTROL}
				/>
				<div className={styles.GamepadMode}>
					<p>{mode === Task.NAVIGATION ? "NAV" : "HD"}</p>
				</div>
			</div>
		);
	} else {
		return null;
	}
};

export default Gamepad;
