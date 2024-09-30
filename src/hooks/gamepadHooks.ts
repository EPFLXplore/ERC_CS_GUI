import { useState, useEffect } from "react";
import GamepadController, { GamepadControllerState } from "../utils/Gamepad";
import { Task } from "../data/tasks.type";
import * as ROSLIB from "roslib";
import { ClassicalGamepad } from "../utils/Gamepad/bindings";
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

		GamepadController.addGamepadListener(
			"gamepadButtonPressed",
			ClassicalGamepad.Button.BACK,
			() => {
				console.log("Gamepad Command: Start Sending");
				setGamepadCommandState((prev) => {
					if (
						prev === GamepadCommandState.UI &&
						(mode === Task.NAVIGATION || mode === Task.HANDLING_DEVICE)
					)
						return GamepadCommandState.CONTROL;
					else return GamepadCommandState.UI;
				});
			}
		);

		GamepadController.addGamepadListener(
			"gamepadButtonPressed",
			ClassicalGamepad.Button.START,
			() => {
				console.log("Gamepad Command: Change Mode");
				selectorCallback?.();
			}
		);
		
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
				const message = gamepad.handleNavigation(gamepadState.buttons, gamepadState.axes);
				publisher.publish(message);
			} else {
				if (submode) {
					const message = gamepad.handleDirectArm(
						gamepadState.buttons,
						gamepadState.axes
					);
					publisher.publish(message);
				} else {
					const message = gamepad.handleInverseArm(
						gamepadState.buttons,
						gamepadState.axes
					);
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

export default useGamepad;
