import { useState, useEffect } from "react";
import GamepadController, { GamepadControllerState } from "../utils/Gamepad";
import { PublishTo, PublishToType } from "../data/publishTo.type";
import * as ROSLIB from "roslib";
import { ClassicalGamepad } from "../utils/Gamepad/bindings";
import States from "../data/states.type";
import { Topics } from "../data/topics.type";

/*
Author: Ugo Balducci
Year: 2023
Description: Hooks responsible of keeping the state of the Gamepad. It uses a gamepad controller that
manages how the bindings are done depending on the OS, type of gamepad and web browser. Please go to notion
for detailed explanations
*/


export enum GamepadCommandState {
	UI,
	CONTROL,
}

function useGamepad(
	ros: ROSLIB.Ros | null,
	mode: PublishToType,
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
			ClassicalGamepad.Button.START,
			() => {
				selectorCallback?.();
			}
		);
		
	}, []);

	GamepadController.addGamepadListener(
		"gamepadButtonPressed",
		ClassicalGamepad.Button.BACK,
		() => {
			setGamepadCommandState((prev) => {
				if (
					prev === GamepadCommandState.UI &&
					(mode === PublishTo.NAVIGATION || mode === PublishTo.HANDLING_DEVICE)
				)
					return GamepadCommandState.CONTROL;
				else return GamepadCommandState.UI;
			});
		}
	);

	// Create the publisher for Navigation and Handling devices Subsystems
	useEffect(() => {
		if (ros) {
			setPublisher(
				new ROSLIB.Topic<any>({
					ros: ros,
					name:
						mode === PublishTo.NAVIGATION
							? Topics.NAVIGATION_GAMEPAD_PUBLISHER
							: Topics.HANDLING_DEVICE_GAMEPAD_PUBLISHER,
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
			if (mode === PublishTo.NAVIGATION) {
				const message = gamepad.handleNavigation(gamepadState.buttons, gamepadState.axes);
				publisher.publish(message);
			
			// Handling device
			} else if (mode == PublishTo.HANDLING_DEVICE) {
				if (submode == States.MANUAL_DIRECT) {
					const message = gamepad.handleDirectArm(
						gamepadState.buttons,
						gamepadState.axes
					);
					publisher.publish(message);
				
				// Manual Inverse
				} else {
					const message = gamepad.handleInverseArm(
						gamepadState.buttons,
						gamepadState.axes
					);
					console.log(message.axes);
					publisher.publish(message);
				}
			}
		}
	};

	// The function publishes on the topic every 30ms. This value can be changed. 
	useEffect(() => {
		if (publisher && gamepadCommandState === GamepadCommandState.CONTROL) {
			setIntervalCallback(setInterval(sendCommand, 30));
		} else {
			if (interval) {
				clearInterval(interval);
			}
		}
	}, [publisher, gamepadCommandState]);

	return [gamepad, gamepadState, gamepadCommandState] as const;
}

export default useGamepad;
