import { useState, useEffect } from "react";
import GamepadController, { GamepadControllerState } from "../utils/Gamepad";
import { Task } from "../utils/tasks.type";
import * as ROSLIB from "roslib";
import States from "../utils/States";

export enum GamepadCommandState {
	UI,
	CONTROL,
}

function useGamepad(
	ros: ROSLIB.Ros | null,
	mode: string,
	submode?: string,
	changeCam?: (dir: number) => void,
	selectorCallback?: () => void
) {
	const [gamepad, setGamepad] = useState<GamepadController | null>(null);
	const [gamepadState, setGamepadState] = useState<GamepadControllerState | null>(null);
	const [gamepadCommandState, setGamepadCommandState] = useState<GamepadCommandState>(
		GamepadCommandState.UI
	);
	const [publisher, setPublisher] = useState<ROSLIB.Topic<any> | null>(null);
	const [interval, setIntervalCallback] = useState<NodeJS.Timeout | null>(null);

	useEffect(() => {
		const gamepad = new GamepadController((state) => {
			setGamepadState(state);
		});

		setGamepad(gamepad);

		GamepadController.addGamepadListener("gamepadButtonPressed", 8, () => {
			console.log("Gamepad Command: Menu");
			setGamepadCommandState((prev) => {
				if (
					prev === GamepadCommandState.UI &&
					(mode === Task.NAVIGATION || mode === Task.HANDLING_DEVICE)
				)
					return GamepadCommandState.CONTROL;
				else return GamepadCommandState.UI;
			});
		});

		GamepadController.addGamepadListener("gamepadButtonPressed", 9, () => {
			console.log("Gamepad Command: Start");
			selectorCallback?.();
		});

		GamepadController.addGamepadListener("gamepadButtonPressed", 12, () => {
			console.log("Gamepad Command: Change Camera");
			if (changeCam) changeCam(-1);
		});

		GamepadController.addGamepadListener("gamepadButtonPressed", 13, () => {
			console.log("Gamepad Command: Change Camera");
			if (changeCam) changeCam(1);
		});
	}, []);

	useEffect(() => {
		if (ros) {
			console.log("Create topic gamepad");
			setPublisher(
				new ROSLIB.Topic<any>({
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
			if (mode === Task.NAVIGATION) {
				const message = computeNavigationCommand(gamepadState);
				publisher.publish(message);
			} else {
				if (submode) {
					const message = computeArmCommand(gamepadState, submode);
					publisher.publish(message);
				} else {
					const message = computeArmCommand(gamepadState, States.MANUAL_DIRECT);
					publisher.publish(message);
				}
			}
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

const computeArmCommand = (gamepadState: GamepadControllerState, submode: string) => {
	const { axes, buttons, triggers } = gamepadState;

	if (submode === States.MANUAL_INVERSE) {
		return {
			axes: [
				2 * axes[2],
				-2 * axes[3],
				triggers[7] - triggers[6],
				-2 * axes[1],
				2 * axes[0],
				triggers[5] - triggers[4],
				triggers[1] - triggers[2] + 0.1 * triggers[3] - 0.1 * triggers[0],
			],
			buttons: [],
		};
	} else {
		return {
			axes: [
				2 * axes[2],
				-2 * axes[3],
				buttons[5] ? -triggers[7] : triggers[7],
				buttons[4] ? -triggers[6] : triggers[6],
				-2 * axes[1],
				2 * axes[0],
				triggers[1] - triggers[2] + 0.1 * triggers[3] - 0.1 * triggers[0],
			],
			buttons: [],
		};
	}
};

export default useGamepad;
