export interface GamepadControllerState {
	controller: Gamepad | null;
	isConnected: boolean;
	buttons: readonly boolean[];
	axes: readonly number[];
	triggers: readonly number[];
	//profile: DeviceProfile;
}

export interface DeviceProfile {
	name: String;
	OS: String;
	webBrowser: String;
	buttons: number;
	axes: number;
	minAxisRange: number[];
	maxAxisRange: number[];
	zeroAxisRange: number[];
	remapingButtons: number[];
	remapingAxes: number[];
}

const defaultProfile: DeviceProfile = {
	name: "default",
	OS: "default",
	webBrowser: "default",
	buttons: 17,
	axes: 7,
	minAxisRange: [-1, -1, -1, -1, -1, -1, -1],
	maxAxisRange: [1, 1, 1, 1, 1, 1, 1],
	zeroAxisRange: [0, 0, 0, 0, 0, 0, 0],
	remapingButtons: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
	remapingAxes: [0, 1, 2, 3, 4, 5, 6],
};

const xboxProfile: DeviceProfile = {
	name: "045e-0b12-Microsoft Xbox One X pad",
	OS: "linux",
	webBrowser: "firefox",
	buttons: 11,
	axes: 8,
	minAxisRange: [-1, -1, -1, -1, -1, -1, -1, -1],
	maxAxisRange: [1, 1, 1, 1, 1, 1, 1, 1],
	zeroAxisRange: [0, 0, 0, 0, 0, -1, 0, 0],
	remapingButtons: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
	remapingAxes: [0, 1, 2, 3, 4, 5, 6, 7],
};

const xboxMacProfile: DeviceProfile = {
	name: "045e-0b12-Microsoft Xbox One X pad",
	OS: "macos",
	webBrowser: "chrome",
	buttons: 17,
	axes: 4,
	minAxisRange: [-0.5, 0.5, -1, -1],
	maxAxisRange: [0.5, -0.5, 1, 1],
	zeroAxisRange: [0, 0, 0, 0, 0, -1, 0, 0],
	remapingButtons: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
	remapingAxes: [0, 1, 2, 3],
};

/*

UI
		move buttons 10 11 12 13 //Up right down left
		select buttons 0
		back buttons 4
		change mode buttons 1

NAV
		Up/Down : axes 1
		Left/Right : axes 0
		change mode

HD
		change mode
	Inverse
		x: axes 1
		y: axes 0
		z: buttons 10 12
		pitch: axes 5
		roll: buttons 5 + axes 1
		yaw: buttons 5 + axes 0
		gripper : buttons 0 4
		speed : Throttle axes 1

	Forward
		Motor 1: axes 5
		Motor 2: axes 1
		Motor 3: buttons 5 + axes 1
		Motor 4: axes 0
		Motor 5: buttons 10 12
		Motor 6: buttons 5 + axes 0
		Grinder: buttons 0 4
		Speed: Throttle axes 1

*/

class GamepadController {
	private isConnected: boolean;
	private gamepad: Gamepad | null;
	private gamepadState: GamepadControllerState | null;
	private prevGamepadState: GamepadControllerState | null;

	constructor(stateCallback: (state: GamepadControllerState) => void) {
		if (navigator.getGamepads().length > 0 && navigator.getGamepads()[0]) {
			this.gamepad = navigator.getGamepads()[0];
			this.isConnected = true;
			this.gamepadState = this.updateState();
		} else {
			this.isConnected = false;
			this.gamepad = null;
			this.gamepadState = null;
		}

		this.prevGamepadState = null;

		const gamepadHandler = (e: GamepadEvent, connecting: boolean) => {
			// Case 1: No gamepad connected, and a gamepad is connecting
			if (!this.gamepad && connecting) {
				this.gamepad = e.gamepad;
				this.isConnected = connecting;
				this.gamepadState = this.updateState();
			} else if (this.gamepad && !connecting) {
				const gamepads = navigator.getGamepads();
				// Case 2: A gamepad is connected, and a gamepad is disconnecting
				if (gamepads.length > 0) {
					this.gamepad = gamepads[0];
					this.isConnected = true;
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

	public getGamepad(): Gamepad | null {
		return this.gamepad;
	}

	public getIsConnected(): boolean {
		return this.isConnected;
	}

	public getState(): GamepadControllerState | null {
		return this.gamepadState;
	}

	private updateState(): GamepadControllerState {
		this.gamepad = navigator.getGamepads()[0];

		if (this.gamepadState) {
			this.prevGamepadState = this.gamepadState;
		}

		const state: GamepadControllerState = {
			controller: this.gamepad,
			isConnected: this.isConnected,
			buttons: this.gamepad
				? this.remapButtons(
						this.gamepad.buttons.map((button) => button.pressed),
						xboxMacProfile
				  )
				: [],
			axes: this.gamepad ? this.remapAxes(this.gamepad.axes, xboxMacProfile) : [],
			triggers: this.gamepad
				? this.remapTriggers(
						this.gamepad.buttons.map((button) => button.value),
						xboxMacProfile
				  )
				: [],
		};

		if (this.prevGamepadState) this.triggerEvents(this.prevGamepadState, state);

		return state;
	}

	private remapButtons(buttons: readonly boolean[], profile: DeviceProfile): boolean[] {
		return buttons.map((button, idx) => buttons[profile.remapingButtons[idx]]);
	}

	private remapAxes(axes: readonly number[], profile: DeviceProfile): number[] {
		const new_axes = axes.map((axis, idx) => axes[profile.remapingAxes[idx]]);

		// remap the axes values to make the 0 value in the middle of the range
		for (let i = 0; i < new_axes.length; i++) {
			new_axes[i] =
				(new_axes[i] - profile.zeroAxisRange[i]) /
				(profile.maxAxisRange[i] - profile.minAxisRange[i]);
		}

		return new_axes;
	}

	private remapTriggers(triggers: readonly number[], profile: DeviceProfile): number[] {
		return triggers.map((trigger, idx) => triggers[profile.remapingButtons[idx]]);
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
