import useGamepad, { GamepadCommandState } from "../../../hooks/gamepadHooks";
import GamepadDisplay from "./GamepadDisplay";
import styles from "./style.module.sass";
import { Task } from "../../../data/tasks.type";
import * as ROSLIB from "roslib";
import States from "../../../data/states.type";

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
			return "up";
		}
		// Down
		if (axe > 0.2) {
			return "down";
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
					buttonDown={gamepadState.buttons[0]}
					buttonRight={gamepadState.buttons[1]}
					buttonLeft={gamepadState.buttons[2]}
					buttonUp={gamepadState.buttons[3]}
					directionUp={gamepadState.buttons[12]}
					directionDown={gamepadState.buttons[13]}
					directionLeft={gamepadState.buttons[14]}
					directionRight={gamepadState.buttons[15]}
					analogLeft={
						gamepadState.axes[0] > 0.3 ||
						gamepadState.axes[0] < -0.3 ||
						gamepadState.axes[1] > 0.3 ||
						gamepadState.axes[1] < -0.3
					}
					analogRight={
						gamepadState.axes[2] > 0.3 ||
						gamepadState.axes[2] < -0.3 ||
						gamepadState.axes[3] > 0.3 ||
						gamepadState.axes[3] < -0.3
					}
					analogLeftDirection={[
						calcDirectionHorizontal(gamepadState.axes[0]),
						calcDirectionVertical(gamepadState.axes[1]),
					]}
					analogRightDirection={[
						calcDirectionHorizontal(gamepadState.axes[2]),
						calcDirectionVertical(gamepadState.axes[3]),
					]}
					select={gamepadState.buttons[8]}
					start={gamepadState.buttons[9]}
					home={gamepadState.buttons[10]}
					rearLeft={gamepadState.buttons[4]}
					rearRight={gamepadState.buttons[5]}
					triggerLeft={gamepadState.triggers[6]}
					triggerRight={gamepadState.triggers[7]}
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
