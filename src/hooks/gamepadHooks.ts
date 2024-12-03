import { useState, useEffect } from "react";
import GamepadController, { GamepadControllerState } from "../utils/Gamepad";
import { Task } from "../data/tasks.type";
import * as ROSLIB from "roslib";
import { ClassicalGamepad } from "../utils/Gamepad/bindings";

/*
Author: Ugo Balducci
Year: 2023
Description: Hooks responsible of keeping the state of the Gamepad. It uses a gamepad controller that
manages how the bindings are done depending on the OS, type of gamepad and web browser. Please go to notion
for detailed explanations: Control Station > Gamepad CS
*/


export enum GamepadCommandState {
	UI,
	CONTROL,
}

function useGamepad(
	ros: ROSLIB.Ros | null,
	mode: string,
	submode?: string,
	selectorCallback?: () => void
) {
	const [gamepad, setGamepad] = useState<GamepadController | null>(null);
	const [gamepadState, setGamepadState] = useState<GamepadControllerState | null>(null);
	const [gamepadCommandState, setGamepadCommandState] = useState<GamepadCommandState>(
		GamepadCommandState.UI
	);
	const [publisher, setPublisher] = useState<ROSLIB.Topic<any> | null>(null);
	const [interval, setIntervalCallback] = useState<NodeJS.Timeout | null>(null);

	// Initialize the gamepad states. 
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
				selectorCallback?.();
			}
		);
		
	}, []);

	// Create the publisher for Navigation and Handling devices Subsystems
	useEffect(() => {
		if (ros) {
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

	// Function sending the commands through ROS. Depending on which subsystem is activated for the 
	// gamepad, it will publish on the right one.
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

	// The function publishes on the topic every 300ms. This value can be changed. 
	useEffect(() => {
		if (publisher && gamepadCommandState === GamepadCommandState.CONTROL) {
			setIntervalCallback(setInterval(sendCommand, 300));
		} else {
			if (interval) {
				clearInterval(interval);
			}
		}
	}, [publisher, gamepadCommandState]);

	return [gamepad, gamepadState, gamepadCommandState] as const;
}

export default useGamepad;
