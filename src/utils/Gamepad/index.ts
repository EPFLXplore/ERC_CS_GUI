import { getBrowserDetails, getOSDetails } from "../device";
import { DeviceProfile } from "./bindings";
import profiles from "./profiles";

export interface GamepadControllerState {
	controller: Gamepad | null;
	isConnected: boolean;
	buttons: readonly boolean[];
	axes: readonly number[];
}

class GamepadController {
	private isConnected: boolean;
	private gamepad: Gamepad | null;
	private gamepadState: GamepadControllerState | null;
	private prevGamepadState: GamepadControllerState | null;
	private deviceProfile: DeviceProfile | null = null;

	constructor(stateCallback: (state: GamepadControllerState) => void) {
		if (navigator.getGamepads().length > 0 && navigator.getGamepads()[0]) {
			this.gamepad = navigator.getGamepads()[0];
			this.isConnected = true;
			this.gamepadState = this.updateState();
			// search in device profiles for the current gamepad, os and browser
			this.findGamepadProfile();
		} else {
			this.isConnected = false;
			this.gamepad = null;
			this.gamepadState = null;
			this.deviceProfile = null;
		}

		this.prevGamepadState = null;

		const gamepadHandler = (e: GamepadEvent, connecting: boolean) => {
			// Case 1: No gamepad connected, and a gamepad is connecting
			if (!this.gamepad && connecting) {
				this.gamepad = e.gamepad;
				this.isConnected = connecting;
				this.gamepadState = this.updateState();
				// search in device profiles for the current gamepad, os and browser
				this.findGamepadProfile();
			} else if (this.gamepad && !connecting) {
				const gamepads = navigator.getGamepads();
				// Case 2: A gamepad is connected, and a gamepad is disconnecting
				if (gamepads.length > 0) {
					this.gamepad = gamepads[0];
					this.isConnected = true;

					// search in device profiles for the current gamepad, os and browser
					this.findGamepadProfile();

					// Case 3: No gamepad is connected, and a gamepad is disconnecting
				} else {
					this.gamepad = null;
					this.isConnected = false;
					this.gamepadState = null;
				}
			}
		};

		window.addEventListener(
			"gamepadconnected",
			function (e) {
				gamepadHandler(e, true);
			},
			false
		);
		window.addEventListener(
			"gamepaddisconnected",
			function (e) {
				gamepadHandler(e, false);
			},
			false
		);

		this.start(stateCallback);
	}

	private findGamepadProfile() {
		const OS = getOSDetails();
		const browser = getBrowserDetails();

		for (const profile in profiles) {
			if (
				this.gamepad?.id.toLowerCase().includes(profiles[profile].name.toLowerCase()) &&
				profiles[profile].OS === OS &&
				profiles[profile].webBrowser === browser
			) {
				this.deviceProfile = profiles[profile];
				break;
			}
		}

		if (!this.deviceProfile) {
			this.deviceProfile = profiles.DEFAULT_PROFILE;
		}
	}

	public getGamepad(): Gamepad | null {
		return this.gamepad;
	}

	public getIsConnected(): boolean {
		return this.isConnected;
	}

	public getState(): GamepadControllerState | null {
		return this.gamepadState;
	}

	public handleNavigation(
		buttons: readonly boolean[],
		axes: readonly number[]
	): { buttons: number[]; axes: number[] } {
		return (this.deviceProfile || profiles.DEFAULT_PROFILE).navigationHandler(buttons, axes);
	}

	public handleDirectArm(
		buttons: readonly boolean[],
		axes: readonly number[]
	): { buttons: number[]; axes: number[] } {
		return (this.deviceProfile || profiles.DEFAULT_PROFILE).directArmHandler(buttons, axes);
	}

	public handleInverseArm(
		buttons: readonly boolean[],
		axes: readonly number[]
	): { buttons: number[]; axes: number[] } {
		return (this.deviceProfile || profiles.DEFAULT_PROFILE).inverseArmHandler(buttons, axes);
	}

	private updateState(): GamepadControllerState {
		this.gamepad = navigator.getGamepads()[0];

		if (this.gamepad?.id !== navigator.getGamepads()[0]?.id) {
			this.findGamepadProfile();
		}

		if (this.gamepadState) {
			this.prevGamepadState = this.gamepadState;
		}

		const state: GamepadControllerState = {
			controller: this.gamepad,
			isConnected: this.isConnected,
			buttons: this.gamepad
				? this.remapButtons(this.gamepad, this.deviceProfile ?? profiles.DEFAULT_PROFILE)
				: [],
			axes: this.gamepad
				? this.remapAxes(this.gamepad, this.deviceProfile ?? profiles.DEFAULT_PROFILE)
				: [],
		};

		if (this.prevGamepadState) this.triggerEvents(this.prevGamepadState, state);

		return state;
	}

	private remapButtons(gamepad: Gamepad, profile: DeviceProfile): boolean[] {
		const buttons = gamepad.buttons.map((button) => button.pressed);
		const triggers = gamepad.buttons.map((button) => button.value);
		const axes = gamepad.axes;

		const remapedButtons = Object.keys(profile.buttons)
			.sort((key) => parseInt(key))
			.map((button) => {
				const buttonProfile = profile.buttons[parseInt(button)];
				if (buttonProfile.type === "button") {
					return buttons[buttonProfile.index];
				} else if (buttonProfile.type === "trigger") {
					return triggers[buttonProfile.index] > buttonProfile.threshold;
				} else {
					return axes[buttonProfile.axis] > buttonProfile.minRange && axes[buttonProfile.maxRange] < buttonProfile.maxRange
				}
			});

		return remapedButtons;
	}

	private remapAxes(gamepad: Gamepad, profile: DeviceProfile): number[] {
		const triggers = gamepad.buttons.map((button) => button.value);
		const axes = gamepad.axes;

		const remapedAxes = Object.keys(profile.axes)
			.sort((key) => parseInt(key))
			.map((axis) => {
				const axisProfile = profile.axes[parseInt(axis)];
				if (axisProfile.type === "axis") {
					// Normalize the axis value to be between the min and max range to be between -1 and 1, and make sure the zerovalue becomes 0
					const normalizedAxis =
						axes[axisProfile.axis] > axisProfile.zeroAxisRange
							? axes[axisProfile.axis] / axisProfile.maxAxisRange
							: axes[axisProfile.axis] / -axisProfile.minAxisRange;
					return normalizedAxis;
				} else if (axisProfile.type === "button") {
					return triggers[axisProfile.buttons[1]] - triggers[axisProfile.buttons[0]];
				} else {
					return (
						(triggers[axisProfile.button] - axisProfile.zeroTriggerRange) /
						axisProfile.maxTriggerRange
					);
				}
			});

		return remapedAxes;
	}

	private triggerEvents(
		prevState: GamepadControllerState,
		currentState: GamepadControllerState
	): void {
		// Trigger custom js events for each button press
		currentState.buttons.forEach((button, index) => {
			if (button && !prevState.buttons[index]) {
				const event = new CustomEvent("gamepadButtonPressed", {
					detail: {
						buttonIndex: index,
					},
				});
				window.dispatchEvent(event);
			}

			if (!button && prevState.buttons[index]) {
				const event = new CustomEvent("gamepadButtonReleased", {
					detail: {
						bubbles: true,
						cancelable: true,
						composed: false,
						buttonIndex: index,
					},
				});
				window.dispatchEvent(event);
			}
		});
	}

	public start(stateCallback: (state: GamepadControllerState) => void): void {
		// Start updating the gamepad state every frame with requestAnimationFrame
		const updateFn = () => {
			if (this.getGamepad() && this.getIsConnected()) {
				this.gamepadState = this.updateState();
				stateCallback(this.gamepadState);
			}
			requestAnimationFrame(updateFn);
		};

		requestAnimationFrame(updateFn);
	}

	public static addGamepadListener(
		event: string,
		button: number,
		callback: (e: CustomEvent) => void
	): void {
		if (event === "gamepadButtonPressed") {
			console.log("Adding gamepadButtonPressed event listener", button);
			// @ts-ignore
			window.addEventListener("gamepadButtonPressed", (e: CustomEvent) => {
				if (button === e.detail.buttonIndex) {
					callback(e);
				}
			});
		} else if (event === "gamepadButtonReleased") {
			// @ts-ignore
			window.addEventListener("gamepadButtonReleased", (e: CustomEvent) => {
				if (button === e.detail.buttonIndex) {
					callback(e);
				}
			});
		}
	}
}

export default GamepadController;
