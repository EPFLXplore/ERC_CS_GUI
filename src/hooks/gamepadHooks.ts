import { useState, useEffect } from "react";
import GamepadController, { GamepadControllerState } from "../utils/Gamepad";
import { Task } from "../utils/tasks.type";
import { Message, Topic } from "roslib";
import buttonSelect from "../utils/buttonSelect";

export enum GamepadCommandState {
	UI,
	CONTROL,
}

function useGamepad(ros: ROSLIB.Ros, mode: string, selectorCallback?: () => void) {
	const [gamepad, setGamepad] = useState<GamepadController | null>(null);
	const [gamepadState, setGamepadState] = useState<GamepadControllerState | null>(null);
	const [gamepadCommandState, setGamepadCommandState] = useState<GamepadCommandState>(
		GamepadCommandState.UI
	);
	const [publisher, setPublisher] = useState<Topic | null>(null);
	const [interval, setIntervalCallback] = useState<NodeJS.Timeout | null>(null);

	useEffect(() => {
		const gamepad = new GamepadController((state) => {
			setGamepadState(state);
		});

		setGamepad(gamepad);

		GamepadController.addGamepadListener("gamepadButtonPressed", 8, () => {
			console.log("Gamepad Command: Menu");
			setGamepadCommandState((prev) => {
				if (prev === GamepadCommandState.UI) return GamepadCommandState.CONTROL;
				else return GamepadCommandState.UI;
			});
		});

		GamepadController.addGamepadListener("gamepadButtonPressed", 9, () => {
			console.log("Gamepad Command: Start");
			selectorCallback?.();
		});
	}, []);

	useEffect(() => {
		if (ros) {
			console.log("Create topic gamepad")
			setPublisher(
				new Topic({
					ros: ros,
					name:
						mode === Task.NAVIGATION
							? "/CS/GamepadCmdsNavigation"
							: "/CS/GamepadCmdsHandlingDevice",
					messageType: "sensor_msgs/Joy",
				})
			);
		}

		return () => {
			if (publisher) {
				publisher.unadvertise();
			}
		};
	}, [ros, mode]);

	const sendCommand = () => {
		const gamepadState = gamepad?.getState();
		if (gamepad?.getGamepad() && gamepadState && publisher) {
			const message = new Message(computeNavigationCommand(gamepadState));
			publisher.publish(message);
		}
	};

	useEffect(() => {
		if (publisher && gamepadCommandState === GamepadCommandState.CONTROL) {
			setIntervalCallback(setInterval(sendCommand, 150));
		} else {
			console.log("No publisher");
			if (interval) {
				clearInterval(interval);
			}
		}
	}, [publisher, gamepadCommandState]);

	return [gamepad, gamepadState, gamepadCommandState] as const;
}

const computeNavigationCommand = (gamepadState: GamepadControllerState) => {
	const { axes, buttons, triggers } = gamepadState;

	return {
		axes: [axes[0], axes[1], triggers[6], 0, 0, triggers[7], 0, 0],
		buttons: [0, 0, 0, buttons[14] ? 1 : 0, buttons[15] ? 1 : 0, 0, 0, 0, 0, 0, 0],
	};
};

export default useGamepad;
